const fs = require('fs');
const { parse } = require('csv-parse/sync');

/**
 * Parse an Adaptive-Friction JSON file (array of records).
 */
function parseAdaptiveFrictionJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Adaptive Friction file must contain a JSON array');
  return data;
}

/**
 * Parse a Phishing-Sites JSON file (array of records).
 */
function parsePhishingJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Phishing Sites file must contain a JSON array');
  return data;
}

/**
 * Parse a Fund-Flow CSV file into an array of row objects.
 */
function parseFundFlowCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records.map((r) => ({
    transactionId: r.TransactionId,
    recordId: r.RecordId,
    currency: r.Currency,
    inDegree: r.InDegree === '' ? null : Number(r.InDegree),
    outDegree: r.OutDegree === '' ? null : Number(r.OutDegree),
    remainingBalance: r.RemainingBalance === '' ? null : Number(r.RemainingBalance),
    totalSent: r.TotalSent === '' ? null : Number(r.TotalSent),
    holdingMinutes: r.HoldingMinutes === '' ? null : Number(r.HoldingMinutes),
  }));
}

/**
 * Merge AF, FF, PH record sets by transactionId into one map:
 *  { [transactionId]: { af, ff, ph } }
 */
function mergeByTransactionId({ afRecords = [], ffRecords = [], phRecords = [] }) {
  const merged = new Map();

  const ensure = (txnId) => {
    if (!merged.has(txnId)) merged.set(txnId, { transactionId: txnId, af: null, ff: null, ph: null });
    return merged.get(txnId);
  };

  afRecords.forEach((rec) => {
    if (!rec.transactionId) return;
    ensure(rec.transactionId).af = rec;
  });
  ffRecords.forEach((rec) => {
    if (!rec.transactionId) return;
    ensure(rec.transactionId).ff = rec;
  });
  phRecords.forEach((rec) => {
    if (!rec.transactionId) return;
    ensure(rec.transactionId).ph = rec;
  });

  return Array.from(merged.values());
}

module.exports = {
  parseAdaptiveFrictionJSON,
  parsePhishingJSON,
  parseFundFlowCSV,
  mergeByTransactionId,
};
