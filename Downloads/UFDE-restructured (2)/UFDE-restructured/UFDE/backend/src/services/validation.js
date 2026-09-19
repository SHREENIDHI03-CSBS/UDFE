const { safeGet } = require('../utils/helpers');

/**
 * A merged record is only fully rejected if it has NO transactionId, or if
 * every one of AF / FF / PH is entirely absent (nothing at all to score).
 * Missing individual fields within a present signal group degrade that
 * specific risk factor gracefully (see fraudScoringService) rather than
 * rejecting the whole transaction, so partial evidence still produces an
 * explainable, auditable score.
 */
function validateMergedRecord(rec) {
  const errors = [];

  if (!rec.transactionId) {
    errors.push('Missing transactionId - record cannot be joined across signal groups.');
  }

  if (!rec.af && !rec.ff && !rec.ph) {
    errors.push('No signal-group payload (AF/FF/PH) found for this transaction.');
  }

  // Flag obviously corrupt fund-flow numerics (e.g. non-numeric after parse)
  if (rec.ff) {
    const { totalSent, remainingBalance } = rec.ff;
    if (totalSent !== null && totalSent !== undefined && Number.isNaN(totalSent)) {
      errors.push('Fund-Flow totalSent is not a valid number.');
    }
    if (remainingBalance !== null && remainingBalance !== undefined && Number.isNaN(remainingBalance)) {
      errors.push('Fund-Flow remainingBalance is not a valid number.');
    }
  }

  if (rec.af) {
    const amount = safeGet(rec.af, ['liveTransaction', 'amount']);
    if (amount !== undefined && amount !== null && Number.isNaN(Number(amount))) {
      errors.push('Adaptive-Friction liveTransaction.amount is not a valid number.');
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateMergedRecord };
