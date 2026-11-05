const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const authenticate = require('../middleware/auth');

const router = express.Router();

const PROVIDER_TYPE = 'Service Provider';
const TOKEN_TTL = '5h';

/** Only identity and role go into the token — never the password hash. */
function signToken(user) {
  return jwt.sign(
    { user: { id: user._id.toString(), type: user.type } },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ msg: errors.array()[0].msg, errors: errors.array() });
  return true;
}

// POST /api/auth — log in
router.post(
  '/',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').isString().notEmpty(),
  ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email: String(email).toLowerCase() }).select(
        '+password'
      );
      if (!user) {
        return res.status(400).json({ msg: 'Email not found' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Incorrect password' });
      }

      return res.json({ token: signToken(user), user: user.toPublic() });
    } catch (err) {
      return next(err);
    }
  }
);

// POST /api/auth/signup — register
router.post(
  '/signup',
  [
    check('firstName', 'First name is required').trim().notEmpty(),
    check('lastName', 'Last name is required').trim().notEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 8 characters').isLength({ min: 8 }),
    check('type', 'User type is required').isIn([
      'Community Member',
      'Service Provider',
    ]),
  ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    const { firstName, lastName, email, password, type } = req.body;
    const normalisedEmail = String(email).toLowerCase();

    try {
      const existing = await User.findOne({ email: normalisedEmail });
      if (existing) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      const name = `${String(firstName).trim()} ${String(lastName).trim()}`;

      const user = await User.create({
        name,
        email: normalisedEmail,
        password: await bcrypt.hash(password, 10),
        type,
      });

      // Every provider gets a profile document up front, so the
      // dashboard never has to handle a missing profile.
      if (type === PROVIDER_TYPE) {
        await ServiceProvider.create({
          userId: user._id,
          name,
          contactInfo: { email: normalisedEmail },
        });
      }

      return res
        .status(201)
        .json({ token: signToken(user), user: user.toPublic() });
    } catch (err) {
      return next(err);
    }
  }
);

// GET /api/auth/verify-token — confirm a token is still good
router.get('/verify-token', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ msg: 'User no longer exists' });
    }
    return res.json({ user: user.toPublic() });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
