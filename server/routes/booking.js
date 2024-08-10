// routes/bookings.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');

// @route   POST api/bookings
// @desc    Create a booking
// @access  Private
router.post('/', auth, async (req, res) => {
  const { sserviceProviderId, serviceId, date, startTime, endTime } = req.body;

  try {
    const serviceProvider = await ServiceProvider.findById(serviceProviderId);
    if (!serviceProvider) {
      return res.status(404).json({ msg: 'Service provider not found' });
    }

    // Check for slot availability
    const day = new Date(date).toLocaleString('en-us', { weekday: 'long' });
    const availableSlots = serviceProvider.availability.find(avail => avail.day === day)?.slots;
    const slotAvailable = availableSlots?.some(slot => slot.start === startTime && slot.end === endTime);

    if (!slotAvailable) {
        return res.status(400).json({ msg: 'Selected slot is not available' });
    }

    const booking = new Booking({
      user: req.user.id,
      erviceProviderId,
      serviceId,
      date,
      startTime,
      endTime
    });

    await booking.save();

    // Add to service provider's booked slots
    serviceProvider.bookedSlots.push({
        userId: req.user.id,
        serviceId,
        date,
        startTime,
        endTime,
        status: 'upcoming'
    });

    // Remove booked slot from availability
    serviceProvider.availability.find(avail => avail.day === day)?.slots = 
      availableSlots.filter(slot => slot.start !== startTime || slot.end !== endTime);

    await serviceProvider.save();

    res.json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/bookings
// @desc    Get all bookings for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).populate('service');
    res.json(bookings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    et bookings;
    if (req.user.role === 'serviceProvider') {
      bookings = await Booking.find({ serviceProviderId: req.user.id });
    } else {
      bookings = await Booking.find({ userId: req.user.id });
    }

    res.json(bookings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

/ @route   PUT api/bookings/:id
// @desc    Update booking status
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { status, timeSpent } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    

    const serviceProvider = await ServiceProvider.findById(booking.serviceProviderId);
    if (!serviceProvider) {
      return res.status(404).json({ msg: 'Service provider not found' });
    }

    // Update booking
    booking.status = status;
    if (startTime) booking.startTime = startTime;
    if (endTime) booking.endTime = endTime;
    if (timeSpent) booking.timeSpent = timeSpent;

    await booking.save();

    // Update service provider's availability
    const day = new Date(booking.date).toLocaleString('en-us', { weekday: 'long' });
    const availabilityDay = serviceProvider.availability.find(avail => avail.day === day);
    if (availabilityDay) {
      const index = availabilityDay.slots.findIndex(slot => slot.start === booking.startTime && slot.end === booking.endTime);
      if (index !== -1) {
        availabilityDay.slots.splice(index, 1);
      }
    }

    if (status === 'upcoming') {
      // Free up slot if booking is canceled or completed
      serviceProvider.availability.find(avail => avail.day === day)?.slots.push({ start: booking.startTime, end: booking.endTime });
    }

    if (status === 'completed') {
        booking.timeSpent = timeSpent;
      }
      
      await booking.save();
  
      // Update service provider's availability
      const day = new Date(booking.date).toLocaleString('en-us', { weekday: 'long' });
      const availabilityDay = serviceProvider.availability.find(avail => avail.day === day);
  
      if (status === 'canceled' || status === 'completed') {
        if (availabilityDay) {
          availabilityDay.slots.push({ start: booking.startTime, end: booking.endTime });
        } else {
          serviceProvider.availability.push({
            day,
            slots: [{ start: booking.startTime, end: booking.endTime }]
          });
        }
      }
  
      // Remove booking from booked slots if canceled
      if (status === 'canceled') {
        serviceProvider.bookedSlots = serviceProvider.bookedSlots.filter(slot => slot._id.toString() !== req.params.id);
      }

    await serviceProvider.save();

    res.json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/bookings/:id
// @desc    Delete a booking
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const serviceProvider = await ServiceProvider.findById(booking.serviceProviderId);
    if (!serviceProvider) {
      return res.status(404).json({ msg: 'Service provider not found' });
    }

    // Update booking status to canceled
    booking.status = 'canceled';
    await booking.save();

    // Update service provider's booked slots
    serviceProvider.bookedSlots = serviceProvider.bookedSlots.filter(slot => slot._id.toString() !== req.params.id);

    // Free up the slot in availability
    const day = new Date(booking.date).toLocaleString('en-us', { weekday: 'long' });
    const availabilityDay = serviceProvider.availability.find(avail => avail.day === day);

    if (availabilityDay) {
      availabilityDay.slots.push({ start: booking.startTime, end: booking.endTime });
    } else {
      serviceProvider.availability.push({
        day,
        slots: [{ start: booking.startTime, end: booking.endTime }]
      });
    }

    await serviceProvider.save();

    // Delete the booking from the database
    await Booking.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Booking removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
