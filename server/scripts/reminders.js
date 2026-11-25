/**
 * Sends any reminders that are due, then exits. Handy from cron or a scheduler when the web
 * process runs with REMINDERS=off:
 *
 *   npm run reminders
 */
require('../lib/config');
const mongoose = require('mongoose');
const config = require('../lib/config');
const { sendDueReminders } = require('../modules/notifications/reminders');

(async () => {
  await mongoose.connect(config.MONGO_URI);
  const sent = await sendDueReminders();
  console.log(`Sent ${sent} reminder${sent === 1 ? '' : 's'}`);
  await mongoose.connection.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
