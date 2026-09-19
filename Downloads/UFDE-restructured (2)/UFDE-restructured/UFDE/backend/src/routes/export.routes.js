const express = require('express');
const { download } = require('../controllers/export.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.get('/:format', auth, requireRole('Viewer'), download);

module.exports = router;
