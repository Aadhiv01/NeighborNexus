const nodemailer = require('nodemailer');
const config = require('./config');
const logger = require('./logger');

// Without SMTP_URL this is a "json" transport: the message is built but nothing leaves the machine.
const transport = config.SMTP_URL
  ? nodemailer.createTransport(config.SMTP_URL)
  : nodemailer.createTransport({ jsonTransport: true });

/** Best effort. A failed email must never break the request that caused it. */
async function sendMail({ to, subject, text }) {
  try {
    const info = await transport.sendMail({ from: config.MAIL_FROM, to, subject, text });
    if (!config.SMTP_URL) logger.debug({ to, subject }, 'email built, not sent (SMTP_URL is not set)');
    return info;
  } catch (err) {
    logger.warn({ err, to, subject }, 'email failed');
    return null;
  }
}

module.exports = { sendMail };
