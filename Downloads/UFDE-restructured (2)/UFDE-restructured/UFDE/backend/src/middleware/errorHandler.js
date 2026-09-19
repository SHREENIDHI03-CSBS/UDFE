const logger = require('../utils/logger');
const { fail } = require('../utils/response');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  const status = err.statusCode || 500;
  return fail(res, status, err.code || 'INTERNAL_ERROR', err.message || 'Unexpected server error.');
}

module.exports = errorHandler;
