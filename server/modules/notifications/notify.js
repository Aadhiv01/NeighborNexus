const config = require('../../lib/config');
const logger = require('../../lib/logger');
const { sendMail } = require('../../lib/mailer');
const { formatDate, formatTime } = require('../../lib/format');
const Notification = require('./notification.model');
const User = require('../users/user.model');
const ServiceProvider = require('../providers/provider.model');

/** Creates an in-app notification and emails the same message. Never throws. */
async function notify(userId, { type, title, body = '', link = '', booking }) {
  try {
    const n = await Notification.create({ user: userId, type, title, body, link, booking });
    const user = await User.findById(userId).select('email').lean();
    if (user?.email) {
      // Not awaited: the request should not wait on a mail server.
      sendMail({ to: user.email, subject: title, text: `${body}\n\n${config.APP_URL}${link}` });
    }
    return n;
  } catch (err) {
    logger.warn({ err, userId, type }, 'could not create notification');
    return null;
  }
}

const MEMBER_LINK = '/bookings';
const PROVIDER_LINK = '/dashboard/serviceprovider/bookings';

/** Who is involved in a booking, and a one-line description of it. */
async function context(booking) {
  const [provider, member] = await Promise.all([
    ServiceProvider.findById(booking.serviceProviderId).select('userId name').lean(),
    User.findById(booking.user?._id ?? booking.user).select('name').lean(),
  ]);
  const when = `${formatDate(booking.date)} at ${formatTime(booking.startTime)}`;
  return { provider, member, service: booking.serviceName || 'a service', when };
}

/**
 * Tells the other side about something that happened to a booking.
 * `by` is who did it: the member or the provider.
 */
async function notifyBooking(booking, event, { by, was } = {}) {
  try {
    return await notifyBookingUnsafe(booking, event, { by, was });
  } catch (err) {
    logger.warn({ err, event }, 'could not notify about booking');
    return null;
  }
}

async function notifyBookingUnsafe(booking, event, { by, was }) {
  const { provider, member, service, when } = await context(booking);
  if (!provider || !member) return;
  const ids = { booking: booking._id };

  if (event === 'created') {
    return notify(provider.userId, { type: 'booking_created', title: 'New booking', body: `${member.name} booked ${service} for ${when}.`, link: PROVIDER_LINK, ...ids });
  }
  if (event === 'rescheduled') {
    return notify(provider.userId, { type: 'booking_rescheduled', title: 'Booking rescheduled', body: `${member.name} moved ${service} from ${was} to ${when}.`, link: PROVIDER_LINK, ...ids });
  }
  if (event === 'completed') {
    return notify(booking.user?._id ?? booking.user, { type: 'booking_completed', title: 'Job marked complete', body: `${provider.name} marked ${service} on ${when} as complete.`, link: MEMBER_LINK, ...ids });
  }
  if (event === 'canceled') {
    return by === 'provider'
      ? notify(booking.user?._id ?? booking.user, { type: 'booking_canceled', title: 'Your booking was canceled', body: `${provider.name} canceled ${service} on ${when}.`, link: MEMBER_LINK, ...ids })
      : notify(provider.userId, { type: 'booking_canceled', title: 'Booking canceled', body: `${member.name} canceled ${service} on ${when}.`, link: PROVIDER_LINK, ...ids });
  }
  if (event === 'reminder') {
    await notify(booking.user?._id ?? booking.user, { type: 'reminder', title: `Reminder: ${service} with ${provider.name}`, body: `${when}.`, link: MEMBER_LINK, ...ids });
    await notify(provider.userId, { type: 'reminder', title: `Upcoming: ${service} with ${member.name}`, body: `${when}.`, link: PROVIDER_LINK, ...ids });
  }
}

module.exports = { notify, notifyBooking };
