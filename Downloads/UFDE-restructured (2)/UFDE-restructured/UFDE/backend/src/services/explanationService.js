const { round2 } = require('../utils/helpers');

/**
 * Builds a flat list of plain-language explanations covering every signal
 * that was actually triggered/evaluated, referencing the field, its value,
 * and the resulting risk factor - satisfying the "full explainability"
 * guardrail (no black-box logic).
 */
function buildExplanations({ afResult, ffResult, phResult, consolidatedScore, band }) {
  const lines = [];

  lines.push(
    `Consolidated risk score is ${round2(consolidatedScore)}/100, mapped to the "${band.label}" band ` +
      `(range ${band.min}-${band.max}).`
  );
  lines.push(
    `Score composition: Adaptive-Friction sub-score ${round2(afResult.subscore)} (weight 0.45), ` +
      `Fund-Flow sub-score ${round2(ffResult.subscore)} (weight 0.35), ` +
      `Phishing-Site sub-score ${round2(phResult.subscore)} (weight 0.20).`
  );

  afResult.notes.forEach((n) => lines.push(n));
  ffResult.notes.forEach((n) => lines.push(n));
  phResult.notes.forEach((n) => lines.push(n));

  return lines;
}

module.exports = { buildExplanations };
