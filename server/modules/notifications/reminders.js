const logger = require('../../lib/logger');
const Booking = require('../bookings/booking.model');
const { notifyBooking } = require('./notify');

const HOUR = 3600 * 1000;

/**
 * When a booking starts. `date` is UTC midnight of the calendar day and `startTime` is "HH:mm" in
 * the provider's local time, so this assumes the server shares that timezone.
 */
function bookingStart(b) {
  const d = new Date(b.date);
  const [h, m] = b.startTime.split(':').map(Number);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m);
}

/**
 * When the one reminder should go out, or null for none.
 *  - Booked at least 24 hours ahead: 24 hours before.
 *  - Booked 2 to 24 hours ahead: 2 hours before (a same-day booking still gets a nudge).
 *  - Booked less than 2 hours ahead: no reminder, they know.
 * A reschedule counts as a new booking, so lead time runs from the last change.
 */
function reminderDueAt(b) {
  const start = bookingStart(b);
  const changedAt = new Date(b.reschedules?.length ? b.reschedules[b.reschedules.length - 1].at : b.createdAt);
  const lead = start - changedAt;
  if (lead >= 24 * HOUR) return new Date(start - 24 * HOUR);
  if (lead >= 2 * HOUR) return new Date(start - 2 * HOUR);
  return null;
}

/**
 * Sends every reminder that is due. Safe to run from many instances at once: each booking is
 * claimed with one atomic update, so only one caller can win and send.
 */
async function sendDueReminders({ now = new Date() } = {}) {
  const from = new Date(now.getTime() - 24 * HOUR);
  const to = new Date(now.getTime() + 3 * 24 * HOUR);
  const candidates = await Booking.find({
    status: 'upcoming',
    reminderSentAt: { $exists: false },
    date: { $gte: from, $lte: to },
  }).lean();

  let sent = 0;
  for (const b of candidates) {
    const due = reminderDueAt(b);
    if (!due || due > now || bookingStart(b) <= now) continue;

    const claimed = await Booking.findOneAndUpdate(
      { _id: b._id, status: 'upcoming', reminderSentAt: { $exists: false }, date: b.date, startTime: b.startTime },
      { $set: { reminderSentAt: now } },
      { new: true }
    ).lean();
    if (!claimed) continue; // someone else got there first, or it just changed

    await notifyBooking(claimed, 'reminder');
    sent += 1;
  }
  if (sent) logger.info({ sent }, 'reminders sent');
  return sent;
}

module.exports = { bookingStart, reminderDueAt, sendDueReminders };
