require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const serviceProviderRoutes = require('./routes/serviceprovider');
const bookingRoutes = require('./routes/booking');

const app = express();

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/NeighborNexus';
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/serviceprovider', serviceProviderRoutes);
app.use('/api/bookings', bookingRoutes);

// 404 for anything unmatched
app.use((req, res) => {
  res.status(404).json({ msg: 'Not found' });
});

// Central error handler. Every route can just `throw` or call next(err).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Duplicate key from the booking unique index = someone took the slot first.
  if (err.code === 11000) {
    return res.status(409).json({ msg: 'That slot was just booked. Pick another.' });
  }
  console.error(err);
  res.status(err.status || 500).json({ msg: err.message || 'Server error' });
});

async function start() {
  if (!process.env.JWT_SECRET) {
    console.warn('[warn] JWT_SECRET is not set. Falling back to an insecure default.');
    process.env.JWT_SECRET = 'insecure-dev-secret-change-me';
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Database connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down.`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  start();
}

module.exports = app;
