const express = require('express');
const router = express.Router();
const {
  getFinanceSummary,
  getInvoices,
  getInvoiceById,
  createInvoice,
  createInstallments,
  recordPayment,
  getStudentFinance,
  getPaymentHistory
} = require('../controllers/financeController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// Summary & Student Financial Statements
router.get('/summary', getFinanceSummary);
router.get('/student/:studentId?', getStudentFinance);

// Invoices Management (both /api/finance/invoices and /api/invoices)
router.get('/', (req, res, next) => {
  if (req.baseUrl.includes('payments')) return getPaymentHistory(req, res, next);
  return getInvoices(req, res, next);
});

router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', authorizeRoles('SUPER_ADMIN', 'ADMIN'), createInvoice);

// Root path handlers for /api/invoices and /api/payments
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN'), (req, res, next) => {
  if (req.baseUrl.includes('payments')) return recordPayment(req, res, next);
  return createInvoice(req, res, next);
});

router.get('/:id', (req, res, next) => {
  if (req.baseUrl.includes('invoices')) return getInvoiceById(req, res, next);
  return getInvoiceById(req, res, next);
});

// Installment Management
router.post('/invoices/:id/installments', authorizeRoles('SUPER_ADMIN', 'ADMIN'), createInstallments);
router.post('/:id/installments', authorizeRoles('SUPER_ADMIN', 'ADMIN'), createInstallments);

// Payment Recording
router.post('/payments', authorizeRoles('SUPER_ADMIN', 'ADMIN'), recordPayment);
router.post('/invoices/:id/payments', authorizeRoles('SUPER_ADMIN', 'ADMIN'), recordPayment);
router.post('/installments/:installment_id/pay', authorizeRoles('SUPER_ADMIN', 'ADMIN'), recordPayment);
router.post('/:installment_id/pay', authorizeRoles('SUPER_ADMIN', 'ADMIN'), recordPayment);
router.get('/payments', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), getPaymentHistory);

module.exports = router;
