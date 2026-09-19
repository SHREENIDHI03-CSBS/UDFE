const path = require('path');
const fs = require('fs');
const { PATHS } = require('../config/constants');
const report = require('../services/report');

module.exports = {
  /** The canonical STR model (JSON) for a report id, or null. */
  readModel(reportId) {
    return report.readModel(reportId);
  },

  /** Renders a downloadable STR artifact: { buffer, fileName, contentType }. */
  render(reportId, format = 'pdf', overrides = {}) {
    return report.renderSTR(reportId, format, overrides);
  },

  /** Resolves a report id from a stored transactions.str_path value. */
  idFromPath(storedPath) {
    return report.reportIdFromPath(storedPath);
  },

  exists(reportId) {
    return fs.existsSync(path.join(PATHS.REPORTS, `${reportId}.json`));
  },

  filePath(reportId, format = 'pdf') {
    return path.join(PATHS.REPORTS, `${reportId}.${format}`);
  },
};
