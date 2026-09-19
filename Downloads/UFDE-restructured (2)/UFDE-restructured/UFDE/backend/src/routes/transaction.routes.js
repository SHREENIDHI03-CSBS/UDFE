const express = require('express');
const {
  listTransactions,
  getTransaction,
  getTransactionReport,
  getTransactionReportModel,
} = require('../controllers/transaction.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.get('/', auth, requireRole('Viewer'), listTransactions);
router.get('/:transactionId', auth, requireRole('Viewer'), getTransaction);
router.get('/:transactionId/str', auth, requireRole('Analyst'), getTransactionReport);
router.get('/:transactionId/str/model', auth, requireRole('Analyst'), getTransactionReportModel);

module.exports = router;
