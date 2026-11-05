const express = require('express');
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');

const authenticate = require('../middleware/auth');
const ServiceProvider = require('../models/ServiceProvider');
const Booking = require('../models/Booking');
const { toMinutes } = require('../utils/slots');

const router = express.Router();

const PROVIDER_TYPE = 'Service Provider';

/** Fields a provider is allowed to set on their own profile. */
const EDITABLE_PROFILE_FIELDS = [
  'name',
  'bio',
  'profilePicture',
  'experience',
  'socialLinks',
  'contactInfo',
  'location',
  'availableForEmergency',
];

function pick(obj, keys) {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
}

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

// ─── Discovery ──────────────────────────────────────────────────────────────
// GET /api/serviceprovider?category=&location=&q=
router.get('/', async (req, res, next) => {
  try {
    const { category, location, q } = req.query;
    const filter = {};

    if (category) filter['services.category'] = category;
    if (location) filter.location = new RegExp(String(location), 'i');
    if (q) {
      const rx = new RegExp(String(q), 'i');
      filter.$or = [{ name: rx }, { bio: rx }, { 'services.name': rx }];
    }

    const providers = await ServiceProvider.find(filter)
      .select('userId name profilePicture bio services rating location experience availableForEmergency')
      .sort({ rating: -1 })
      .limit(50);

    return res.json(providers);
  } catch (err) {
    return next(err);
  }
});

// ─── Services ───────────────────────────────────────────────────────────────
router.get('/services', authenticate, async (req, res, next) => {
  try {
    const provider = await requireProvider(req, res);
    if (!provider) return;
    return res.json(provider.services);
  } catch (err) {
    return next(err);
  }
});

router.post(
  '/services',
  authenticate,
  [
    check('name', 'Service name is required').trim().notEmpty(),
    check('category', 'Category is required').trim().notEmpty(),
    check('price', 'Price must be a positive number').isFloat({ min: 0 }),
    check('durationMinutes', 'Duration must be at least 15 minutes')
      .optional()
      .isInt({ min: 15 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ msg: errors.array()[0].msg });
    }

    try {
      const provider = await requireProvider(req, res);
      if (!provider) return;

      const { name, category, description = '', price, durationMinutes } = req.body;
      provider.services.push({ name, category, description, price, durationMinutes });
      await provider.save();

      const created = provider.services[provider.services.length - 1];
      return res.status(201).json(created);
    } catch (err) {
      return next(err);
    }
  }
);

router.put('/services/:serviceId', authenticate, async (req, res, next) => {
  try {
    const provider = await requireProvider(req, res);
    if (!provider) return;

    const service = provider.services.id(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }

    const updates = pick(req.body, [
      'name',
      'category',
      'description',
      'price',
      'durationMinutes',
    ]);
    Object.assign(service, updates);

    await provider.save();
    return res.json(service);
  } catch (err) {
    return next(err);
  }
});

router.delete('/services/:serviceId', authenticate, async (req, res, next) => {
  try {
    const provider = await requireProvider(req, res);
    if (!provider) return;

    const service = provider.services.id(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }
    service.deleteOne();
    await provider.save();

    return res.json({ msg: 'Service deleted', serviceId: req.params.serviceId });
  } catch (err) {
    return next(err);
  }
});

// ─── Availability (recurring weekly template) ───────────────────────────────
router.get('/availability', authenticate, async (req, res, next) => {
  try {
    const provider = await requireProvider(req, res);
    if (!provider) return;
    return res.json(provider.availability);
  } catch (err) {
    return next(err);
  }
});

router.post(
  '/availability',
  authenticate,
  [
    check('day').isIn([
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]),
    check('slots', 'slots must be an array').isArray(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ msg: errors.array()[0].msg });
    }

    try {
      const provider = await requireProvider(req, res);
      if (!provider) return;

      const day = String(req.body.day).toLowerCase();
      const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
      const slots = [];

      for (const raw of req.body.slots) {
        const start = String(raw?.start ?? '');
        const end = String(raw?.end ?? '');
        if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
          return res
            .status(400)
            .json({ msg: 'Each window needs a start and end in HH:mm' });
        }
        if (toMinutes(end) <= toMinutes(start)) {
          return res
            .status(400)
            .json({ msg: `Window ${start}–${end} ends before it starts` });
        }
        slots.push({ start, end });
      }

      slots.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

      for (let i = 1; i < slots.length; i += 1) {
        if (toMinutes(slots[i].start) < toMinutes(slots[i - 1].end)) {
          return res.status(400).json({
            msg: `Windows ${slots[i - 1].start}–${slots[i - 1].end} and ${
              slots[i].start
            }–${slots[i].end} overlap`,
          });
        }
      }

      const existing = provider.availability.find((a) => a.day === day);
      if (existing) {
        existing.slots = slots;
      } else {
        provider.availability.push({ day, slots });
      }

      await provider.save();
      return res.json(provider.availability);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── Provider-side bookings ────────────────────────────────────────────────
router.get('/bookings', authenticate, async (req, res, next) => {
  try {
    const provider = await requireProvider(req, res);
    if (!provider) return;

    const bookings = await Booking.find({ serviceProviderId: provider._id })
      .sort({ date: -1, startTime: 1 })
      .populate('user', 'name email');

    return res.json(bookings);
  } catch (err) {
    return next(err);
  }
});

router.put('/bookings/:bookingId', authenticate, async (req, res, next) => {
  try {
    const provider = await requireProvider(req, res);
    if (!provider) return;

    const { status } = req.body;
    if (!Booking.BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({
        msg: `status must be one of ${Booking.BOOKING_STATUSES.join(', ')}`,
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      serviceProviderId: provider._id,
    });

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    booking.status = status;
    await booking.save();
    return res.json(booking);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ msg: 'Invalid booking id' });
    }
    return next(err);
  }
});

// ─── Profile ────────────────────────────────────────────────────────────────
// GET /api/serviceprovider/profile — the signed-in provider
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const provider = await requireProvider(req, res);
    if (!provider) return;
    // Reviewer names are shown on the provider's own profile page.
    await provider.populate('reviews.customer', 'name');
    return res.json(provider);
  } catch (err) {
    return next(err);
  }
});

// GET /api/serviceprovider/profile/:userId — public profile
router.get('/profile/:userId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ msg: 'Invalid user id' });
    }
    const provider = await ServiceProvider.findOne({
      userId: req.params.userId,
    }).select('-reviews.customer');
    if (!provider) {
      return res.status(404).json({ msg: 'Profile not found' });
    }
    return res.json(provider);
  } catch (err) {
    return next(err);
  }
});

// POST /api/serviceprovider/profile/:userId — create
router.post('/profile/:userId', authenticate, async (req, res, next) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ msg: 'You can only create your own profile' });
    }

    const existing = await ServiceProvider.findOne({ userId: req.user.id });
    if (existing) {
      return res.status(409).json({ msg: 'Profile already exists' });
    }

    const provider = await ServiceProvider.create({
      ...pick(req.body, EDITABLE_PROFILE_FIELDS),
      userId: req.user.id,
    });

    return res.status(201).json(provider);
  } catch (err) {
    return next(err);
  }
});

// PUT /api/serviceprovider/profile/:userId — update
router.put('/profile/:userId', authenticate, async (req, res, next) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ msg: 'You can only edit your own profile' });
    }

    // Whitelisted fields only — no mass assignment of userId, rating, reviews.
    const updates = pick(req.body, EDITABLE_PROFILE_FIELDS);

    const provider = await ServiceProvider.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({ msg: 'Profile not found' });
    }

    return res.json(provider);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
