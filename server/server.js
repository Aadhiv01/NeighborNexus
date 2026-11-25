const config = require('./lib/config');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const logger = require('./lib/logger');
const authRoutes = require('./modules/auth/auth.routes');
const providerRoutes = require('./modules/providers/provider.routes');
const bookingRoutes = require('./modules/bookings/booking.routes');
const statsRoutes = require('./modules/stats/stats.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const live = require('./lib/live');
const { sendDueReminders } = require('./modules/notifications/reminders');

const app = express();

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === '/health' },
    // Log the essentials only: no headers, no tokens.
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  })
);
app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/serviceprovider', providerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

app.use((req, res) => {
  res.status(404).json({ msg: 'Not found' });
});

// Central error handler. Express 5 forwards rejected promises here, so routes just throw.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Duplicate key from the booking unique index = someone took the slot first.
  if (err.code === 11000) {
    return res.status(409).json({ msg: 'That slot was just booked. Pick another.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ msg: 'Request body is not valid JSON' });
  }
  const status = err.status || 500;
  if (status >= 500) req.log.error({ err }, 'request failed');
  res.status(status).json({ msg: status >= 500 ? 'Server error' : err.message });
});

async function start() {
  try {
    await mongoose.connect(config.MONGO_URI);
    logger.info(`Database connected: ${mongoose.connection.name}`);
  } catch (err) {
    logger.fatal({ err }, 'Database connection failed');
    process.exit(1);
  }

  const server = app.listen(config.PORT, () => {
    logger.info(`Server running on http://localhost:${config.PORT}`);
  });

  // Reminders: check every minute. Each booking is claimed atomically, so running this on
  // several instances is safe, and REMINDERS=off turns it off for an instance.
  let reminderTimer;
  if (config.REMINDERS === 'on') {
    const run = () => sendDueReminders().catch((err) => logger.error({ err }, 'reminder run failed'));
    run();
    reminderTimer = setInterval(run, 60 * 1000);
    reminderTimer.unref();
  }

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down.`);
    clearInterval(reminderTimer);
    live.closeAll(); // open streams would otherwise keep server.close() waiting
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
