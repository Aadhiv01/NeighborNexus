// routes/serviceProviderRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ServiceProvider = require('../models/ServiceProvider');
const User = require('../models/User');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware

// GET /api/services
// Fetch all services for a service provider
router.get('/', auth, async (req, res) => {
  try {
    const serviceProvider = await ServiceProvider.findOne({ userId: req.user._id });
    if (!serviceProvider) {
      return res.status(404).json({ message: 'Service provider not found' });
    }
    res.json(serviceProvider.services);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/services
// Add a new service
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, description, price } = req.body;

    console.log('Request body:', req.body);
    console.log('User ID from auth:', req.user._id);

    const serviceProvider = await ServiceProvider.findOne({
      userId: req.user._id
    });

    console.log('Found service provider:', serviceProvider);

    const newService = { name, category, description, price };
    serviceProvider.services.push(newService);
    await serviceProvider.save();

    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/services/:serviceId
// Edit an existing service
router.put('/:serviceId', auth, async (req, res) => {
  try {
    const { name, category, description, price } = req.body;
    const serviceProvider = await ServiceProvider.findOne({ userId: req.user.id });
    
    if (!serviceProvider) {
      return res.status(404).json({ message: 'Service provider not found' });
    }

    const serviceIndex = serviceProvider.services.findIndex(
      service => service._id.toString() === req.params.serviceId
    );

    if (serviceIndex === -1) {
      return res.status(404).json({ message: 'Service not found' });
    }

    serviceProvider.services[serviceIndex] = { 
      ...serviceProvider.services[serviceIndex], 
      name, 
      category, 
      description, 
      price 
    };

    await serviceProvider.save();
    res.json(serviceProvider.services[serviceIndex]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/services/:serviceId
// Delete a service
router.delete('/:serviceId', auth, async (req, res) => {
  try {
    const serviceProvider = await ServiceProvider.findOne({ userId: req.user.id });
    
    if (!serviceProvider) {
      return res.status(404).json({ message: 'Service provider not found' });
    }

    serviceProvider.services = serviceProvider.services.filter(
      service => service._id.toString() !== req.params.serviceId
    );

    await serviceProvider.save();
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/services/availability
// Fetch availability for a service provider
router.get('/availability', auth, async (req, res) => {
  try {
    const serviceProvider = await ServiceProvider.findOne({ userId: req.user.id });
    if (!serviceProvider) {
      return res.status(404).json({ message: 'Service provider not found' });
    }
    res.json(serviceProvider.availability);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/services/availability
// Add or update availability
router.post('/availability', auth, async (req, res) => {
  try {
    const { day, slots } = req.body;
    const serviceProvider = await ServiceProvider.findOne({ userId: req.user.id });
    
    if (!serviceProvider) {
      return res.status(404).json({ message: 'Service provider not found' });
    }

    const availabilityIndex = serviceProvider.availability.findIndex(a => a.day === day);
    if (availabilityIndex !== -1) {
      serviceProvider.availability[availabilityIndex].slots = slots;
    } else {
      serviceProvider.availability.push({ day, slots });
    }

    await serviceProvider.save();
    res.status(201).json(serviceProvider.availability);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/services/bookings
// Fetch all bookings for a service provider
router.get('/bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ serviceProviderId: req.user.id });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/services/bookings
// Add a new booking
router.post('/bookings', auth, async (req, res) => {
  try {
    const { user, date, startTime, endTime } = req.body;
    const newBooking = new Booking({
      user,
      serviceProviderId: req.user.id,
      date,
      startTime,
      endTime
    });
    await newBooking.save();
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/services/bookings/:bookingId
// Update a booking status
router.put('/bookings/:bookingId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.bookingId, serviceProviderId: req.user.id },
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Profile by User ID
router.get('/profile/:userId', auth, async (req, res) => {
    try {
        const serviceProvider = await ServiceProvider.findOne({ userId: req.params.userId });
        if (!serviceProvider) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.json(serviceProvider);
    } catch (error) {
        next(error);
    }
});

// Create or Update Profile
router.post('/profile/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const profileData = req.body;

        let serviceProvider = await ServiceProvider.findOne({ userId });

        if (serviceProvider) {
            // Update existing profile
            serviceProvider = await ServiceProvider.findByIdAndUpdate(serviceProvider._id, profileData, { new: true });
        } else {
            // Create new profile
            profileData.userId = userId;
            serviceProvider = await ServiceProvider.create(profileData);
        }

        res.json(serviceProvider);
    } catch (error) {
        next(error);
    }
});

module.exports = router;