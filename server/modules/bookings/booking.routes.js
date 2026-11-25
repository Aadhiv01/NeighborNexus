const express = require('express');

const authenticate = require('../../middleware/auth');
const validate = require('../../lib/validate');
const Booking = require('./booking.model');
const ServiceProvider = require('../providers/provider.model');
const { startOfDayUTC, slotsForDay, toMinutes, localISO, dropPastSlots } = require('./slots');
const schemas = require('./booking.schemas');
const { notifyBooking } = require('../notifications/notify');
const { formatDate, formatTime } = require('../../lib/format');
const live = require('../../lib/live');

const router = express.Router();

const PROVIDER_TYPE = 'Service Provider';

/** Is this user the member who booked it, or the provider it was booked with? */
async function accessTo(booking, user) {
  const isOwner = String(booking.user._id ?? booking.user) === user.id;
  let isProvider = false;
  if (user.type === PROVIDER_TYPE) {
    const provider = await ServiceProvider.findOne({ userId: user.id }).select('_id').lean();
    const bookedWith = booking.serviceProviderId._id ?? booking.serviceProviderId;
    isProvider = !!provider && String(bookedWith) === String(provider._id);
  }
  return { isOwner, isProvider };
}

const dayBookings = (serviceProviderId, day, excludeId) =>
  Booking.find({ serviceProviderId, date: day, status: 'upcoming', ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
    .select('startTime endTime status')
    .lean();

// GET /api/bookings/stream?serviceProviderId=: a live signal that this provider's times changed
router.get('/stream', validate({ query: schemas.streamQuery }), (req, res) => {
  live.open(req, res, req.valid.query.serviceProviderId);
});

// GET /api/bookings/slots?serviceProviderId=&serviceId=&date=YYYY-MM-DD
// Public: a member browsing availability doesn't need to be logged in.
router.get('/slots', validate({ query: schemas.slotsQuery }), async (req, res) => {
  const { serviceProviderId, serviceId, date, excludeBookingId } = req.valid.query;

  const provider = await ServiceProvider.findById(serviceProviderId).lean();
  if (!provider) return res.status(404).json({ msg: 'Service provider not found' });

  const service = serviceId
    ? provider.services.find((s) => String(s._id) === serviceId)
    : provider.services[0];
  if (!service) return res.status(404).json({ msg: 'Service not found' });

  const day = startOfDayUTC(date);
  const slots = dropPastSlots(
    slotsForDay({
      availability: provider.availability,
      date: day,
      durationMinutes: service.durationMinutes,
      bookings: await dayBookings(serviceProviderId, day, excludeBookingId),
    }),
    day
  );

  return res.json({ date: day, service, slots });
});

// POST /api/bookings
router.post('/', authenticate, validate({ body: schemas.create }), async (req, res) => {
  // Providers offer services; they don't book them. Enforced here, not only in the UI.
  if (req.user.type === PROVIDER_TYPE) {
    return res.status(403).json({ msg: 'Providers can’t book services. Use a member account to book.' });
  }

  const { serviceProviderId, serviceId, date, startTime, endTime } = req.valid.body;

  const provider = await ServiceProvider.findById(serviceProviderId).lean();
  if (!provider) return res.status(404).json({ msg: 'Service provider not found' });

  const service = provider.services.find((s) => String(s._id) === serviceId);
  if (!service) return res.status(404).json({ msg: 'Service not found' });

  const day = startOfDayUTC(date);
  if (day.getTime() < startOfDayUTC(localISO(new Date())).getTime()) {
    return res.status(400).json({ msg: 'Cannot book a date in the past' });
  }
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    return res.status(400).json({ msg: 'endTime must be after startTime' });
  }

  // Validate the slot against the provider's recurring template.
  const open = dropPastSlots(
    slotsForDay({
      availability: provider.availability,
      date: day,
      durationMinutes: toMinutes(endTime) - toMinutes(startTime),
      bookings: await dayBookings(serviceProviderId, day),
    }),
    day
  );
  if (!open.some((s) => s.start === startTime && s.end === endTime)) {
    return res.status(409).json({ msg: 'That slot is not available for this provider' });
  }

  // The unique index is the real guard against concurrent double-booking.
  const booking = await Booking.create({
    user: req.user.id,
    serviceProviderId,
    serviceId,
    serviceName: service.name,
    price: service.price,
    date: day,
    startTime,
    endTime,
  });

  live.publish(serviceProviderId, { date });
  notifyBooking(booking, 'created');
  return res.status(201).json(booking);
});

// GET /api/bookings: mine (member) or incoming (provider)
router.get('/', authenticate, async (req, res) => {
  const filter = {};
  if (req.user.type === PROVIDER_TYPE) {
    const provider = await ServiceProvider.findOne({ userId: req.user.id }).select('_id').lean();
    if (!provider) return res.status(404).json({ msg: 'Service provider profile not found' });
    filter.serviceProviderId = provider._id;
  } else {
    filter.user = req.user.id;
  }

  const bookings = await Booking.find(filter)
    .sort({ date: -1, startTime: 1 })
    .populate('user', 'name email')
    .populate('serviceProviderId', 'name location')
    .lean();

  return res.json(bookings);
});

// GET /api/bookings/:id
router.get('/:id', authenticate, validate({ params: schemas.idParam }), async (req, res) => {
  const booking = await Booking.findById(req.valid.params.id)
    .populate('user', 'name email')
    .populate('serviceProviderId', 'name location')
    .lean();
  if (!booking) return res.status(404).json({ msg: 'Booking not found' });

  const { isOwner, isProvider } = await accessTo(booking, req.user);
  if (!isOwner && !isProvider) return res.status(403).json({ msg: 'Not your booking' });

  return res.json(booking);
});

// PUT /api/bookings/:id: status transitions only
router.put(
  '/:id',
  authenticate,
  validate({ params: schemas.idParam, body: schemas.updateStatus }),
  async (req, res) => {
    const { status, timeSpent } = req.valid.body;

    const booking = await Booking.findById(req.valid.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    const { isOwner, isProvider } = await accessTo(booking, req.user);
    if (!isOwner && !isProvider) return res.status(403).json({ msg: 'Not your booking' });

    // Authorisation first, then state: a member should get 403 for trying
    // to complete a booking regardless of what state it is currently in.
    if (isOwner && !isProvider && status !== 'canceled') {
      return res.status(403).json({ msg: 'Members can only cancel their bookings' });
    }

    if (booking.status !== 'upcoming' && status !== booking.status) {
      return res
        .status(409)
        .json({ msg: `Cannot move a ${booking.status} booking to ${status}` });
    }

    booking.status = status;
    if (status === 'completed' && timeSpent != null) booking.timeSpent = timeSpent;

    await booking.save();
    live.publish(booking.serviceProviderId, {});
    if (status === 'canceled') notifyBooking(booking, 'canceled', { by: isOwner ? 'member' : 'provider' });
    if (status === 'completed') notifyBooking(booking, 'completed');
    return res.json(booking);
  }
);

// POST /api/bookings/:id/reschedule: the member moves their own upcoming booking to another open time
router.post(
  '/:id/reschedule',
  authenticate,
  validate({ params: schemas.idParam, body: schemas.reschedule }),
  async (req, res) => {
    const { date, startTime, endTime } = req.valid.body;

    const booking = await Booking.findById(req.valid.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    const { isOwner } = await accessTo(booking, req.user);
    if (!isOwner) return res.status(403).json({ msg: 'Only the member who booked can reschedule' });
    if (booking.status !== 'upcoming') {
      return res.status(409).json({ msg: 'Only upcoming bookings can be rescheduled' });
    }

    const day = startOfDayUTC(date);
    if (day.getTime() < startOfDayUTC(localISO(new Date())).getTime()) {
      return res.status(400).json({ msg: 'Cannot move a booking to a date in the past' });
    }
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      return res.status(400).json({ msg: 'endTime must be after startTime' });
    }
    const duration = toMinutes(booking.endTime) - toMinutes(booking.startTime);
    if (toMinutes(endTime) - toMinutes(startTime) !== duration) {
      return res.status(400).json({ msg: 'The new time must be the same length as the original' });
    }
    if (day.getTime() === booking.date.getTime() && startTime === booking.startTime) {
      return res.status(400).json({ msg: 'That is already your booking time' });
    }

    const provider = await ServiceProvider.findById(booking.serviceProviderId).lean();
    if (!provider) return res.status(404).json({ msg: 'Service provider not found' });

    // This booking's own current slot is ignored, so shifting by 30 minutes is allowed.
    const open = dropPastSlots(
      slotsForDay({
        availability: provider.availability,
        date: day,
        durationMinutes: duration,
        bookings: await dayBookings(booking.serviceProviderId, day, booking._id),
      }),
      day
    );
    if (!open.some((s) => s.start === startTime && s.end === endTime)) {
      return res.status(409).json({ msg: 'That time is not available for this provider' });
    }

    const was = `${formatDate(booking.date)} at ${formatTime(booking.startTime)}`;
    booking.reschedules.push({ date: booking.date, startTime: booking.startTime, endTime: booking.endTime, at: new Date() });
    booking.date = day;
    booking.startTime = startTime;
    booking.endTime = endTime;
    booking.reminderSentAt = undefined;
    // The unique index decides a race: if someone took the slot meanwhile this fails with a 409.
    await booking.save();

    live.publish(booking.serviceProviderId, {});
    notifyBooking(booking, 'rescheduled', { was });
    return res.json(booking);
  }
);

// DELETE /api/bookings/:id: cancel (kept for history, not erased)
router.delete('/:id', authenticate, validate({ params: schemas.idParam }), async (req, res) => {
  const booking = await Booking.findById(req.valid.params.id);
  if (!booking) return res.status(404).json({ msg: 'Booking not found' });

  const { isOwner, isProvider } = await accessTo(booking, req.user);
  if (!isOwner && !isProvider) return res.status(403).json({ msg: 'Not your booking' });

  if (booking.status !== 'upcoming') {
    return res.status(409).json({ msg: 'Only upcoming bookings can be canceled' });
  }

  booking.status = 'canceled';
  await booking.save();

  live.publish(booking.serviceProviderId, {});
  notifyBooking(booking, 'canceled', { by: isOwner ? 'member' : 'provider' });
  return res.json({ msg: 'Booking canceled', booking });
});

module.exports = router;
