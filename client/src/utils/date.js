/**
 * Bookings store `date` as UTC midnight (startOfDayUTC on the server).
 * Formatting in the viewer's local zone would shift it a day west of UTC,
 * so every booking date is rendered in UTC.
 */
export const formatBookingDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { timeZone: 'UTC' });
};

export const formatBookingDateTime = (value, time) =>
  [formatBookingDate(value), time].filter(Boolean).join(' at ');
