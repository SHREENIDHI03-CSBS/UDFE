const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const { PATHS } = require('../config/constants');

function ensureExportDir() {
  if (!fs.existsSync(PATHS.EXPORTS)) fs.mkdirSync(PATHS.EXPORTS, { recursive: true });
}

function toFlatRow(txn) {
  return {
    transaction_id: txn.transaction_id,
    status: txn.status,
    reject_reason: txn.reject_reason || '',
    af_subscore: txn.af_subscore,
    ff_subscore: txn.ff_subscore,
    ph_subscore: txn.ph_subscore,
    consolidated_score: txn.consolidated_score,
    risk_band: txn.risk_band,
    recommended_actions: txn.recommended_actions,
    str_generated: !!txn.str_generated,
    str_path: txn.str_path || '',
    created_at: txn.created_at,
  };
}

function exportJSON(transactions, filenamePrefix = 'ufde-export') {
  ensureExportDir();
  const filePath = path.join(PATHS.EXPORTS, `${filenamePrefix}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(transactions.map(toFlatRow), null, 2), 'utf-8');
  return filePath;
}

function exportCSV(transactions, filenamePrefix = 'ufde-export') {
  ensureExportDir();
  const rows = transactions.map(toFlatRow);
  const csv = stringify(rows, { header: true });
  const filePath = path.join(PATHS.EXPORTS, `${filenamePrefix}-${Date.now()}.csv`);
  fs.writeFileSync(filePath, csv, 'utf-8');
  return filePath;
}

module.exports = { exportJSON, exportCSV };
