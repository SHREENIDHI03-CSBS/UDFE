const test = require('node:test');
const assert = require('node:assert/strict');
const {
  scoreAdaptiveFriction,
  scoreFundFlow,
  scorePhishing,
} = require('../src/services/fraudScoringService');

const AF_WEIGHTS = { AF1_deviceFingerprintDelta: 50, AF2_geoDistance: 30, AF3_amountVsHistoricMean: 20 };
const FF_WEIGHTS = { FF1_balancedFlow: 45, FF2_nearZeroRetainedBalance: 30, FF3_shortHoldingTime: 25 };
const PH_WEIGHTS = { PH1_domainAge: 40, PH2_certificateQuality: 30, PH3_blacklistHit: 30 };

test('AF: identical device fingerprint scores AF1 = 0', () => {
  const af = {
    liveTransaction: {
      amount: 100,
      deviceFingerprint: { os: 'A', browser: 'B', ipAddress: 'C', userAgent: 'D' },
      distanceKm: 0,
    },
    storedProfile: {
      historicalAvgAmount: 100,
      knownDeviceFingerprint: { os: 'A', browser: 'B', ipAddress: 'C', userAgent: 'D' },
    },
  };
  const result = scoreAdaptiveFriction(af, AF_WEIGHTS);
  assert.equal(result.factors.AF1_deviceFingerprintDelta, 0);
  assert.equal(result.subscore, 0);
});

test('AF: different device fingerprint triggers AF1 = 1', () => {
  const af = {
    liveTransaction: {
      amount: 100,
      deviceFingerprint: { os: 'Android', browser: 'Chrome', ipAddress: '1.1.1.1', userAgent: 'X' },
      distanceKm: 0,
    },
    storedProfile: {
      historicalAvgAmount: 100,
      knownDeviceFingerprint: { os: 'iOS', browser: 'Safari', ipAddress: '2.2.2.2', userAgent: 'Y' },
    },
  };
  const result = scoreAdaptiveFriction(af, AF_WEIGHTS);
  assert.equal(result.factors.AF1_deviceFingerprintDelta, 1);
});

test('AF: missing device fingerprint gracefully skips AF1 without crashing', () => {
  const af = { liveTransaction: { amount: 4420 }, storedProfile: { historicalAvgAmount: 1700 } };
  const result = scoreAdaptiveFriction(af, AF_WEIGHTS);
  assert.equal(result.factors.AF1_deviceFingerprintDelta, null);
  assert.equal(result.factors.AF2_geoDistance, null);
  assert.ok(result.subscore > 0); // AF3 should still contribute
});

test('FF: balanced in/out degree gives low FF1 risk factor', () => {
  const ff = { inDegree: 10, outDegree: 10, remainingBalance: 500, totalSent: 1000, holdingMinutes: 120 };
  const result = scoreFundFlow(ff, FF_WEIGHTS);
  assert.equal(result.factors.FF1_balancedFlow, 0);
});

test('FF: near-zero retained balance approaches FF2 = 1', () => {
  const ff = { inDegree: 5, outDegree: 5, remainingBalance: 10, totalSent: 1000, holdingMinutes: 120 };
  const result = scoreFundFlow(ff, FF_WEIGHTS);
  assert.ok(result.factors.FF2_nearZeroRetainedBalance > 0.9);
});

test('FF: holding time over 60 minutes clips FF3 to 0', () => {
  const ff = { inDegree: 5, outDegree: 5, remainingBalance: 500, totalSent: 1000, holdingMinutes: 500 };
  const result = scoreFundFlow(ff, FF_WEIGHTS);
  assert.equal(result.factors.FF3_shortHoldingTime, 0);
});

test('PH: self-signed certificate triggers PH2 = 1', () => {
  const ph = {
    submittedAt: '2026-07-15T10:00:00Z',
    domain: { registrationDate: '2026-01-01T00:00:00Z' },
    certificate: { selfSigned: true, validFrom: '2026-07-14T00:00:00Z', validTo: '2026-08-14T00:00:00Z' },
    localListing: 'none',
  };
  const result = scorePhishing(ph, PH_WEIGHTS);
  assert.equal(result.factors.PH2_certificateQuality, 1);
});

test('PH: blacklist listing triggers PH3 = 1', () => {
  const ph = {
    submittedAt: '2026-07-15T10:00:00Z',
    domain: { registrationDate: '2020-01-01T00:00:00Z' },
    certificate: { selfSigned: false, validFrom: '2026-01-01T00:00:00Z', validTo: '2027-01-01T00:00:00Z' },
    localListing: 'blacklist',
  };
  const result = scorePhishing(ph, PH_WEIGHTS);
  assert.equal(result.factors.PH3_blacklistHit, 1);
});

test('PH: old domain, whitelisted, valid cert -> low sub-score', () => {
  const ph = {
    submittedAt: '2026-07-15T10:00:00Z',
    domain: { registrationDate: '2015-01-01T00:00:00Z' },
    certificate: { selfSigned: false, validFrom: '2026-01-01T00:00:00Z', validTo: '2027-01-01T00:00:00Z' },
    localListing: 'whitelist',
  };
  const result = scorePhishing(ph, PH_WEIGHTS);
  assert.ok(result.subscore < 10);
});
