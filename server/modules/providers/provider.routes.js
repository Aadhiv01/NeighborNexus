const express = require('express');

const authenticate = require('../../middleware/auth');
const validate = require('../../lib/validate');
const ServiceProvider = require('./provider.model');
const Booking = require('../bookings/booking.model');
const { toMinutes, startOfDayUTC, localISO, nextOpenSlot } = require('../bookings/slots');
const schemas = require('./provider.schemas');
const { notifyBooking } = require('../notifications/notify');
const live = require('../../lib/live');
const { cancelInfo } = require('../bookings/slots');

const router = express.Router();

const PROVIDER_TYPE = 'Service Provider';

/** Loads the signed-in provider's profile, or answers 403/404 and returns null. */
async function requireProvider(req, res) {
  if (req.user.type !== PROVIDER_TYPE) {
    res.status(403).json({ msg: 'Only service providers can do this' });
    return null;
  }
  const provider = await ServiceProvider.findOne({ userId: req.user.id });
  if (!provider) {
    res.status(404).json({ msg: 'Service provider profile not found' });
    return null;
  }
  return provider;
}

/**
 * Coordinates are rounded to 2 decimals (about 1 km) before they are stored, so a
 * provider's exact address is never published. Enforced here, not in the client.
 */
const round2 = (n) => Math.round(n * 100) / 100;

/** Splits a profile body into a Mongo $set/$unset, turning { lat, lng } into GeoJSON. */
function profileUpdate({ geo, ...rest }) {
  const update = { $set: rest };
  if (geo) update.$set.geo = { type: 'Point', coordinates: [round2(geo.lng), round2(geo.lat)] };
  if (geo === null) update.$unset = { geo: 1 };
  return update;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── Discovery ──────────────────────────────────────────────────────────────
// GET /api/serviceprovider?category=&location=&q=&lat=&lng=&radiusKm=
// With lat and lng the result is ordered nearest first and carries distanceMeters.
router.get('/', validate({ query: schemas.searchQuery }), async (req, res) => {
  const { category, location, q, lat, lng, radiusKm } = req.valid.query;
  const filter = {};

  if (category) filter['services.category'] = category;
  // User text is escaped: it is a search term, not a regular expression.
  if (location) filter.location = new RegExp(escapeRegex(location), 'i');
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { bio: rx }, { 'services.name': rx }];
  }

  const fields =
    'userId name profilePicture bio services availability timeOff rating location experience availableForEmergency geo';

  let providers;
  if (lat !== undefined) {
    // $geoNear must be the first stage, and uses the 2dsphere index on `geo`.
    // Providers with no location are not returned for "near me".
    providers = await ServiceProvider.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          spherical: true,
          key: 'geo',
          query: filter,
          ...(radiusKm ? { maxDistance: radiusKm * 1000 } : {}),
        },
      },
      { $limit: 50 },
      {
        $project: {
          userId: 1, name: 1, profilePicture: 1, bio: 1, services: 1, availability: 1, timeOff: 1, rating: 1,
          location: 1, experience: 1, availableForEmergency: 1, geo: 1, distanceMeters: 1,
        },
      },
    ]);
  } else {
    providers = await ServiceProvider.find(filter).select(fields).sort({ rating: -1 }).limit(50).lean();
  }

  // Attach each provider's next open slot using ONE bookings query for all of them.
  const DAYS = 14;
  const start = startOfDayUTC(localISO(new Date()));
  const end = new Date(start.getTime() + DAYS * 86400000);
  const booked = await Booking.find({
    serviceProviderId: { $in: providers.map((p) => p._id) },
    date: { $gte: start, $lt: end },
    status: 'upcoming',
  })
    .select('serviceProviderId date startTime endTime status')
    .lean();

  const byProviderDay = new Map();
  for (const b of booked) {
    const key = `${b.serviceProviderId}|${b.date.toISOString().slice(0, 10)}`;
    if (!byProviderDay.has(key)) byProviderDay.set(key, []);
    byProviderDay.get(key).push(b);
  }

  const result = providers.map(({ availability, timeOff, ...p }) => {
    const durations = p.services.map((s) => s.durationMinutes || 60);
    return {
      ...p,
      nextAvailable: nextOpenSlot({
        availability,
        timeOff,
        durationMinutes: durations.length ? Math.min(...durations) : 60,
        bookingsFor: (dateStr) => byProviderDay.get(`${p._id}|${dateStr}`) || [],
        days: DAYS,
      }),
    };
  });

  return res.json(result);
});

// ─── Services ───────────────────────────────────────────────────────────────
router.get('/services', authenticate, async (req, res) => {
  const provider = await requireProvider(req, res);
  if (!provider) return;
  return res.json(provider.services);
});

router.post('/services', authenticate, validate({ body: schemas.service }), async (req, res) => {
  const provider = await requireProvider(req, res);
  if (!provider) return;

  provider.services.push(req.valid.body);
  await provider.save();

  return res.status(201).json(provider.services[provider.services.length - 1]);
});

router.put(
  '/services/:serviceId',
  authenticate,
  validate({ params: schemas.serviceIdParam, body: schemas.serviceUpdate }),
  async (req, res) => {
    const provider = await requireProvider(req, res);
    if (!provider) return;

    const service = provider.services.id(req.valid.params.serviceId);
    if (!service) return res.status(404).json({ msg: 'Service not found' });

    Object.assign(service, req.valid.body);
    await provider.save();
    return res.json(service);
  }
);

router.delete(
  '/services/:serviceId',
  authenticate,
  validate({ params: schemas.serviceIdParam }),
  async (req, res) => {
    const provider = await requireProvider(req, res);
    if (!provider) return;

    const service = provider.services.id(req.valid.params.serviceId);
    if (!service) return res.status(404).json({ msg: 'Service not found' });

    service.deleteOne();
    await provider.save();
    return res.json({ msg: 'Service deleted', serviceId: req.valid.params.serviceId });
  }
);

// ─── Availability (recurring weekly template) ───────────────────────────────
router.get('/availability', authenticate, async (req, res) => {
  const provider = await requireProvider(req, res);
  if (!provider) return;
  return res.json(provider.availability);
});

router.post('/availability', authenticate, validate({ body: schemas.availability }), async (req, res) => {
  const provider = await requireProvider(req, res);
  if (!provider) return;

  const { day } = req.valid.body;
  const slots = [...req.valid.body.slots].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

  for (const s of slots) {
    if (toMinutes(s.end) <= toMinutes(s.start)) {
      return res.status(400).json({ msg: `Window ${s.start}–${s.end} ends before it starts` });
    }
  }
  for (let i = 1; i < slots.length; i += 1) {
    if (toMinutes(slots[i].start) < toMinutes(slots[i - 1].end)) {
      return res.status(400).json({
        msg: `Windows ${slots[i - 1].start}–${slots[i - 1].end} and ${slots[i].start}–${slots[i].end} overlap`,
      });
    }
  }

  const existing = provider.availability.find((a) => a.day === day);
  if (existing) existing.slots = slots;
  else provider.availability.push({ day, slots });

  await provider.save();
  live.publish(provider._id, {});
  return res.json(provider.availability);
});

// ─── Time off (blocked days and hours) ──────────────────────────────────────
// GET /api/serviceprovider/time-off: what is blocked from today on
router.get('/time-off', authenticate, async (req, res) => {
  const provider = await requireProvider(req, res);
  if (!provider) return;
  const today = localISO(new Date());
  const upcoming = provider.timeOff.filter((t) => t.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  return res.json(upcoming);
});

/** Upcoming bookings that fall inside a time off entry (any time of the day if it has no hours). */
async function bookingsInside(provider, entry) {
  const found = await Booking.find({
    serviceProviderId: provider._id,
    status: 'upcoming',
    date: { $gte: startOfDayUTC(entry.startDate), $lte: startOfDayUTC(entry.endDate) },
  }).populate('user', 'name').lean();
  if (!entry.startTime) return found;
  return found.filter((b) => toMinutes(b.startTime) < toMinutes(entry.endTime) && toMinutes(b.endTime) > toMinutes(entry.startTime));
}

// POST /api/serviceprovider/time-off
// If bookings already sit inside the time, nothing is saved until the provider says what to do with
// them: `bookings: "keep"` leaves them, `"cancel"` cancels them and tells each member.
router.post('/time-off', authenticate, validate({ body: schemas.timeOff }), async (req, res) => {
  const provider = await requireProvider(req, res);
  if (!provider) return;

  const { bookings: decision, endDate, note, ...rest } = req.valid.body;
  const entry = { ...rest, endDate: endDate ?? rest.startDate, note };
  if (entry.endDate < localISO(new Date())) {
    return res.status(400).json({ msg: 'That time is already in the past' });
  }

  const inside = await bookingsInside(provider, entry);
  if (inside.length && !decision) {
    return res.status(409).json({
      msg: `${inside.length} ${inside.length === 1 ? 'booking is' : 'bookings are'} already booked in that time. Choose whether to keep or cancel them.`,
      conflicts: inside.map((b) => ({
        _id: b._id, date: b.date, startTime: b.startTime, endTime: b.endTime,
        serviceName: b.serviceName, member: b.user?.name ?? 'A member',
      })),
    });
  }

  provider.timeOff.push(entry);
  await provider.save();

  let canceled = 0;
  if (decision === 'cancel') {
    for (const b of inside) {
      const booking = await Booking.findOneAndUpdate({ _id: b._id, status: 'upcoming' }, { $set: cancelInfo(b, 'provider') }, { new: true });
      if (!booking) continue; // changed in the meantime
      canceled += 1;
      notifyBooking(booking, 'canceled', { by: 'provider' });
    }
  }
  live.publish(provider._id, {});
  return res.status(201).json({ timeOff: provider.timeOff[provider.timeOff.length - 1], canceled, kept: decision === 'keep' ? inside.length : 0 });
});

// DELETE /api/serviceprovider/time-off/:timeOffId
router.delete('/time-off/:timeOffId', authenticate, validate({ params: schemas.timeOffIdParam }), async (req, res) => {
  const provider = await requireProvider(req, res);
  if (!provider) return;
  const entry = provider.timeOff.id(req.valid.params.timeOffId);
  if (!entry) return res.status(404).json({ msg: 'Time off not found' });
  entry.deleteOne();
  await provider.save();
  live.publish(provider._id, {});
  return res.json({ msg: 'Time off removed' });
});

// ─── Provider-side bookings ────────────────────────────────────────────────
router.get('/bookings', authenticate, async (req, res) => {
  const provider = await requireProvider(req, res);
  if (!provider) return;

  const bookings = await Booking.find({ serviceProviderId: provider._id })
    .sort({ date: -1, startTime: 1 })
    .populate('user', 'name email')
    .lean();

  return res.json(bookings);
});

router.put(
  '/bookings/:bookingId',
  authenticate,
  validate({ params: schemas.bookingIdParam, body: schemas.bookingStatus }),
  async (req, res) => {
    const provider = await requireProvider(req, res);
    if (!provider) return;

    const booking = await Booking.findOne({
      _id: req.valid.params.bookingId,
      serviceProviderId: provider._id,
    });
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    if (req.valid.body.status === 'canceled') booking.set(cancelInfo(booking, 'provider'));
    else booking.status = req.valid.body.status;
    await booking.save();
    live.publish(booking.serviceProviderId, {});
    if (booking.status === 'canceled') notifyBooking(booking, 'canceled', { by: 'provider' });
    if (booking.status === 'completed') notifyBooking(booking, 'completed');
    return res.json(booking);
  }
);

// ─── Profile ────────────────────────────────────────────────────────────────
// GET /api/serviceprovider/profile: the signed-in provider
router.get('/profile', authenticate, async (req, res) => {
  const provider = await requireProvider(req, res);
  if (!provider) return;
  // Reviewer names are shown on the provider's own profile page.
  await provider.populate('reviews.customer', 'name');
  return res.json(provider);
});

// GET /api/serviceprovider/profile/:userId: public profile
router.get('/profile/:userId', validate({ params: schemas.userIdParam }), async (req, res) => {
  const provider = await ServiceProvider.findOne({ userId: req.valid.params.userId })
    // Time off carries the provider's private notes, so it never goes out publicly.
    .select('-reviews.customer -timeOff')
    .lean();
  if (!provider) return res.status(404).json({ msg: 'Profile not found' });
  return res.json(provider);
});

// POST /api/serviceprovider/profile/:userId: create
router.post(
  '/profile/:userId',
  authenticate,
  validate({ params: schemas.userIdParam, body: schemas.profile }),
  async (req, res) => {
    if (req.user.id !== req.valid.params.userId) {
      return res.status(403).json({ msg: 'You can only create your own profile' });
    }
    if (await ServiceProvider.exists({ userId: req.user.id })) {
      return res.status(409).json({ msg: 'Profile already exists' });
    }

    const { $set } = profileUpdate(req.valid.body);
    const provider = await ServiceProvider.create({ ...$set, userId: req.user.id });
    return res.status(201).json(provider);
  }
);

// PUT /api/serviceprovider/profile/:userId: update
router.put(
  '/profile/:userId',
  authenticate,
  validate({ params: schemas.userIdParam, body: schemas.profile }),
  async (req, res) => {
    if (req.user.id !== req.valid.params.userId) {
      return res.status(403).json({ msg: 'You can only edit your own profile' });
    }

    // The schema strips unknown keys, so userId, rating and reviews can't be set here.
    const provider = await ServiceProvider.findOneAndUpdate(
      { userId: req.user.id },
      profileUpdate(req.valid.body),
      { new: true, runValidators: true }
    );
    if (!provider) return res.status(404).json({ msg: 'Profile not found' });

    return res.json(provider);
  }
);

module.exports = router;
