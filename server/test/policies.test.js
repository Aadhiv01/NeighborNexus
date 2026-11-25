process.env.JWT_SECRET ||= 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const { rescheduleDeadline, cancelInfo, bookingStart } = require('../modules/bookings/slots');

const booking = { date: new Date('2026-12-10T00:00:00Z'), startTime: '09:00' };
const HOUR = 3600 * 1000;

test('rescheduling closes the chosen number of hours before the start', () => {
  assert.equal(rescheduleDeadline(booking, 12).getTime(), bookingStart(booking).getTime() - 12 * HOUR);
  assert.equal(rescheduleDeadline(booking, 0).getTime(), bookingStart(booking).getTime());
});

test('a cancellation records who, when, and how many hours before the start', () => {
  const now = new Date(bookingStart(booking).getTime() - 5 * HOUR);
  const info = cancelInfo(booking, 'provider', now);
  assert.equal(info.status, 'canceled');
  assert.equal(info.canceledBy, 'provider');
  assert.equal(info.canceledHoursBefore, 5);
  assert.equal(info.canceledAt, now);
});

test('canceling after the start gives a negative number of hours', () => {
  const now = new Date(bookingStart(booking).getTime() + 2 * HOUR);
  assert.equal(cancelInfo(booking, 'member', now).canceledHoursBefore, -2);
});
