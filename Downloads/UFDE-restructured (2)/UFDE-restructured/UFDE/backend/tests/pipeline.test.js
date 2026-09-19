const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

// Isolate this test run in its own throwaway SQLite file.
const TMP_DB = path.join(__dirname, 'tmp-pipeline.db');
process.env.DB_PATH = TMP_DB;
['', '-wal', '-shm'].forEach((s) => { if (fs.existsSync(TMP_DB + s)) fs.unlinkSync(TMP_DB + s); });

const { initDatabase } = require('../src/database/init');
initDatabase();

const { runPipeline } = require('../src/services/pipeline');
const Transaction = require('../src/models/Transaction');

test('pipeline processes a valid transaction end-to-end and persists it', () => {
  const afRecords = [{
    transactionId: 'TXN-TEST-01',
    liveTransaction: { amount: 5000, currency: 'SGD', distanceKm: 10 },
    storedProfile: { historicalAvgAmount: 1000 },
  }];
  const { processed, rejected } = runPipeline({ afRecords, ffRecords: [], phRecords: [] }, { actor: 'test' });

  assert.equal(rejected.length, 0);
  assert.equal(processed.length, 1);
  assert.ok(processed[0].consolidatedScore >= 0 && processed[0].consolidatedScore <= 100);

  const stored = Transaction.findByTransactionId('TXN-TEST-01');
  assert.ok(stored);
  assert.equal(stored.status, 'PROCESSED');
});

test('pipeline rejects and logs a transaction with corrupt fund-flow numerics', () => {
  const ffRecords = [{
    transactionId: 'TXN-TEST-BADFF',
    inDegree: 5,
    outDegree: 5,
    remainingBalance: NaN, // simulates an unparsable CSV cell
    totalSent: 1000,
    holdingMinutes: 10,
  }];
  const { processed, rejected } = runPipeline({ afRecords: [], ffRecords, phRecords: [] }, { actor: 'test' });
  assert.equal(processed.length, 0);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].transactionId, 'TXN-TEST-BADFF');

  const stored = Transaction.findByTransactionId('TXN-TEST-BADFF');
  assert.equal(stored.status, 'REJECTED');
  assert.ok(stored.reject_reason.includes('remainingBalance'));
});

test('pipeline generates an STR for a High/Critical-band transaction', () => {
  const phRecords = [{
    transactionId: 'TXN-TEST-CRITICAL',
    submittedAt: '2026-07-15T10:00:00Z',
    domain: { registrationDate: '2026-07-10T10:00:00Z' },
    certificate: { selfSigned: true, validFrom: '2026-07-14T10:00:00Z', validTo: '2026-07-20T10:00:00Z' },
    localListing: 'blacklist',
  }];
  const afRecords = [{
    transactionId: 'TXN-TEST-CRITICAL',
    liveTransaction: {
      amount: 9000, currency: 'SGD', distanceKm: 3000,
      deviceFingerprint: { os: 'A', browser: 'B', ipAddress: 'C', userAgent: 'D' },
    },
    storedProfile: {
      historicalAvgAmount: 500,
      knownDeviceFingerprint: { os: 'X', browser: 'Y', ipAddress: 'Z', userAgent: 'W' },
    },
  }];
  const { processed } = runPipeline({ afRecords, ffRecords: [], phRecords }, { actor: 'test' });
  assert.equal(processed.length, 1);
  assert.ok(['HIGH', 'CRITICAL'].includes(processed[0].band.key));
  assert.equal(processed[0].strGenerated, true);
  assert.ok(fs.existsSync(processed[0].strPath));
});
