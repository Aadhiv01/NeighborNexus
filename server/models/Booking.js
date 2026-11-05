const mongoose = require('mongoose');

const BOOKING_STATUSES = ['upcoming', 'completed', 'canceled'];

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    serviceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Snapshot of the service at booking time. Providers can rename, reprice,
    // or delete a service later; a booking is a historical record and must
    // not change underneath the member.
    // Defaults (not `required`) so bookings written before these fields
    // existed can still be loaded and cancelled without a validation error.
    serviceName: { type: String, default: 'Service' },
    price: { type: Number, default: 0, min: 0 },
    // Normalised to midnight UTC, so one calendar day == one key.
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'upcoming',
    },
    timeSpent: { type: Number, min: 0 },
  },
  { timestamps: true }
);

// The double-booking guard. Two concurrent requests for the same slot
// cannot both win: the second write fails with a duplicate-key error,
// which the error handler turns into a 409. Only 'upcoming' bookings
// occupy a slot, so canceling frees it again.
BookingSchema.index(
  { serviceProviderId: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: 'upcoming' } }
);

BookingSchema.index({ user: 1, date: -1 });
BookingSchema.index({ serviceProviderId: 1, date: -1 });

module.exports = mongoose.model('Booking', BookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
