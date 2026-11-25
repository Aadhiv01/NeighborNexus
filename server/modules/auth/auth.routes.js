const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../users/user.model');
const ServiceProvider = require('../providers/provider.model');
const authenticate = require('../../middleware/auth');
const validate = require('../../lib/validate');
const { authLimiter } = require('../../lib/rate-limit');
const schemas = require('./auth.schemas');

const router = express.Router();

const PROVIDER_TYPE = 'Service Provider';
const TOKEN_TTL = '5h';

/** Only identity and role go into the token, never the password hash. */
function signToken(user) {
  return jwt.sign(
    { user: { id: user._id.toString(), type: user.type } },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// POST /api/auth: log in
router.post('/', authLimiter, validate({ body: schemas.login }), async (req, res) => {
  const { email, password } = req.valid.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) return res.status(400).json({ msg: 'Email not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ msg: 'Incorrect password' });

  return res.json({ token: signToken(user), user: user.toPublic() });
});

// POST /api/auth/signup: register
router.post('/signup', authLimiter, validate({ body: schemas.signup }), async (req, res) => {
  const { firstName, lastName, email, password, type } = req.valid.body;

  if (await User.exists({ email })) {
    return res.status(400).json({ msg: 'User already exists' });
  }

  const name = `${firstName} ${lastName}`;
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    type,
  });

  // Every provider gets a profile document up front, so the
  // dashboard never has to handle a missing profile.
  if (type === PROVIDER_TYPE) {
    await ServiceProvider.create({
      userId: user._id,
      name,
      contactInfo: { email },
    });
  }

  return res.status(201).json({ token: signToken(user), user: user.toPublic() });
});

// GET /api/auth/verify-token: confirm a token is still good
router.get('/verify-token', authenticate, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ msg: 'User no longer exists' });
  return res.json({ user: user.toPublic() });
});

module.exports = router;
