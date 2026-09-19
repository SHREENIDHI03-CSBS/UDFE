const test = require('node:test');
const assert = require('node:assert/strict');

// Ensure a clean DB-less config path: point DB_PATH at a throwaway file so
// scoringConfigService falls back to the shipped risk_bands.yaml.
process.env.DB_PATH = require('path').join(__dirname, 'tmp-riskband.db');

const { getBandForScore, getAllBands } = require('../src/services/riskBand');

test('score 0 maps to Very Low band', () => {
  const band = getBandForScore(0);
  assert.equal(band.key, 'VERY_LOW');
});

test('score 50 maps to Medium band', () => {
  const band = getBandForScore(50);
  assert.equal(band.key, 'MEDIUM');
});

test('score 61 maps to High band (lower boundary)', () => {
  const band = getBandForScore(61);
  assert.equal(band.key, 'HIGH');
});

test('score 100 maps to Critical band', () => {
  const band = getBandForScore(100);
  assert.equal(band.key, 'CRITICAL');
});

test('band ranges are contiguous and cover 0-100', () => {
  const bands = getAllBands().slice().sort((a, b) => a.min - b.min);
  assert.equal(bands[0].min, 0);
  assert.equal(bands[bands.length - 1].max, 100);
  for (let i = 1; i < bands.length; i += 1) {
    assert.equal(bands[i].min, bands[i - 1].max + 1);
  }
});
