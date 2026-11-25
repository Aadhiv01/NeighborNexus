const { z } = require('zod');
const { objectId, hhmm } = require('../../lib/schema-helpers');

const isoDate = z
  .string('A valid date is required')
  .refine((v) => /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v)), 'A valid date is required');

const slotsQuery = z.object({
  serviceProviderId: objectId('Invalid serviceProviderId'),
  serviceId: objectId('Invalid serviceId').optional(),
  date: isoDate,
  // When a member is moving a booking, their own current time should show as free.
  excludeBookingId: objectId('Invalid booking id').optional(),
});

const streamQuery = z.object({ serviceProviderId: objectId('Invalid serviceProviderId') });

const create = z.object({
  serviceProviderId: objectId('Invalid serviceProviderId'),
  serviceId: objectId('Invalid serviceId'),
  date: isoDate,
  startTime: hhmm('startTime must be HH:mm'),
  endTime: hhmm('endTime must be HH:mm'),
});

const reschedule = z.object({
  date: isoDate,
  startTime: hhmm('startTime must be HH:mm'),
  endTime: hhmm('endTime must be HH:mm'),
});

const idParam = z.object({ id: objectId('Invalid booking id') });

const statuses = ['upcoming', 'completed', 'canceled'];
const updateStatus = z.object({
  status: z.enum(statuses, `status must be one of ${statuses.join(', ')}`),
  timeSpent: z.coerce.number().min(0).optional(),
});

module.exports = { streamQuery, slotsQuery, create, reschedule, idParam, updateStatus };
