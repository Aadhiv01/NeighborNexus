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

module.exports = {
  WEEKDAYS,
  toMinutes,
  toHHMM,
  startOfDayUTC,
  weekdayOf,
  slotsForDay,
};
