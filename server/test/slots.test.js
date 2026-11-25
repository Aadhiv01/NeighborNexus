process.env.JWT_SECRET ||= 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const { dropPastSlots, localISO } = require('../modules/bookings/slots');

const slots = [{ start: '09:00', end: '10:00' }, { start: '10:30', end: '11:30' }, { start: '14:00', end: '15:00' }];
const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };

test('today: slots that already started are dropped', () => {
  const now = at(10, 15);
  assert.deepEqual(dropPastSlots(slots, localISO(now), now).map((s) => s.start), ['10:30', '14:00']);
});

test('today: a slot starting exactly now is no longer offered', () => {
  const now = at(10, 30);
  assert.deepEqual(dropPastSlots(slots, localISO(now), now).map((s) => s.start), ['14:00']);
});

test('another day: nothing is dropped', () => {
  const now = at(23, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  assert.equal(dropPastSlots(slots, localISO(tomorrow), now).length, 3);
});

test('"today" is the local calendar date, even when UTC has already rolled over', () => {
  const now = at(18, 0);
  assert.equal(dropPastSlots(slots, localISO(now), now).length, 0);
});
