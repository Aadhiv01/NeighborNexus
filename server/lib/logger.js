const pino = require('pino');
const { isProduction } = require('./config');

// Structured JSON in production, readable output in development.
module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isProduction
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } } }),
  redact: ['req.headers.authorization'],
});
