const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);

  if (!token) {
    return fail(res, 401, 'NO_TOKEN', 'Authentication token is required.');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = payload; // { id, email, role, name }
    return next();
  } catch (err) {
    return fail(res, 401, 'INVALID_TOKEN', 'Invalid or expired authentication token.');
  }
}

module.exports = auth;
