const scoringConfigService = require('../services/scoringConfigService');
const audit = require('../utils/audit');
const { ok, fail } = require('../utils/response');

function getConfig(req, res) {
  return ok(res, scoringConfigService.getActiveConfig());
}

function putConfig(req, res) {
  const config = req.body;
  if (!config || !Array.isArray(config.bands) || !config.groupWeights || !config.signalWeights) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Config must include bands[], groupWeights, and signalWeights.');
  }
  const saved = scoringConfigService.saveConfig(config, req.user?.email);
  audit.record('ACTION', { actor: req.user?.email, details: { type: 'SCORING_CONFIG_UPDATE' } });
  return ok(res, saved);
}

function resetConfig(req, res) {
  const cfg = scoringConfigService.resetToDefault(req.user?.email);
  audit.record('ACTION', { actor: req.user?.email, details: { type: 'SCORING_CONFIG_RESET' } });
  return ok(res, cfg);
}

module.exports = { getConfig, putConfig, resetConfig };
