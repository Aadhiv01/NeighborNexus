/**
 * Checks the reschedule cutoff and cancellation records against a running API and its database.
 * It inserts its own bookings and removes them afterwards.
 *
 *   npm run check:policies     (needs `npm run seed` data and the API running at API_URL)
 */
const config = require('../lib/config');
const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
const ServiceProvider = require('../modules/providers/provider.model');
const Booking = require('../modules/bookings/booking.model');
const { localISO, startOfDayUTC } = require('../modules/bookings/slots');

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
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

(async () => {
  await mongoose.connect(config.MONGO_URI);
  const member = await User.findOne({ email: 'alex@example.com' });
  const provider = await ServiceProvider.findOne({ name: 'Maya Chen' });
  if (!member || !provider) throw new Error('Run `npm run seed` first.');
  const memberTok = await login('alex@example.com');
  const providerTok = await login('maya@example.com');

  const made = [];
  const make = async (startsInHours, offsetMin = 0) => {
    const start = new Date(Date.now() + startsInHours * 3600 * 1000 + offsetMin * 60000);
    start.setSeconds(0, 0);
    const end = new Date(start.getTime() + 3600 * 1000);
    const b = await Booking.create({
      user: member._id, serviceProviderId: provider._id, serviceId: provider.services[0]._id,
      serviceName: 'Policy check', price: 1, date: startOfDayUTC(localISO(start)),
      startTime: hhmm(start), endTime: hhmm(end),
    });
    made.push(b._id);
    return b;
  };
  const target = () => {
    const d = new Date(Date.now() + 20 * 24 * 3600 * 1000);
    return { date: localISO(d), startTime: '10:00', endTime: '11:00' };
  };

  try {
    const soon = await make(config.RESCHEDULE_NOTICE_HOURS - 2);
    const closed = await api(`/api/bookings/${soon._id}/reschedule`, { method: 'POST', token: memberTok, body: target() });
    check('rescheduling inside the cutoff is refused', closed.status === 409 && /closes .* hours before/.test(closed.data?.msg || ''), `${closed.status} ${closed.data?.msg}`);

    const list = await api('/api/bookings', { token: memberTok });
    const listed = list.data.find((b) => b._id === String(soon._id));
    check('the bookings list tells the member when rescheduling closes', !!listed?.rescheduleDeadline && new Date(listed.rescheduleDeadline) < new Date());
    const provList = await api('/api/bookings', { token: providerTok });
    check('providers are not given a reschedule deadline', provList.data.every((b) => b.rescheduleDeadline === undefined));

    const canceled = await api(`/api/bookings/${soon._id}`, { method: 'DELETE', token: memberTok });
    const afterMember = await Booking.findById(soon._id).lean();
    check('cancelling is still allowed inside the cutoff', canceled.status === 200 && afterMember.status === 'canceled');
    check('a member cancel records who, when and how late',
      afterMember.canceledBy === 'member' && !!afterMember.canceledAt && afterMember.canceledHoursBefore > 5 && afterMember.canceledHoursBefore < 12,
      JSON.stringify({ by: afterMember.canceledBy, h: afterMember.canceledHoursBefore }));

    const byProvider = await make(3);
    const pc = await api(`/api/serviceprovider/bookings/${byProvider._id}`, { method: 'PUT', token: providerTok, body: { status: 'canceled' } });
    const afterProv = await Booking.findById(byProvider._id).lean();
    check('a provider cancel is recorded as the provider, with how late', pc.status === 200 && afterProv.canceledBy === 'provider' && afterProv.canceledHoursBefore > 2 && afterProv.canceledHoursBefore < 4,
      JSON.stringify({ by: afterProv.canceledBy, h: afterProv.canceledHoursBefore }));

    const far = await make(24 * 5);
    const t = target();
    const ok = await api(`/api/bookings/${far._id}/reschedule`, { method: 'POST', token: memberTok, body: t });
    check('rescheduling well before the cutoff still works', ok.status === 200, `${ok.status} ${ok.data?.msg}`);
  } finally {
    await Booking.deleteMany({ _id: { $in: made } });
    await mongoose.connection.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => { console.error(err); process.exit(1); });
