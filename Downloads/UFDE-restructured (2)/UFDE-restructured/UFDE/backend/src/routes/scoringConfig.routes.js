const express = require('express');
const { getConfig, putConfig, resetConfig } = require('../controllers/scoringConfig.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.get('/', auth, requireRole('Viewer'), getConfig);
router.put('/', auth, requireRole('Admin'), putConfig);
router.post('/reset', auth, requireRole('Admin'), resetConfig);

module.exports = router;
