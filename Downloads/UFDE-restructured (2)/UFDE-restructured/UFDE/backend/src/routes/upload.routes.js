const express = require('express');
const { uploadBatch } = require('../controllers/upload.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const upload = require('../middleware/upload');

const router = express.Router();

router.post(
  '/',
  auth,
  requireRole('Admin'),
  upload.fields([
    { name: 'af', maxCount: 1 },
    { name: 'ff', maxCount: 1 },
    { name: 'ph', maxCount: 1 },
  ]),
  uploadBatch
);

module.exports = router;
