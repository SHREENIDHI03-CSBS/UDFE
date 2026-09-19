const express = require('express');
const { login, register, me } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.post('/login', login);
// Only an Admin may create new users (self-registration is disabled by design)
router.post('/register', auth, requireRole('Admin'), register);
router.get('/me', auth, me);

module.exports = router;
