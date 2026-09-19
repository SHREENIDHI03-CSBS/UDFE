const express = require('express');
const { applyAction } = require('../controllers/actions.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.post('/:transactionId', auth, requireRole('Analyst'), applyAction);

module.exports = router;
