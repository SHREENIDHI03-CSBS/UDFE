const db = require('../config/database');
const logger = require('./logger');

const insertStmt = db.prepare(`
  INSERT INTO audit_log (event_type, actor, transaction_id, details)
  VALUES (@event_type, @actor, @transaction_id, @details)
`);

function record(eventType, { actor = 'system', transactionId = null, details = {} } = {}) {
  insertStmt.run({
    event_type: eventType,
    actor,
    transaction_id: transactionId,
    details: JSON.stringify(details),
  });
  logger.info(`AUDIT:${eventType}`, { actor, transactionId, details });
}

function list({ limit = 200 } = {}) {
  return db
    .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?')
    .all(limit)
    .map((r) => ({ ...r, details: JSON.parse(r.details || '{}') }));
}

module.exports = { record, list };
