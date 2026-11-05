const express = require('express');
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');

const authenticate = require('../middleware/auth');
const Booking = require('../models/Booking');
const ServiceProvider = require('../models/ServiceProvider');
const { startOfDayUTC, slotsForDay, toMinutes } = require('../utils/slots');

const router = express.Router();

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET /api/bookings/slots?serviceProviderId=&serviceId=&date=YYYY-MM-DD
// Public: a member browsing availability doesn't need to be logged in.
router.get('/slots', async (req, res, next) => {
  try {
    const { serviceProviderId, serviceId, date } = req.query;
    if (!serviceProviderId || !date) {
      return res
        .status(400)
        .json({ msg: 'serviceProviderId and date are required' });
    }
    if (!mongoose.isValidObjectId(serviceProviderId)) {
      return res.status(400).json({ msg: 'Invalid serviceProviderId' });
    }

    const provider = await ServiceProvider.findById(serviceProviderId);
    if (!provider) {
      return res.status(404).json({ msg: 'Service provider not found' });
    }

    const service = serviceId
      ? provider.services.id(serviceId)
      : provider.services[0];
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }

    const day = startOfDayUTC(date);
    if (Number.isNaN(day.getTime())) {
      return res.status(400).json({ msg: 'Invalid date' });
    }

    const bookings = await Booking.find({
      serviceProviderId,
      date: day,
      status: 'upcoming',
    }).select('startTime endTime status');

    const slots = slotsForDay({
      availability: provider.availability,
      date: day,
      durationMinutes: service.durationMinutes,
      bookings,
    });

    return res.json({ date: day, service, slots });
  } catch (err) {
    return next(err);
  }
});

// POST /api/bookings
router.post(
  '/',
  authenticate,
  [
    check('serviceProviderId', 'serviceProviderId is required').notEmpty(),
    check('serviceId', 'serviceId is required').notEmpty(),
    check('date', 'A valid date is required').isISO8601(),
    check('startTime', 'startTime must be HH:mm').matches(TIME_RE),
    check('endTime', 'endTime must be HH:mm').matches(TIME_RE),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ msg: errors.array()[0].msg });
    }

    const { serviceProviderId, serviceId, date, startTime, endTime } = req.body;

    try {
      if (!mongoose.isValidObjectId(serviceProviderId)) {
        return res.status(400).json({ msg: 'Invalid serviceProviderId' });
      }

      const provider = await ServiceProvider.findById(serviceProviderId);
      if (!provider) {
        return res.status(404).json({ msg: 'Service provider not found' });
      }

      const service = provider.services.id(serviceId);
      if (!service) {
        return res.status(404).json({ msg: 'Service not found' });
      }

      const day = startOfDayUTC(date);
      if (day.getTime() < startOfDayUTC(new Date()).getTime()) {
        return res.status(400).json({ msg: 'Cannot book a date in the past' });
      }

      if (toMinutes(endTime) <= toMinutes(startTime)) {
        return res.status(400).json({ msg: 'endTime must be after startTime' });
      }

      // Validate the slot against the provider's recurring template.
      const dayBookings = await Booking.find({
        serviceProviderId,
        date: day,
        status: 'upcoming',
      }).select('startTime endTime status');

      const open = slotsForDay({
        availability: provider.availability,
        date: day,
        durationMinutes: toMinutes(endTime) - toMinutes(startTime),
        bookings: dayBookings,
      });

      const isOpen = open.some(
        (s) => s.start === startTime && s.end === endTime
      );
      if (!isOpen) {
        return res
          .status(409)
          .json({ msg: 'That slot is not available for this provider' });
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

      return res.status(201).json(booking);
    } catch (err) {
      return next(err);
    }
  }
);

// GET /api/bookings — mine (member) or incoming (provider)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.type === 'Service Provider') {
      const provider = await ServiceProvider.findOne({ userId: req.user.id });
      if (!provider) {
        return res.status(404).json({ msg: 'Service provider profile not found' });
      }
      filter.serviceProviderId = provider._id;
    } else {
      filter.user = req.user.id;
    }

    const bookings = await Booking.find(filter)
      .sort({ date: -1, startTime: 1 })
      .populate('user', 'name email')
      .populate('serviceProviderId', 'name location');

    return res.json(bookings);
  } catch (err) {
    return next(err);
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid booking id' });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('serviceProviderId', 'name location');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const isOwner = booking.user._id.toString() === req.user.id;
    let isProvider = false;
    if (req.user.type === 'Service Provider') {
      const provider = await ServiceProvider.findOne({ userId: req.user.id });
      isProvider =
        !!provider &&
        booking.serviceProviderId._id.toString() === provider._id.toString();
    }

    if (!isOwner && !isProvider) {
      return res.status(403).json({ msg: 'Not your booking' });
    }

    return res.json(booking);
  } catch (err) {
    return next(err);
  }
});

// PUT /api/bookings/:id — status transitions only
router.put('/:id', authenticate, async (req, res, next) => {
  const { status, timeSpent } = req.body;

  try {
    if (!Booking.BOOKING_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ msg: `status must be one of ${Booking.BOOKING_STATUSES.join(', ')}` });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Authorisation: the member may cancel; the provider may complete or cancel.
    const isOwner = booking.user.toString() === req.user.id;
    let isProvider = false;
    if (req.user.type === 'Service Provider') {
      const provider = await ServiceProvider.findOne({ userId: req.user.id });
      isProvider =
        !!provider &&
        booking.serviceProviderId.toString() === provider._id.toString();
    }

    if (!isOwner && !isProvider) {
      return res.status(403).json({ msg: 'Not your booking' });
    }

    // Authorisation first, then state — a member should get 403 for trying
    // to complete a booking regardless of what state it is currently in.
    if (isOwner && !isProvider && status !== 'canceled') {
      return res
        .status(403)
        .json({ msg: 'Members can only cancel their bookings' });
    }

    if (booking.status !== 'upcoming' && status !== booking.status) {
      return res
        .status(409)
        .json({ msg: `Cannot move a ${booking.status} booking to ${status}` });
    }

    booking.status = status;
    if (status === 'completed' && timeSpent != null) {
      booking.timeSpent = timeSpent;
    }

    await booking.save();
    return res.json(booking);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/bookings/:id — cancel (kept for history, not erased)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const isOwner = booking.user.toString() === req.user.id;
    let isProvider = false;
    if (req.user.type === 'Service Provider') {
      const provider = await ServiceProvider.findOne({ userId: req.user.id });
      isProvider =
        !!provider &&
        booking.serviceProviderId.toString() === provider._id.toString();
    }

    if (!isOwner && !isProvider) {
      return res.status(403).json({ msg: 'Not your booking' });
    }

    if (booking.status !== 'upcoming') {
      return res.status(409).json({ msg: 'Only upcoming bookings can be canceled' });
    }

    booking.status = 'canceled';
    await booking.save();

    return res.json({ msg: 'Booking canceled', booking });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
