const { scoreAdaptiveFriction, scoreFundFlow, scorePhishing } = require('./fraudScoringService');
const { getGroupWeights, getSignalWeights, getBandForScore } = require('./riskBand');
const { buildExplanations } = require('./explanationService');
const { round2 } = require('../utils/helpers');

/**
 * Scores one merged transaction record ({ transactionId, af, ff, ph })
 * end-to-end: signal factors -> group sub-scores -> consolidated score ->
 * risk band -> recommended actions -> plain-language explanations.
 */
function scoreTransaction(record) {
  const signalWeights = getSignalWeights();
  const groupWeights = getGroupWeights();

  const afResult = scoreAdaptiveFriction(record.af, signalWeights.AF);
  const ffResult = scoreFundFlow(record.ff, signalWeights.FF);
  const phResult = scorePhishing(record.ph, signalWeights.PH);

  const consolidatedScore = round2(
    groupWeights.AF * afResult.subscore +
      groupWeights.FF * ffResult.subscore +
      groupWeights.PH * phResult.subscore
  );

  const band = getBandForScore(consolidatedScore);

  const explanations = buildExplanations({
    afResult,
    ffResult,
    phResult,
    consolidatedScore,
    band,
  });

  return {
    transactionId: record.transactionId,
    af: afResult,
    ff: ffResult,
    ph: phResult,
    consolidatedScore,
    band,
    recommendedActions: band.actions,
    explanations,
  };
}

module.exports = { scoreTransaction };
