const db = require('../config/database');
const {
  parseAdaptiveFrictionJSON,
  parsePhishingJSON,
  parseFundFlowCSV,
  mergeByTransactionId,
} = require('./parsers');
const { validateMergedRecord } = require('./validation');
const { scoreTransaction } = require('./scoring');
const { generateSTR } = require('./report');
const audit = require('../utils/audit');
const logger = require('../utils/logger');

const upsertStmt = db.prepare(`
  INSERT INTO transactions (
    transaction_id, status, reject_reason, af_subscore, ff_subscore, ph_subscore,
    consolidated_score, risk_band, recommended_actions, explanations,
    raw_af, raw_ff, raw_ph, str_generated, str_path
  ) VALUES (
    @transaction_id, @status, @reject_reason, @af_subscore, @ff_subscore, @ph_subscore,
    @consolidated_score, @risk_band, @recommended_actions, @explanations,
    @raw_af, @raw_ff, @raw_ph, @str_generated, @str_path
  )
  ON CONFLICT(transaction_id) DO UPDATE SET
    status=excluded.status, reject_reason=excluded.reject_reason,
    af_subscore=excluded.af_subscore, ff_subscore=excluded.ff_subscore, ph_subscore=excluded.ph_subscore,
    consolidated_score=excluded.consolidated_score, risk_band=excluded.risk_band,
    recommended_actions=excluded.recommended_actions, explanations=excluded.explanations,
    raw_af=excluded.raw_af, raw_ff=excluded.raw_ff, raw_ph=excluded.raw_ph,
    str_generated=excluded.str_generated, str_path=excluded.str_path
`);

/**
 * Runs the full UFDE pipeline over already-parsed AF/FF/PH record arrays.
 * Returns { processed: [...], rejected: [...] }.
 */
function runPipeline({ afRecords = [], ffRecords = [], phRecords = [] }, { actor = 'system' } = {}) {
  const merged = mergeByTransactionId({ afRecords, ffRecords, phRecords });

  const processed = [];
  const rejected = [];

  merged.forEach((rec) => {
    const { valid, errors } = validateMergedRecord(rec);

    if (!valid) {
      rejected.push({ transactionId: rec.transactionId, errors });
      upsertStmt.run({
        transaction_id: rec.transactionId || `UNKNOWN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: 'REJECTED',
        reject_reason: errors.join(' | '),
        af_subscore: null,
        ff_subscore: null,
        ph_subscore: null,
        consolidated_score: null,
        risk_band: null,
        recommended_actions: null,
        explanations: null,
        raw_af: JSON.stringify(rec.af || null),
        raw_ff: JSON.stringify(rec.ff || null),
        raw_ph: JSON.stringify(rec.ph || null),
        str_generated: 0,
        str_path: null,
      });
      audit.record('REJECT', { actor, transactionId: rec.transactionId, details: { errors } });
      logger.warn('Transaction rejected', { transactionId: rec.transactionId, errors });
      return;
    }

    const scored = scoreTransaction(rec);

    let strGenerated = 0;
    let strPath = null;
    if (scored.band.generatesSTR) {
      const { filePath } = generateSTR(rec, scored, { preparedBy: actor });
      strGenerated = 1;
      strPath = filePath;
      audit.record('STR_GENERATED', { actor, transactionId: rec.transactionId, details: { filePath } });
    }

    upsertStmt.run({
      transaction_id: rec.transactionId,
      status: 'PROCESSED',
      reject_reason: null,
      af_subscore: scored.af.subscore,
      ff_subscore: scored.ff.subscore,
      ph_subscore: scored.ph.subscore,
      consolidated_score: scored.consolidatedScore,
      risk_band: scored.band.key,
      recommended_actions: JSON.stringify(scored.recommendedActions),
      explanations: JSON.stringify(scored.explanations),
      raw_af: JSON.stringify(rec.af || null),
      raw_ff: JSON.stringify(rec.ff || null),
      raw_ph: JSON.stringify(rec.ph || null),
      str_generated: strGenerated,
      str_path: strPath,
    });

    audit.record('SCORE', {
      actor,
      transactionId: rec.transactionId,
      details: { consolidatedScore: scored.consolidatedScore, band: scored.band.key },
    });

    processed.push({ ...scored, strGenerated: !!strGenerated, strPath });
  });

  return { processed, rejected };
}

/**
 * Convenience wrapper: reads the three source files from disk, parses them,
 * and runs the pipeline.
 */
function runPipelineFromFiles({ afPath, ffPath, phPath }, opts = {}) {
  const afRecords = afPath ? parseAdaptiveFrictionJSON(afPath) : [];
  const ffRecords = ffPath ? parseFundFlowCSV(ffPath) : [];
  const phRecords = phPath ? parsePhishingJSON(phPath) : [];

  audit.record('INGEST', {
    actor: opts.actor || 'system',
    details: { afCount: afRecords.length, ffCount: ffRecords.length, phCount: phRecords.length },
  });

  return runPipeline({ afRecords, ffRecords, phRecords }, opts);
}

module.exports = { runPipeline, runPipelineFromFiles };
