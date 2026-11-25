const mongoose = require('mongoose');

const TYPES = ['booking_created', 'booking_canceled', 'booking_rescheduled', 'booking_completed', 'reminder'];

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TYPES, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 1000 },
    // App route to open when the notification is clicked.
    link: { type: String, default: '' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    readAt: { type: Date },
  },
  { timestamps: true }
);

// Newest first for one user, and a cheap unread count.
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, readAt: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
module.exports.TYPES = TYPES;
