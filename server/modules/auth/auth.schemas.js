const { z } = require('zod');

const email = z
  .string('Please include a valid email')
  .trim()
  .toLowerCase()
  .pipe(z.email('Please include a valid email'));

const login = z.object({
  email,
  password: z.string('Password is required').min(1, 'Password is required'),
});

const signup = z.object({
  firstName: z.string('First name is required').trim().min(1, 'First name is required'),
  lastName: z.string('Last name is required').trim().min(1, 'Last name is required'),
  email,
  password: z.string('Password is required').min(8, 'Password must be at least 8 characters'),
  type: z.enum(['Community Member', 'Service Provider'], 'User type is required'),
});

module.exports = { login, signup };
