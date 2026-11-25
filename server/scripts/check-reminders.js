/**
 * Integration check for reminders against a real database. It creates its own bookings,
 * runs the sender with a pinned clock, asserts, and cleans up after itself.
 *
 *   npm run check:reminders        (needs `npm run seed` data and a database)
 */
const config = require('../lib/config');
const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
const ServiceProvider = require('../modules/providers/provider.model');
const Booking = require('../modules/bookings/booking.model');
const Notification = require('../modules/notifications/notification.model');
const { sendDueReminders } = require('../modules/notifications/reminders');

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed += 1; console.log(`  ok   ${name}`); }
  else { failed += 1; console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`); }
};

(async () => {
  await mongoose.connect(config.MONGO_URI);
  const member = await User.findOne({ email: 'alex@example.com' });
  const provider = await ServiceProvider.findOne({ name: 'Maya Chen' });
  if (!member || !provider) throw new Error('Run `npm run seed` first.');

  // A booking 6 days out (so it cannot collide with anything seeded), booked 10 days ahead.
  const start = new Date();
  start.setDate(start.getDate() + 6);
  const date = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  const make = (startTime, endTime, createdAt) =>
    Booking.create({
      user: member._id, serviceProviderId: provider._id, serviceId: provider.services[0]._id,
      serviceName: 'Reminder check', price: 1, date, startTime, endTime, createdAt,
    });

  const made = [];
  try {
    const when = (h, m) => new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m);
    const b = await make('06:00', '07:00', new Date(when(6, 0).getTime() - 10 * 24 * 3600 * 1000));
    made.push(b);

    const before = await sendDueReminders({ now: new Date(when(6, 0).getTime() - 25 * 3600 * 1000) });
    check('nothing is sent before the 24 hour mark', before === 0, `sent ${before}`);

    const now = new Date(when(6, 0).getTime() - 23 * 3600 * 1000);
    const first = await sendDueReminders({ now });
    const stored = await Booking.findById(b._id).lean();
    check('reminder is sent once it is due', first === 1, `sent ${first}`);
    check('the booking records that it was reminded', !!stored.reminderSentAt);

    const notes = await Notification.find({ booking: b._id, type: 'reminder' }).lean();
    check('both the member and the provider are notified', notes.length === 2 &&
      new Set(notes.map((n) => String(n.user))).size === 2);

    const again = await sendDueReminders({ now });
    check('running again does not send a duplicate', again === 0 && (await Notification.countDocuments({ booking: b._id, type: 'reminder' })) === 2);

    // Two senders racing for one booking: exactly one may win.
    const b2 = await make('07:00', '08:00', new Date(when(7, 0).getTime() - 10 * 24 * 3600 * 1000));
    made.push(b2);
    const race = await Promise.all([sendDueReminders({ now }), sendDueReminders({ now }), sendDueReminders({ now })]);
    const total = race.reduce((a, c) => a + c, 0);
    check('concurrent senders send each reminder exactly once', total === 1 && (await Notification.countDocuments({ booking: b2._id, type: 'reminder' })) === 2, `sent ${total}`);

    // Canceled bookings are never reminded.
    const b3 = await make('08:00', '09:00', new Date(when(8, 0).getTime() - 10 * 24 * 3600 * 1000));
    made.push(b3);
    await Booking.updateOne({ _id: b3._id }, { $set: { status: 'canceled' } });
    const canceled = await sendDueReminders({ now });
    check('canceled bookings get no reminder', canceled === 0 && (await Notification.countDocuments({ booking: b3._id })) === 0);

    // After a reschedule the reminder is due again, measured from the change.
    await Booking.updateOne(
      { _id: b._id },
      {
        $unset: { reminderSentAt: 1 },
        $push: { reschedules: { date, startTime: '06:00', endTime: '07:00', at: new Date(when(6, 0).getTime() - 30 * 3600 * 1000) } },
      }
    );
    const resent = await sendDueReminders({ now });
    check(
      'a rescheduled booking is reminded again',
      resent === 1 && (await Notification.countDocuments({ booking: b._id, type: 'reminder' })) === 4,
      `sent ${resent}`
    );
  } finally {
    const ids = made.map((m) => m._id);
    await Notification.deleteMany({ booking: { $in: ids } });
    await Booking.deleteMany({ _id: { $in: ids } });
    await mongoose.connection.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => { console.error(err); process.exit(1); });
