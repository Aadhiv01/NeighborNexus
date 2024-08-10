// models/ServiceProvider.js
const AvailabilitySchema = new mongoose.Schema({
    day: { type: String, required: true }, // e.g., 'Monday', 'Tuesday'
    slots: [{ start: String, end: String }] // e.g., [{ start: '09:00', end: '10:00' }]
  });

const ServiceProviderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    services: [{
      name: { type: String, required: true },
      category: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true }
    }],
    availability: [AvailabilitySchema],
    rating: { type: Number, default: 0 },
    bio: { type: String },
    experience: { type: Number },
    contactInfo: {
      phone: { type: String },
      email: { type: String }
    },
    bookedSlots: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      status: { type: String, enum: ['upcoming', 'completed', 'canceled'], default: 'upcoming' }
    }]
  });
  
  module.exports = mongoose.model('ServiceProvider', ServiceProviderSchema);