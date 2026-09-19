const express = require('express');
const { postRiskScore } = require('../controllers/riskScore.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

// Single, simple REST endpoint per the spec: POST /risk-score
router.post('/', auth, requireRole('Viewer'), postRiskScore);

module.exports = router;
