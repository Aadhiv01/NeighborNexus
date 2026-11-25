/**
 * Seeds a local database with a couple of members and several service
 * providers so the app has something to show without manual data entry.
 *
 *   npm run seed
 */
require('../lib/config');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../modules/users/user.model');
const ServiceProvider = require('../modules/providers/provider.model');
const Booking = require('../modules/bookings/booking.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/NeighborNexus';

const WEEK = [
  {
    day: 'monday',
    slots: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ],
  },
  {
    day: 'tuesday',
    slots: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ],
  },
  {
    day: 'wednesday',
    slots: [{ start: '09:00', end: '17:00' }],
  },
  {
    day: 'thursday',
    slots: [
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ],
  },
  {
    day: 'friday',
    slots: [{ start: '09:00', end: '16:00' }],
  },
  {
    day: 'saturday',
    slots: [{ start: '10:00', end: '14:00' }],
  },
];

const PROVIDERS = [
  {
    name: 'Maya Chen',
    email: 'maya@example.com',
    bio: 'Licensed plumber with 12 years of residential experience. Emergency callouts available.',
    location: 'Toronto',
    experience: 12,
    availableForEmergency: true,
    services: [
      {
        name: 'Emergency leak repair',
        category: 'Plumbing',
        description: 'Same-day repair for burst pipes and active leaks.',
        price: 180,
        durationMinutes: 60,
      },
      {
        name: 'Drain cleaning',
        category: 'Plumbing',
        description: 'Clear blocked sinks, showers, and floor drains.',
        price: 120,
        durationMinutes: 60,
      },
    ],
  },
  {
    name: 'Daniel Okafor',
    email: 'daniel@example.com',
    bio: 'Certified electrician. Panel upgrades, EV charger installs, and safety inspections.',
    location: 'North York',
    experience: 8,
    availableForEmergency: false,
    services: [
      {
        name: 'EV charger installation',
        category: 'Electrical',
        description: 'Level 2 home charger supply and install.',
        price: 650,
        durationMinutes: 120,
      },
      {
        name: 'Safety inspection',
        category: 'Electrical',
        description: 'Full residential electrical safety check with report.',
        price: 150,
        durationMinutes: 60,
      },
    ],
  },
  {
    name: 'Priya Raman',
    email: 'priya@example.com',
    bio: 'Deep cleaning and move-out cleans. Eco-friendly products, 6 years experience.',
    location: 'Scarborough',
    experience: 6,
    availableForEmergency: false,
    services: [
      {
        name: 'Move-out deep clean',
        category: 'Cleaning',
        description: 'Full property clean for end-of-lease inspections.',
        price: 220,
        durationMinutes: 120,
      },
      {
        name: 'Standard home clean',
        category: 'Cleaning',
        description: 'Kitchen, bathrooms, floors, and dusting.',
        price: 90,
        durationMinutes: 60,
      },
    ],
  },
  {
    name: 'Tom Alvarez',
    email: 'tom@example.com',
    bio: 'Furniture assembly, shelving, and small repairs. Weekend availability.',
    location: 'Toronto',
    experience: 4,
    availableForEmergency: false,
    services: [
      {
        name: 'Furniture assembly',
        category: 'Handyman',
        description: 'Flat-pack assembly and mounting.',
        price: 70,
        durationMinutes: 60,
      },
    ],
  },
];

const MEMBERS = [
  { name: 'Alex Morgan', email: 'alex@example.com' },
  { name: 'Sam Patel', email: 'sam@example.com' },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  await Promise.all([
    Booking.deleteMany({}),
    ServiceProvider.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  const password = await bcrypt.hash('password123', 10);

  const members = await User.create(
    MEMBERS.map((m) => ({
      ...m,
      password,
      type: 'Community Member',
    }))
  );
  console.log(`Created ${members.length} members`);

  for (const p of PROVIDERS) {
    const { email, services, ...rest } = p;

    const user = await User.create({
      name: p.name,
      email,
      password,
      type: 'Service Provider',
    });

    await ServiceProvider.create({
      ...rest,
      userId: user._id,
      contactInfo: { email },
      availability: WEEK,
      services,
      rating: 4.5,
    });
  }

  console.log(`Created ${PROVIDERS.length} service providers`);
  console.log('\nDemo logins (password: password123)');
  console.log('  Member:   alex@example.com');
  console.log('  Provider: maya@example.com');

  await mongoose.connection.close();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
  process.exit(1);
});
