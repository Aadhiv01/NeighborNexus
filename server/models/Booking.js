// models/Booking.js
const mongoose = require('mongoose');
const BookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  status: { type: String, enum: ['upcoming', 'completed', 'canceled'], default: 'upcoming' },
  timeSpent: { type: Number },
});
module.exports = mongoose.model('Booking', BookingSchema);