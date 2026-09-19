/**
 * Optional helper for impossible-travel / velocity style checks.
 * The supplied synthetic Adaptive-Friction dataset does not include a
 * per-account transaction timeline, so this module is a pluggable stub:
 * if/when a caller supplies a list of prior events for the same account
 * (each with a timestamp and distanceKm from the previous event), it will
 * flag implausible speeds (> maxPlausibleKmh) so a future signal group can
 * fold the result into the risk engine without touching the core pipeline.
 */
function checkImpossibleTravel(events, { maxPlausibleKmh = 900 } = {}) {
  if (!Array.isArray(events) || events.length < 2) {
    return { triggered: false, reason: 'Insufficient event history to evaluate velocity.' };
  }

  const sorted = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const hours = (new Date(cur.timestamp) - new Date(prev.timestamp)) / 3_600_000;
    if (hours <= 0) continue;
    const speedKmh = (cur.distanceKm || 0) / hours;
    if (speedKmh > maxPlausibleKmh) {
      return {
        triggered: true,
        reason: `Implausible travel speed of ${Math.round(speedKmh)} km/h between ${prev.timestamp} and ${cur.timestamp}.`,
      };
    }
  }
  return { triggered: false, reason: 'No implausible travel speed detected.' };
}

module.exports = { checkImpossibleTravel };
