const { clip01, daysBetween, safeGet, round2 } = require('../utils/helpers');

/* ---------------------------------------------------------------------- *
 *  ADAPTIVE FRICTION (AF)  -  "Is this really you?"
 * ---------------------------------------------------------------------- */
function scoreAdaptiveFriction(af, weights) {
  const factors = {};
  const notes = [];

  if (!af) {
    return { subscore: 0, factors, notes: ['AF payload absent - AF sub-score defaulted to 0.'] };
  }

  const live = af.liveTransaction || {};
  const stored = af.storedProfile || {};
  const liveFp = live.deviceFingerprint;
  const storedFp = stored.knownDeviceFingerprint;

  // AF1 - Device fingerprint delta
  if (liveFp && storedFp) {
    const diff =
      liveFp.os !== storedFp.os ||
      liveFp.browser !== storedFp.browser ||
      liveFp.ipAddress !== storedFp.ipAddress ||
      liveFp.userAgent !== storedFp.userAgent;
    factors.AF1_deviceFingerprintDelta = diff ? 1 : 0;
    notes.push(
      diff
        ? `AF1: device fingerprint differs from stored profile (risk factor 1.0) -> new/unrecognised device or network.`
        : `AF1: device fingerprint matches stored profile (risk factor 0.0).`
    );
  } else {
    factors.AF1_deviceFingerprintDelta = null;
    notes.push('AF1: device fingerprint data unavailable - factor skipped (not counted).');
  }

  // AF2 - Geo distance
  const distanceKm = live.distanceKm;
  if (typeof distanceKm === 'number' && !Number.isNaN(distanceKm)) {
    const f = clip01(distanceKm / 1500);
    factors.AF2_geoDistance = f;
    notes.push(`AF2: distance from last sign-in = ${distanceKm} km -> risk factor ${round2(f)}.`);
  } else {
    factors.AF2_geoDistance = null;
    notes.push('AF2: distanceKm unavailable - factor skipped (not counted).');
  }

  // AF3 - Amount vs historic mean
  const amount = live.amount;
  const mean = stored.historicalAvgAmount;
  if (typeof amount === 'number' && typeof mean === 'number' && mean !== 0) {
    const f = clip01((amount - mean) / mean);
    factors.AF3_amountVsHistoricMean = f;
    notes.push(
      `AF3: amount ${amount} vs historic average ${mean} -> risk factor ${round2(f)}.`
    );
  } else {
    factors.AF3_amountVsHistoricMean = null;
    notes.push('AF3: amount or historicalAvgAmount unavailable - factor skipped (not counted).');
  }

  const subscore = weightedSum(factors, weights);
  return { subscore: round2(subscore), factors, notes };
}

/* ---------------------------------------------------------------------- *
 *  FUND FLOW (FF)  -  "Is the money acting like a mule account?"
 * ---------------------------------------------------------------------- */
function scoreFundFlow(ff, weights) {
  const factors = {};
  const notes = [];

  if (!ff) {
    return { subscore: 0, factors, notes: ['FF payload absent - FF sub-score defaulted to 0.'] };
  }

  const { inDegree, outDegree, remainingBalance, totalSent, holdingMinutes } = ff;

  // FF1 - Balanced flow, in ~ out : risk = 1 - (smaller/larger)
  if (
    typeof inDegree === 'number' && !Number.isNaN(inDegree) &&
    typeof outDegree === 'number' && !Number.isNaN(outDegree) &&
    inDegree > 0 && outDegree > 0
  ) {
    const smaller = Math.min(inDegree, outDegree);
    const larger = Math.max(inDegree, outDegree);
    const f = clip01(1 - smaller / larger);
    factors.FF1_balancedFlow = f;
    notes.push(
      `FF1: InDegree=${inDegree}, OutDegree=${outDegree} -> imbalance risk factor ${round2(f)}.`
    );
  } else {
    factors.FF1_balancedFlow = null;
    notes.push('FF1: InDegree/OutDegree unavailable or zero - factor skipped (not counted).');
  }

  // FF2 - Near-zero retained balance
  if (typeof remainingBalance === 'number' && typeof totalSent === 'number' && totalSent > 0) {
    const f = clip01(1 - remainingBalance / totalSent);
    factors.FF2_nearZeroRetainedBalance = f;
    notes.push(
      `FF2: RemainingBalance=${remainingBalance} / TotalSent=${totalSent} -> risk factor ${round2(f)}.`
    );
  } else {
    factors.FF2_nearZeroRetainedBalance = null;
    notes.push('FF2: RemainingBalance/TotalSent unavailable - factor skipped (not counted).');
  }

  // FF3 - Short holding time
  if (typeof holdingMinutes === 'number' && !Number.isNaN(holdingMinutes)) {
    const f = clip01(1 - holdingMinutes / 60);
    factors.FF3_shortHoldingTime = f;
    notes.push(`FF3: HoldingMinutes=${holdingMinutes} -> risk factor ${round2(f)}.`);
  } else {
    factors.FF3_shortHoldingTime = null;
    notes.push('FF3: HoldingMinutes unavailable - factor skipped (not counted).');
  }

  const subscore = weightedSum(factors, weights);
  return { subscore: round2(subscore), factors, notes };
}

/* ---------------------------------------------------------------------- *
 *  PHISHING-SITE DETECTION (PH)  -  "Is the website a fake?"
 * ---------------------------------------------------------------------- */
function scorePhishing(ph, weights) {
  const factors = {};
  const notes = [];

  if (!ph) {
    return { subscore: 0, factors, notes: ['PH payload absent - PH sub-score defaulted to 0.'] };
  }

  const regDate = safeGet(ph, ['domain', 'registrationDate']);
  const submittedAt = ph.submittedAt;

  // PH1 - Domain age
  if (regDate && submittedAt) {
    const ageDays = daysBetween(regDate, submittedAt);
    if (ageDays !== null) {
      const f = clip01(1 - Math.min(ageDays / 180, 1));
      factors.PH1_domainAge = f;
      notes.push(`PH1: domain age = ${round2(ageDays)} days -> risk factor ${round2(f)}.`);
    } else {
      factors.PH1_domainAge = null;
      notes.push('PH1: could not compute domain age - factor skipped (not counted).');
    }
  } else {
    factors.PH1_domainAge = null;
    notes.push('PH1: domain registrationDate unavailable - factor skipped (not counted).');
  }

  // PH2 - Certificate quality
  const cert = ph.certificate;
  if (cert && Object.keys(cert).length > 0) {
    const selfSigned = !!cert.selfSigned;
    let shortLived = false;
    if (cert.validFrom && cert.validTo) {
      const validDays = daysBetween(cert.validFrom, cert.validTo);
      shortLived = validDays !== null && validDays < 30;
    }
    const f = selfSigned || shortLived ? 1 : 0;
    factors.PH2_certificateQuality = f;
    notes.push(
      `PH2: selfSigned=${selfSigned}, shortLived(<30d)=${shortLived} -> risk factor ${f}.`
    );
  } else {
    factors.PH2_certificateQuality = null;
    notes.push('PH2: certificate data unavailable - factor skipped (not counted).');
  }

  // PH3 - Blacklist hit
  if (typeof ph.localListing === 'string') {
    const f = ph.localListing === 'blacklist' ? 1 : 0;
    factors.PH3_blacklistHit = f;
    notes.push(`PH3: localListing="${ph.localListing}" -> risk factor ${f}.`);
  } else {
    factors.PH3_blacklistHit = null;
    notes.push('PH3: localListing unavailable - factor skipped (not counted).');
  }

  const subscore = weightedSum(factors, weights);
  return { subscore: round2(subscore), factors, notes };
}

/**
 * Weighted sum over only the factors that were actually computable (non-null),
 * re-normalised over the weight of the available signals so that missing
 * fields degrade gracefully instead of always dragging the sub-score down
 * toward zero. This keeps the score explainable: every used factor is named
 * with its exact weight in the resulting notes.
 */
function weightedSum(factors, weights) {
  let totalWeight = 0;
  let sum = 0;
  Object.entries(factors).forEach(([key, value]) => {
    const w = weights[key] || 0;
    if (value !== null && value !== undefined) {
      sum += value * w;
      totalWeight += w;
    }
  });
  if (totalWeight === 0) return 0;
  // Re-scale to the full 0-100 range based on weight actually available
  return (sum / totalWeight) * 100;
}

module.exports = { scoreAdaptiveFriction, scoreFundFlow, scorePhishing };
