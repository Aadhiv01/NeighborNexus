// routes/serviceProviders.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ServiceProvider = require('../models/ServiceProvider');

// @route   POST api/serviceProviders
// @desc    Register or update service provider profile
// @access  Private
router.post('/', auth, async (req, res) => {
  const { services, availability, bio, experience, contactInfo } = req.body;

  try {
    let serviceProvider = await ServiceProvider.findOne({ userId: req.user.id });
    if (serviceProvider) {
      // Update existing profile
      serviceProvider.services = services || serviceProvider.services;
      serviceProvider.availability = availability || serviceProvider.availability;
      serviceProvider.bio = bio || serviceProvider.bio;
      serviceProvider.experience = experience || serviceProvider.experience;
      serviceProvider.contactInfo = contactInfo || serviceProvider.contactInfo;
      await serviceProvider.save();
      return res.json(serviceProvider);
    }

    // Create new profile
    serviceProvider = new ServiceProvider({
      userId: req.user.id,
      services,
      availability,
      bio,
      experience,
      contactInfo,
    });
    await serviceProvider.save();
    res.json(serviceProvider);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


// @route   PUT api/serviceProviders/availability
// @desc    Update service provider's availability
// @access  Private
router.put('/availability', auth, async (req, res) => {
    const { day, slots } = req.body;
  
    try {
      const serviceProvider = await ServiceProvider.findOne({ userId: req.user.id });
      if (!serviceProvider) {
        return res.status(404).json({ msg: 'Service provider not found' });
      }
  
      const availabilityDay = serviceProvider.availability.find(avail => avail.day === day);
      if (availabilityDay) {
        availabilityDay.slots = slots;
      } else {
        serviceProvider.availability.push({ day, slots });
      }
  
      await serviceProvider.save();
      res.json(serviceProvider);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });  

module.exports = router;
