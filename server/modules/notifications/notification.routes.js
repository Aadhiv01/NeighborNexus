const express = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/auth');
const validate = require('../../lib/validate');
const { objectId } = require('../../lib/schema-helpers');
const Notification = require('./notification.model');

const router = express.Router();

// GET /api/notifications: my latest, plus how many are unread
router.get('/', authenticate, async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ user: req.user.id, readAt: { $exists: false } }),
  ]);
  return res.json({ items, unread });
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req, res) => {
  await Notification.updateMany({ user: req.user.id, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  return res.json({ msg: 'All read' });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, validate({ params: z.object({ id: objectId('Invalid notification id') }) }), async (req, res) => {
  // Scoped to the signed-in user, so nobody can mark someone else's notification.
  const n = await Notification.findOneAndUpdate(
    { _id: req.valid.params.id, user: req.user.id },
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean();
  if (!n) return res.status(404).json({ msg: 'Notification not found' });
  return res.json(n);
});

module.exports = router;
