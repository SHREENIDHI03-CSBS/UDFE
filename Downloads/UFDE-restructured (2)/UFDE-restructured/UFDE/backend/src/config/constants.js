const path = require('path');

module.exports = {
  ROLES: {
    VIEWER: 'Viewer',
    ANALYST: 'Analyst',
    ADMIN: 'Admin',
  },
  ROLE_HIERARCHY: {
    Viewer: 1,
    Analyst: 2,
    Admin: 3,
  },
  PATHS: {
    UPLOADS: path.join(__dirname, '..', '..', 'uploads'),
    REPORTS: path.join(__dirname, '..', '..', 'reports'),
    EXPORTS: path.join(__dirname, '..', '..', 'exports'),
    RISK_BANDS_YAML: path.join(__dirname, 'risk_bands.yaml'),
  },
};
