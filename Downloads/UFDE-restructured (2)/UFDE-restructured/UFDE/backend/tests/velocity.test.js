const test = require('node:test');
const assert = require('node:assert/strict');
const { checkImpossibleTravel } = require('../src/services/velocityService');

test('fewer than 2 events cannot be evaluated', () => {
  const result = checkImpossibleTravel([{ timestamp: '2026-01-01T00:00:00Z', distanceKm: 0 }]);
  assert.equal(result.triggered, false);
});

test('implausible speed between two events is flagged', () => {
  const events = [
    { timestamp: '2026-01-01T00:00:00Z', distanceKm: 0 },
    { timestamp: '2026-01-01T00:05:00Z', distanceKm: 500 }, // 500km in 5 minutes
  ];
  const result = checkImpossibleTravel(events);
  assert.equal(result.triggered, true);
});

test('plausible speed is not flagged', () => {
  const events = [
    { timestamp: '2026-01-01T00:00:00Z', distanceKm: 0 },
    { timestamp: '2026-01-01T05:00:00Z', distanceKm: 400 }, // 80 km/h over 5 hours
  ];
  const result = checkImpossibleTravel(events);
  assert.equal(result.triggered, false);
});
