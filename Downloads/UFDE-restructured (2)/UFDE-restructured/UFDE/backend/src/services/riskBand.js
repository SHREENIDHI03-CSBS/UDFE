/**
 * Thin accessor layer over the active scoring configuration. Delegates to
 * scoringConfigService, which returns the admin-overridden config from the
 * database if one has been saved, otherwise the shipped risk_bands.yaml.
 */
function getConfig() {
  // Required lazily to avoid a circular require with scoringConfigService.
  const { getActiveConfig } = require('./scoringConfigService');
  return getActiveConfig();
}

function getBandForScore(score) {
  const config = getConfig();
  const band = config.bands.find((b) => score >= b.min && score <= b.max);
  return band || config.bands[config.bands.length - 1];
}

function getGroupWeights() {
  return getConfig().groupWeights;
}

function getSignalWeights() {
  return getConfig().signalWeights;
}

function getAllBands() {
  return getConfig().bands;
}

module.exports = { getBandForScore, getGroupWeights, getSignalWeights, getAllBands };
