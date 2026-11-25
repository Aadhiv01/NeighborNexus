const { z } = require('zod');

const objectId = (message = 'Invalid id') => z.string(message).regex(/^[a-f\d]{24}$/i, message);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const hhmm = (message) => z.string(message).regex(TIME_RE, message);

module.exports = { objectId, hhmm, TIME_RE };
