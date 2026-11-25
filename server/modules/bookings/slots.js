const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Normalise any date to midnight UTC so one calendar day maps to one key. */
const startOfDayUTC = (value) => {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const weekdayOf = (date) => WEEKDAYS[new Date(date).getUTCDay()];

/**
 * Availability is a recurring weekly template. Bookings consume a specific
 * date, so free slots are derived — never mutated in place.
 */
function slotsForDay({
  availability = [],
  date,
  durationMinutes = 60,
  stepMinutes = 30,
  bookings = [],
}) {
  const day = weekdayOf(date);
  const entry = availability.find((a) => String(a.day).toLowerCase() === day);
  if (!entry) return [];

  const busy = bookings
    .filter((b) => b.status !== 'canceled')
    .map((b) => ({ start: toMinutes(b.startTime), end: toMinutes(b.endTime) }));

  const slots = [];

  for (const range of entry.slots || []) {
    const dayStart = toMinutes(range.start);
    const dayEnd = toMinutes(range.end);

    for (let t = dayStart; t + durationMinutes <= dayEnd; t += stepMinutes) {
      const slotStart = t;
      const slotEnd = t + durationMinutes;
      const overlaps = busy.some((b) => slotStart < b.end && slotEnd > b.start);
      if (!overlaps) {
        slots.push({ start: toHHMM(slotStart), end: toHHMM(slotEnd) });
      }
    }
  }

  return slots;
}

/** YYYY-MM-DD for a local calendar date. */
const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The first open slot in the next `days` days, or null. `bookingsFor(dateStr)`
 * returns that day's upcoming bookings. Times are compared in the server's
 * local time, which assumes providers and the server share a timezone.
 */
function nextOpenSlot({ availability = [], durationMinutes = 60, bookingsFor, now = new Date(), days = 14 }) {
  for (let i = 0; i < days; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = localISO(d);
    let slots = slotsForDay({
      availability,
      date: startOfDayUTC(dateStr),
      durationMinutes,
      bookings: bookingsFor(dateStr),
    });
    if (i === 0) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      slots = slots.filter((s) => toMinutes(s.start) > nowMinutes);
    }
    if (slots.length) return { date: dateStr, start: slots[0].start, end: slots[0].end };
  }
  return null;
}

/**
 * Removes slots that have already started when `day` is today. "Today" means the local calendar
 * date (the same date people see on a calendar), not the UTC date, so evening users are not
 * told today is already over.
 */
function dropPastSlots(slots, day, now = new Date()) {
  if (startOfDayUTC(day).getTime() !== startOfDayUTC(localISO(now)).getTime()) return slots;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((s) => toMinutes(s.start) > nowMinutes);
}

/**
 * When a booking starts. `date` is UTC midnight of the calendar day and `startTime` is "HH:mm" in
 * the provider's local time, so this assumes the server shares that timezone.
 */
function bookingStart(b) {
  const d = new Date(b.date);
  const [h, m] = b.startTime.split(':').map(Number);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m);
}

const HOUR_MS = 3600 * 1000;

/** The last moment a member may reschedule: `noticeHours` before the booking starts. */
const rescheduleDeadline = (b, noticeHours) => new Date(bookingStart(b).getTime() - noticeHours * HOUR_MS);

/** Fields recorded when a booking is canceled: who did it, when, and how close to the start. */
function cancelInfo(b, by, now = new Date()) {
  return {
    status: 'canceled',
    canceledBy: by,
    canceledAt: now,
    canceledHoursBefore: Math.round(((bookingStart(b) - now) / HOUR_MS) * 10) / 10,
  };
}

module.exports = {
  bookingStart,
  rescheduleDeadline,
  cancelInfo,
  dropPastSlots,
  localISO,
  nextOpenSlot,
  WEEKDAYS,
  toMinutes,
  toHHMM,
  startOfDayUTC,
  weekdayOf,
  slotsForDay,
};
