const path = require('path');
const Transaction = require('../models/Transaction');
const { exportJSON, exportCSV } = require('../services/exportService');
const audit = require('../utils/audit');
const { fail } = require('../utils/response');

function download(req, res) {
  const format = (req.params.format || 'json').toLowerCase();
  const rows = Transaction.all();

  let filePath;
  if (format === 'json') {
    filePath = exportJSON(rows);
  } else if (format === 'csv') {
    filePath = exportCSV(rows);
  } else {
    return fail(res, 400, 'VALIDATION_ERROR', 'format must be json or csv.');
  }

  audit.record('EXPORT', { actor: req.user?.email, details: { format, count: rows.length } });

  return res.download(filePath, path.basename(filePath));
}

module.exports = { download };
