process.env.JWT_SECRET ||= 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const { bookingStart, reminderDueAt } = require('../modules/notifications/reminders');

const HOUR = 3600 * 1000;
const booking = (over = {}) => ({ date: new Date('2026-12-10T00:00:00Z'), startTime: '09:00', ...over });
const hoursBefore = (b, h) => new Date(bookingStart(b).getTime() - h * HOUR);

test('booked days ahead: reminder goes out 24 hours before', () => {
  const b = booking();
  b.createdAt = hoursBefore(b, 72);
  assert.equal(reminderDueAt(b).getTime(), hoursBefore(b, 24).getTime());
});

test('booked exactly 24 hours ahead still gets the 24 hour reminder', () => {
  const b = booking();
  b.createdAt = hoursBefore(b, 24);
  assert.equal(reminderDueAt(b).getTime(), hoursBefore(b, 24).getTime());
});

test('booked the same day: reminder goes out 2 hours before', () => {
  const b = booking();
  b.createdAt = hoursBefore(b, 10);
  assert.equal(reminderDueAt(b).getTime(), hoursBefore(b, 2).getTime());
});

test('booked less than 2 hours ahead: no reminder', () => {
  const b = booking();
  b.createdAt = hoursBefore(b, 1);
  assert.equal(reminderDueAt(b), null);
});

test('a reschedule restarts the lead time from the change', () => {
  const b = booking();
  b.createdAt = hoursBefore(b, 500);
  b.reschedules = [{ at: hoursBefore(b, 5) }];
  assert.equal(reminderDueAt(b).getTime(), hoursBefore(b, 2).getTime());
});

test('start time is built from the stored calendar date and HH:mm', () => {
  const s = bookingStart(booking({ startTime: '14:30' }));
  assert.equal([s.getFullYear(), s.getMonth(), s.getDate(), s.getHours(), s.getMinutes()].join(','), '2026,11,10,14,30');
});
