const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  parseAdaptiveFrictionJSON,
  parsePhishingJSON,
  parseFundFlowCSV,
  mergeByTransactionId,
} = require('../src/services/parsers');

const SAMPLE_DIR = path.join(__dirname, '..', 'sample-data');

test('parses Adaptive Friction JSON into an array', () => {
  const records = parseAdaptiveFrictionJSON(path.join(SAMPLE_DIR, 'Adaptive_Friction.json'));
  assert.ok(Array.isArray(records));
  assert.equal(records.length, 7);
  assert.equal(records[0].transactionId, 'TXN-2026-01');
});

test('parses Phishing Sites JSON into an array', () => {
  const records = parsePhishingJSON(path.join(SAMPLE_DIR, 'Phishing_Sites.json'));
  assert.equal(records.length, 7);
  assert.equal(records[4].localListing, 'blacklist');
});

test('parses Fund-Flow CSV into normalised row objects', () => {
  const records = parseFundFlowCSV(path.join(SAMPLE_DIR, 'FundFlow.csv'));
  assert.equal(records.length, 7);
  assert.equal(records[0].transactionId, 'TXN-2026-01');
  assert.equal(typeof records[0].inDegree, 'number');
  // TXN-2026-04 has an empty InDegree cell in the source CSV -> should parse as null, not crash
  const txn4 = records.find((r) => r.transactionId === 'TXN-2026-04');
  assert.equal(txn4.inDegree, null);
});

test('merges AF/FF/PH by transactionId into unified records', () => {
  const af = parseAdaptiveFrictionJSON(path.join(SAMPLE_DIR, 'Adaptive_Friction.json'));
  const ff = parseFundFlowCSV(path.join(SAMPLE_DIR, 'FundFlow.csv'));
  const ph = parsePhishingJSON(path.join(SAMPLE_DIR, 'Phishing_Sites.json'));
  const merged = mergeByTransactionId({ afRecords: af, ffRecords: ff, phRecords: ph });
  assert.equal(merged.length, 7);
  const first = merged.find((m) => m.transactionId === 'TXN-2026-01');
  assert.ok(first.af && first.ff && first.ph);
});
