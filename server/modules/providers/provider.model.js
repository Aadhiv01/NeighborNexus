const mongoose = require('mongoose');

const AvailabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      lowercase: true,
      enum: [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ],
    },
    slots: {
      type: [{ start: String, end: String }],
      default: [],
    },
  },
  { _id: false }
);

const ReviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true, maxlength: 2000 },
    rating: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, default: '', maxlength: 2000 },
  price: { type: Number, required: true, min: 0 },
  durationMinutes: { type: Number, default: 60, min: 15 },
});

const ServiceProviderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    profilePicture: {
      type: String,
      default:
        'https://cdn1.iconfinder.com/data/icons/avatars-1-5/136/87-512.png',
    },
    bio: { type: String, default: '', maxlength: 2000 },
    experience: { type: Number, default: 0, min: 0 },
    services: { type: [ServiceSchema], default: [] },
    availability: { type: [AvailabilitySchema], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: [ReviewSchema], default: [] },
    socialLinks: {
      facebook: String,
      twitter: String,
      linkedin: String,
    },
    contactInfo: {
      phone: String,
      email: String,
    },
    location: { type: String, trim: true },
    availableForEmergency: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Recompute a provider's average rating from its reviews.
ServiceProviderSchema.methods.recalculateRating = function recalculateRating() {
  if (!this.reviews.length) {
    this.rating = 0;
    return this.rating;
  }
  const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
  this.rating = Math.round((total / this.reviews.length) * 10) / 10;
  return this.rating;
};

ServiceProviderSchema.index({ location: 1 });
ServiceProviderSchema.index({ 'services.category': 1 });

module.exports = mongoose.model(
  'ServiceProvider',
  ServiceProviderSchema,
  'serviceprovider'
);
