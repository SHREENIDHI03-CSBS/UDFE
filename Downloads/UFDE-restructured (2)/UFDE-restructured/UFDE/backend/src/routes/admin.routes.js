const express = require('express');
const { listUsers, listAuditLog } = require('../controllers/admin.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.get('/users', auth, requireRole('Admin'), listUsers);
router.get('/audit-log', auth, requireRole('Admin'), listAuditLog);

module.exports = router;
