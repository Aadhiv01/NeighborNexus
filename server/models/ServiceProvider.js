const mongoose = require('mongoose');

// Availability Schema
const AvailabilitySchema = new mongoose.Schema({
    day: { type: String, required: true },
    slots: [{ start: String, end: String }] // e.g., [{ start: '09:00', end: '10:00' }]
});

// Review Schema
const ReviewSchema = new mongoose.Schema({
    customer: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 }
});

// Service Schema
const ServiceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true }
});

// Main ServiceProvider Schema
const ServiceProviderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    profilePicture: { type: String, default: 'https://cdn1.iconfinder.com/data/icons/avatars-1-5/136/87-512.png' },
    bio: { type: String },
    experience: { type: Number }, // Years in the industry
    services: [ServiceSchema], // Array of services offered
    availability: [AvailabilitySchema], // Array of availability slots
    rating: { type: Number, default: 0 }, // Overall rating
    reviews: [ReviewSchema], // Array of client reviews
    socialLinks: { // Social media links
        facebook: { type: String },
        twitter: { type: String },
        linkedin: { type: String }
    },
    contactInfo: {
        phone: { type: String },
        email: { type: String }
    },
    location: { type: String }, // Service area (e.g., Greater Toronto Area)
    availableForEmergency: { type: Boolean, default: false } // Emergency service flag
});

module.exports = mongoose.model('ServiceProvider', ServiceProviderSchema, 'serviceprovider');
