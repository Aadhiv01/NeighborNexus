const jwt = require('jsonwebtoken');

/**
 * Verifies the bearer token and normalises the decoded payload onto req.user
 * as { id, type }. Every route relies on `req.user.id` — one convention,
 * no more `_id` vs `id` drift.
 */
module.exports = function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.user || !decoded.user.id) {
      return res.status(401).json({ msg: 'Token payload is invalid' });
    }
    req.user = { id: decoded.user.id, type: decoded.user.type };
    return next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};
