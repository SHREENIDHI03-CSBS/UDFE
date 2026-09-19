const test = require('node:test');
const assert = require('node:assert/strict');
const { validateMergedRecord } = require('../src/services/validation');

test('record with no transactionId fails validation', () => {
  const { valid, errors } = validateMergedRecord({ transactionId: null, af: {}, ff: null, ph: null });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('transactionId')));
});

test('record with transactionId but no AF/FF/PH payload fails validation', () => {
  const { valid, errors } = validateMergedRecord({ transactionId: 'TXN-X', af: null, ff: null, ph: null });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('No signal-group payload')));
});

test('record with only PH payload is valid (partial evidence allowed)', () => {
  const { valid } = validateMergedRecord({ transactionId: 'TXN-X', af: null, ff: null, ph: { localListing: 'blacklist' } });
  assert.equal(valid, true);
});

test('record with corrupt fund-flow numerics fails validation', () => {
  const { valid, errors } = validateMergedRecord({
    transactionId: 'TXN-X',
    af: null,
    ff: { totalSent: NaN, remainingBalance: 100 },
    ph: null,
  });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('totalSent')));
});
