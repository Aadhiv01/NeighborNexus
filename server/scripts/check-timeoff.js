/**
 * Checks that a provider's time off really removes times everywhere times are offered: the slots
 * list, booking, rescheduling, "next free" and the public stats, and that its private notes stay
 * private. It edits the seeded provider's time off and removes it afterwards.
 *
 *   npm run check:timeoff     (needs `npm run seed` data and the API running at API_URL)
 */
const config = require('../lib/config');
const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
const ServiceProvider = require('../modules/providers/provider.model');
const Booking = require('../modules/bookings/booking.model');
const { localISO, startOfDayUTC } = require('../modules/bookings/slots');
const { compute: computeStats } = require('../modules/stats/stats.routes');

const BASE = process.env.API_URL || 'http://localhost:4000';
let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed += 1; console.log(`  ok   ${name}`); }
  else { failed += 1; console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`); }
};
const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};
const login = async (email) => (await api('/api/auth', { method: 'POST', body: { email, password: 'password123' } })).data.token;
const dayPlus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return localISO(d); };

(async () => {
  await mongoose.connect(config.MONGO_URI);
  const member = await User.findOne({ email: 'alex@example.com' });
  const provider = await ServiceProvider.findOne({ name: 'Maya Chen' });
  if (!member || !provider) throw new Error('Run `npm run seed` first.');
  const memberTok = await login('alex@example.com');
  const serviceId = String(provider.services[0]._id);
  const slotsOn = async (date) =>
    (await api(`/api/bookings/slots?serviceProviderId=${provider._id}&serviceId=${serviceId}&date=${date}`)).data.slots;
  const openDays = [];
  for (let i = 2; i <= 14 && openDays.length < 2; i += 1) if ((await slotsOn(dayPlus(i))).length > 3) openDays.push(dayPlus(i));
  const [dayA, dayB] = openDays;
  if (!dayB) throw new Error('Need two days with open times in the next two weeks.');

  const made = [];
  try {
    const before = await slotsOn(dayA);
    const nextBefore = (await api('/api/serviceprovider')).data.find((p) => p.name === 'Maya Chen').nextAvailable;
    // The public endpoint caches for a minute, so the calculation behind it is called directly.
    const statsBefore = (await computeStats()).openings.find((o) => o.date === dayA).slots;

    // A whole day off.
    provider.timeOff.push({ startDate: dayA, endDate: dayA, note: 'Private: dentist' });
    await provider.save();
    check('a whole day off empties the slots list for that day', (await slotsOn(dayA)).length === 0);
    check('another day is unaffected', (await slotsOn(dayB)).length > 3);

    const book = await api('/api/bookings', { method: 'POST', token: memberTok, body: { serviceProviderId: String(provider._id), serviceId, date: dayA, startTime: before[0].start, endTime: before[0].end } });
    check('booking a time on a day off is refused', book.status === 409, `${book.status}`);

    const nextAfter = (await api('/api/serviceprovider')).data.find((p) => p.name === 'Maya Chen').nextAvailable;
    check('"next free" never points at a day off', !nextAfter || nextAfter.date !== dayA);

    const stats = (await computeStats()).openings.find((o) => o.date === dayA).slots;
    // Stats cover every provider, so blocking one removes only her share of that day's open times.
    check('the public stats count fewer open times on that day', stats < statsBefore && stats > 0, `${statsBefore} -> ${stats}`);

    const publicProfile = await api(`/api/serviceprovider/profile/${provider.userId}`);
    check('the public profile does not reveal time off or its notes', publicProfile.status === 200 && !JSON.stringify(publicProfile.data).match(/timeOff|dentist/));
    const listing = JSON.stringify((await api('/api/serviceprovider')).data);
    check('the provider list does not reveal time off either', !listing.match(/timeOff|dentist/));

    // A window off on another day, and a booking that tries to move into it.
    const blockedStart = (await slotsOn(dayB))[2].start;
    const h = Number(blockedStart.slice(0, 2));
    const blockedEnd = `${String(h + 1).padStart(2, '0')}${blockedStart.slice(2)}`;
    provider.timeOff.push({ startDate: dayB, endDate: dayB, startTime: blockedStart, endTime: blockedEnd });
    await provider.save();
    const afterWindow = (await slotsOn(dayB)).map((s) => s.start);
    check('a window off removes overlapping times only', !afterWindow.includes(blockedStart) && afterWindow.length > 0);

    const far = new Date(Date.now() + 6 * 24 * 3600 * 1000);
    const mine = await Booking.create({
      user: member._id, serviceProviderId: provider._id, serviceId: provider.services[0]._id, serviceName: 'Timeoff check',
      price: 1, date: startOfDayUTC(localISO(far)), startTime: '15:00', endTime: '16:00',
    });
    made.push(mine._id);
    const moved = await api(`/api/bookings/${mine._id}/reschedule`, { method: 'POST', token: memberTok, body: { date: dayB, startTime: blockedStart, endTime: blockedEnd } });
    check('rescheduling into blocked time is refused', moved.status === 409, `${moved.status}`);
  } finally {
    await ServiceProvider.updateOne({ _id: provider._id }, { $set: { timeOff: [] } });
    await Booking.deleteMany({ _id: { $in: made } });
    await mongoose.connection.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => { console.error(err); process.exit(1); });
