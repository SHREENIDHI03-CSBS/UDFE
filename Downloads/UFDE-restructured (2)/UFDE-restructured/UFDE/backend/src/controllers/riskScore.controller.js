const { runPipeline } = require('../services/pipeline');
const { validateMergedRecord } = require('../services/validation');
const { scoreTransaction } = require('../services/scoring');
const { generateSTR } = require('../services/report');
const audit = require('../utils/audit');
const { ok, fail } = require('../utils/response');

/**
 * POST /risk-score
 * Accepts a single transaction payload: { transactionId, af, ff, ph }
 * (any subset of af/ff/ph may be included) and returns the consolidated
 * risk JSON plus a reference to any STR asset generated.
 */
function postRiskScore(req, res) {
  const { transactionId, af, ff, ph } = req.body || {};
  if (!transactionId) {
    return fail(res, 400, 'VALIDATION_ERROR', 'transactionId is required.');
  }

  const record = { transactionId, af: af || null, ff: ff || null, ph: ph || null };
  const { valid, errors } = validateMergedRecord(record);

  if (!valid) {
    audit.record('REJECT', { actor: req.user?.email, transactionId, details: { errors } });
    return fail(res, 422, 'VALIDATION_FAILED', 'Transaction failed validation.', errors);
  }

  const scored = scoreTransaction(record);

  let str = null;
  if (scored.band.generatesSTR) {
    const generated = generateSTR(record, scored, { preparedBy: req.user?.email || 'api' });
    str = { reportId: generated.reportId, assetRef: `/reports/${generated.reportId}.html` };
    audit.record('STR_GENERATED', { actor: req.user?.email, transactionId, details: str });
  }

  audit.record('SCORE', {
    actor: req.user?.email,
    transactionId,
    details: { consolidatedScore: scored.consolidatedScore, band: scored.band.key },
  });

  return ok(res, {
    transactionId,
    riskScore: scored.consolidatedScore,
    riskBand: scored.band.key,
    riskBandLabel: scored.band.label,
    recommendedActions: scored.recommendedActions,
    subscores: {
      AF: scored.af.subscore,
      FF: scored.ff.subscore,
      PH: scored.ph.subscore,
    },
    explanations: scored.explanations,
    strAsset: str,
  });
}

module.exports = { postRiskScore };
