const db = require('../config/database');
const Transaction = require('../models/Transaction');
const audit = require('../utils/audit');
const { ok, fail } = require('../utils/response');

const ALLOWED_ACTIONS = ['CLEAR_FALSE_POSITIVE', 'TEMPORARY_HOLD', 'ESCALATE_ADMIN', 'FREEZE'];

/**
 * POST /api/actions/:transactionId
 * body: { action: 'CLEAR_FALSE_POSITIVE' | 'TEMPORARY_HOLD' | 'ESCALATE_ADMIN' | 'FREEZE', note?: string }
 * Analyst/Admin-gated at the route level; records the decision in the audit trail.
 */
function applyAction(req, res) {
  const { transactionId } = req.params;
  const { action, note } = req.body || {};

  if (!ALLOWED_ACTIONS.includes(action)) {
    return fail(res, 400, 'VALIDATION_ERROR', `action must be one of: ${ALLOWED_ACTIONS.join(', ')}`);
  }

  const txn = Transaction.findByTransactionId(transactionId);
  if (!txn) return fail(res, 404, 'NOT_FOUND', 'Transaction not found.');

  audit.record('ACTION', {
    actor: req.user?.email,
    transactionId,
    details: { action, note: note || null, previousBand: txn.risk_band },
  });

  return ok(res, { transactionId, action, appliedBy: req.user?.email, note: note || null });
}

module.exports = { applyAction };
