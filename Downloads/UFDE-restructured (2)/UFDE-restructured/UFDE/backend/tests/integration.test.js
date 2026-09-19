const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const TMP_DB = path.join(__dirname, 'tmp-integration.db');
process.env.DB_PATH = TMP_DB;
['', '-wal', '-shm'].forEach((s) => { if (fs.existsSync(TMP_DB + s)) fs.unlinkSync(TMP_DB + s); });

const { initDatabase } = require('../src/database/init');
initDatabase();

const { runPipelineFromFiles } = require('../src/services/pipeline');
const Transaction = require('../src/models/Transaction');
const { exportJSON } = require('../src/services/exportService');

const SAMPLE_DIR = path.join(__dirname, '..', 'sample-data');

test('full-suite input packet (AF+FF+PH sample data) processes all 7 transactions', () => {
  const { processed, rejected } = runPipelineFromFiles(
    {
      afPath: path.join(SAMPLE_DIR, 'Adaptive_Friction.json'),
      ffPath: path.join(SAMPLE_DIR, 'FundFlow.csv'),
      phPath: path.join(SAMPLE_DIR, 'Phishing_Sites.json'),
    },
    { actor: 'integration-test' }
  );

  assert.equal(processed.length + rejected.length, 7);
  processed.forEach((p) => {
    assert.ok(p.consolidatedScore >= 0 && p.consolidatedScore <= 100);
    assert.ok(p.band && p.band.key);
    assert.ok(Array.isArray(p.explanations) && p.explanations.length > 0);
  });

  // At least one of the sample transactions (blacklisted + self-signed +
  // brand-new domain, e.g. TXN-2026-05) should land in a High/Critical band.
  const highOrCritical = processed.filter((p) => ['HIGH', 'CRITICAL'].includes(p.band.key));
  assert.ok(highOrCritical.length >= 1);

  const allRows = Transaction.all();
  assert.equal(allRows.length, processed.length + rejected.length);
});

test('JSON export produces a readable file with all processed transactions', () => {
  const rows = Transaction.all();
  const filePath = exportJSON(rows, 'integration-test-export');
  assert.ok(fs.existsSync(filePath));
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  assert.equal(parsed.length, rows.length);
});
