const { ROLE_HIERARCHY } = require('../config/constants');
const { fail } = require('../utils/response');

/**
 * requireRole('Analyst') allows Analyst AND Admin (role hierarchy: Admin > Analyst > Viewer).
 */
function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 401, 'NO_TOKEN', 'Authentication required.');

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return fail(
        res,
        403,
        'FORBIDDEN',
        `This action requires the ${minRole} role or higher. Your role: ${req.user.role}.`
      );
    }
    return next();
  };
}

module.exports = { requireRole };
