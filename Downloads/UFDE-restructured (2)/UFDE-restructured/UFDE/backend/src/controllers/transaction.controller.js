const Transaction = require('../models/Transaction');
const STRReport = require('../models/STRReport');
const audit = require('../utils/audit');
const { ok, fail } = require('../utils/response');

function listTransactions(req, res) {
  const { band, status, limit } = req.query;
  const rows = Transaction.list({ band, status, limit: limit ? Number(limit) : 100 });
  return ok(res, rows);
}

function getTransaction(req, res) {
  const row = Transaction.findByTransactionId(req.params.transactionId);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Transaction not found.');
  return ok(res, row);
}

/**
 * GET /api/transactions/:transactionId/str?format=pdf|docx
 * Streams the STR as a real PDF (default) or Word document, rendered from the
 * stored report model so it always matches the regulator's template.
 */
async function getTransactionReport(req, res) {
  const row = Transaction.findByTransactionId(req.params.transactionId);
  if (!row || !row.str_generated) {
    return fail(res, 404, 'NOT_FOUND', 'No STR report exists for this transaction.');
  }

  const format = String(req.query.format || 'pdf').toLowerCase();
  if (!['pdf', 'docx'].includes(format)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'format must be pdf or docx.');
  }

  const reportId = STRReport.idFromPath(row.str_path);
  if (!reportId) return fail(res, 404, 'NOT_FOUND', 'STR report reference missing.');

  try {
    const rendered = await STRReport.render(reportId, format);
    if (!rendered) return fail(res, 404, 'NOT_FOUND', 'STR report file missing on disk.');

    audit.record('EXPORT', {
      actor: req.user?.email,
      transactionId: row.transaction_id,
      details: { type: 'STR_DOWNLOAD', reportId, format },
    });

    res.setHeader('Content-Type', rendered.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${rendered.fileName}"`);
    res.setHeader('Content-Length', rendered.buffer.length);
    return res.send(rendered.buffer);
  } catch (err) {
    return fail(res, 500, 'REPORT_RENDER_ERROR', `Failed to render STR: ${err.message}`);
  }
}

/** GET /api/transactions/:transactionId/str/model - the raw STR field set. */
function getTransactionReportModel(req, res) {
  const row = Transaction.findByTransactionId(req.params.transactionId);
  if (!row || !row.str_generated) {
    return fail(res, 404, 'NOT_FOUND', 'No STR report exists for this transaction.');
  }
  const model = STRReport.readModel(STRReport.idFromPath(row.str_path));
  if (!model) return fail(res, 404, 'NOT_FOUND', 'STR report file missing on disk.');
  return ok(res, model);
}

module.exports = { listTransactions, getTransaction, getTransactionReport, getTransactionReportModel };
