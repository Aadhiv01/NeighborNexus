process.env.JWT_SECRET ||= 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const { slotsForDay, startOfDayUTC } = require('../modules/bookings/slots');

// 2026-12-09 is a Wednesday.
const week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => ({ day, slots: [{ start: '09:00', end: '12:00' }] }));
const on = (iso, timeOff = [], extra = {}) =>
  slotsForDay({ availability: week, timeOff, date: startOfDayUTC(iso), durationMinutes: 60, ...extra }).map((s) => s.start);

test('without time off, the day is as the weekly hours say', () => {
  assert.deepEqual(on('2026-12-09'), ['09:00', '09:30', '10:00', '10:30', '11:00']);
});

test('a whole day off leaves nothing, and the days either side are untouched', () => {
  const off = [{ startDate: '2026-12-09', endDate: '2026-12-09' }];
  assert.deepEqual(on('2026-12-09', off), []);
  assert.equal(on('2026-12-08', off).length, 5);
  assert.equal(on('2026-12-10', off).length, 5);
});

test('a run of days off covers the first and last day inclusive', () => {
  const off = [{ startDate: '2026-12-08', endDate: '2026-12-10' }];
  for (const d of ['2026-12-08', '2026-12-09', '2026-12-10']) assert.deepEqual(on(d, off), [], d);
  assert.equal(on('2026-12-07', off).length, 5);
  assert.equal(on('2026-12-11', off).length, 5);
});

test('a window off removes the slots that overlap it, and only those', () => {
  const off = [{ startDate: '2026-12-09', endDate: '2026-12-09', startTime: '10:00', endTime: '11:00' }];
  // 9:30 to 10:30 and 10:00 to 11:00 and 10:30 to 11:30 overlap; 9:00 to 10:00 and 11:00 to 12:00 touch only.
  assert.deepEqual(on('2026-12-09', off), ['09:00', '11:00']);
});

test('a window off that ends exactly when a slot starts does not block it', () => {
  const off = [{ startDate: '2026-12-09', endDate: '2026-12-09', startTime: '09:00', endTime: '10:00' }];
  assert.ok(on('2026-12-09', off).includes('10:00'));
  assert.ok(!on('2026-12-09', off).includes('09:30'));
});

test('time off and an existing booking both take their time', () => {
  const off = [{ startDate: '2026-12-09', endDate: '2026-12-09', startTime: '09:00', endTime: '10:00' }];
  const bookings = [{ startTime: '11:00', endTime: '12:00', status: 'upcoming' }];
  assert.deepEqual(on('2026-12-09', off, { bookings }), ['10:00']);
});

test('several entries on one day all apply', () => {
  const off = [
    { startDate: '2026-12-09', endDate: '2026-12-09', startTime: '09:00', endTime: '10:00' },
    { startDate: '2026-12-09', endDate: '2026-12-09', startTime: '11:00', endTime: '12:00' },
  ];
  assert.deepEqual(on('2026-12-09', off), ['10:00']);
});
