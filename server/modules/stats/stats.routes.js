const express = require('express');
const ServiceProvider = require('../providers/provider.model');
const Booking = require('../bookings/booking.model');
const { slotsForDay, startOfDayUTC, localISO, dropPastSlots } = require('../bookings/slots');

const router = express.Router();

const DAYS = 7;
const CACHE_MS = 60 * 1000;
let cache = { at: 0, body: null };

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Public, aggregate-only numbers for the landing page: how many providers there are, what each kind
 * of help typically costs, and how many open times there are on each of the next 7 days. Nothing
 * about any one person or booking leaves here. Cached for a minute, so a busy home page does not
 * turn into a busy database.
 */
async function compute() {
  const providers = await ServiceProvider.find({}).select('services availability timeOff').lean();

  const byCategory = new Map();
  for (const p of providers) {
    const seen = new Set();
    for (const s of p.services) {
      const c = byCategory.get(s.category) ?? { name: s.category, providers: 0, prices: [] };
      if (!seen.has(s.category)) {
        c.providers += 1;
        seen.add(s.category);
      }
      c.prices.push(s.price);
      byCategory.set(s.category, c);
    }
  }
  const categories = [...byCategory.values()]
    .map((c) => ({
      name: c.name,
      providers: c.providers,
      minPrice: Math.min(...c.prices),
      avgPrice: round1(c.prices.reduce((a, b) => a + b, 0) / c.prices.length),
      maxPrice: Math.max(...c.prices),
    }))
    .sort((a, b) => b.providers - a.providers || a.name.localeCompare(b.name));

  const start = startOfDayUTC(localISO(new Date()));
  const end = new Date(start.getTime() + DAYS * 86400000);
  const booked = await Booking.find({ serviceProviderId: { $in: providers.map((p) => p._id) }, date: { $gte: start, $lt: end }, status: 'upcoming' })
    .select('serviceProviderId date startTime endTime status')
    .lean();
  const byDay = new Map();
  for (const b of booked) {
    const key = `${b.serviceProviderId}|${b.date.toISOString().slice(0, 10)}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(b);
  }

  const openings = [];
  for (let i = 0; i < DAYS; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = localISO(d);
    const day = startOfDayUTC(dateStr);
    let slots = 0;
    let free = 0;
    for (const p of providers) {
      const duration = p.services.length ? Math.min(...p.services.map((s) => s.durationMinutes || 60)) : 60;
      const open = dropPastSlots(
        slotsForDay({ availability: p.availability, timeOff: p.timeOff, date: day, durationMinutes: duration, bookings: byDay.get(`${p._id}|${dateStr}`) || [] }),
        day
      );
      slots += open.length;
      if (open.length) free += 1;
    }
    openings.push({ date: dateStr, slots, providers: free });
  }

  return { providers: providers.length, categories, openings };
}

// GET /api/stats
router.get('/', async (req, res) => {
  if (!cache.body || Date.now() - cache.at > CACHE_MS) cache = { at: Date.now(), body: await compute() };
  res.set('Cache-Control', 'public, max-age=60');
  return res.json(cache.body);
});

module.exports = router;
module.exports.compute = compute;
