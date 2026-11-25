const { z } = require('zod');
const { objectId, hhmm } = require('../../lib/schema-helpers');

const service = z.object({
  name: z.string('Service name is required').trim().min(1, 'Service name is required'),
  category: z.string('Category is required').trim().min(1, 'Category is required'),
  description: z.string().max(2000).default(''),
  price: z.coerce.number('Price must be a positive number').min(0, 'Price must be a positive number'),
  durationMinutes: z.coerce.number().int().min(15, 'Duration must be at least 15 minutes').optional(),
});

const serviceUpdate = service.partial();
const serviceIdParam = z.object({ serviceId: objectId('Invalid service id') });

const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const availability = z.object({
  day: z.string().toLowerCase().pipe(z.enum(days, 'Invalid day')),
  slots: z.array(
    z.object({
      start: hhmm('Each window needs a start and end in HH:mm'),
      end: hhmm('Each window needs a start and end in HH:mm'),
    }),
    'slots must be an array'
  ),
});

const searchQuery = z
  .object({
    category: z.string().trim().optional(),
    location: z.string().trim().optional(),
    q: z.string().trim().optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(500).optional(),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), 'Send both lat and lng, or neither');

const userIdParam = z.object({ userId: objectId('Invalid user id') });
const bookingIdParam = z.object({ bookingId: objectId('Invalid booking id') });

const statuses = ['upcoming', 'completed', 'canceled'];
const bookingStatus = z.object({
  status: z.enum(statuses, `status must be one of ${statuses.join(', ')}`),
});

// Doubles as the whitelist: unknown keys (userId, rating, reviews...) are stripped.
const optionalText = z.string().trim().optional();
const profile = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').optional(),
  bio: z.string().max(2000).optional(),
  profilePicture: z.string().optional(),
  experience: z.coerce.number().min(0).optional(),
  socialLinks: z
    .object({ facebook: optionalText, twitter: optionalText, linkedin: optionalText })
    .optional(),
  contactInfo: z.object({ phone: optionalText, email: optionalText }).optional(),
  location: optionalText,
  availableForEmergency: z.boolean().optional(),
  // null clears the location. Stored as a rounded GeoJSON point (see routes).
  geo: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .nullable()
    .optional(),
});

module.exports = {
  service,
  serviceUpdate,
  serviceIdParam,
  availability,
  searchQuery,
  userIdParam,
  bookingIdParam,
  bookingStatus,
  profile,
};
