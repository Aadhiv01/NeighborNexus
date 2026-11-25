const { rateLimit } = require('express-rate-limit');

// Brute-force guard for login and signup. Per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { msg: 'Too many attempts. Try again in a few minutes.' },
});

module.exports = { authLimiter };
