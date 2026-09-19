const fs = require('fs');
const yaml = require('js-yaml');
const db = require('../config/database');
const { PATHS } = require('../config/constants');

function getDefaultConfig() {
  const raw = fs.readFileSync(PATHS.RISK_BANDS_YAML, 'utf-8');
  return yaml.load(raw);
}

/**
 * Returns the currently active scoring configuration: the latest row saved
 * to scoring_config if an admin has customised it, otherwise the shipped
 * risk_bands.yaml defaults.
 */
function getActiveConfig() {
  try {
    const row = db.prepare('SELECT * FROM scoring_config ORDER BY id DESC LIMIT 1').get();
    if (row) return JSON.parse(row.config_json);
  } catch (err) {
    // scoring_config table not yet created (schema not initialised) - fall
    // back to the shipped defaults rather than crashing the scoring path.
  }
  return getDefaultConfig();
}

function saveConfig(config, updatedBy) {
  db.prepare('INSERT INTO scoring_config (config_json, updated_by) VALUES (?, ?)').run(
    JSON.stringify(config),
    updatedBy
  );
  return config;
}

function resetToDefault(updatedBy) {
  const cfg = getDefaultConfig();
  return saveConfig(cfg, updatedBy);
}

module.exports = { getDefaultConfig, getActiveConfig, saveConfig, resetToDefault };
