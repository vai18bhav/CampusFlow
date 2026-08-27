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
  getPaymentHistory,
  downloadInvoicePdf
} = require('../controllers/financeController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles, requireOwnOrRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// ── Summary (management-level; Students blocked) ──────────────────────────
// SRS: Reports & Analytics — Super Admin, Admin, Sales Exec (partial)
router.get('/summary',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE', 'TRAINER', 'SUPPORT_EXECUTIVE'),
  getFinanceSummary
);

// ── Student Financial Statement ───────────────────────────────────────────
// Student can view their own; Admin/Trainer/Sales can view any student
router.get('/student/:studentId?',
  requireOwnOrRoles(
    (req) => req.params.studentId || 0,
    (req) => req.user.student_id || 0,
    'SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE', 'TRAINER', 'SUPPORT_EXECUTIVE'
  ),
  getStudentFinance
);

// ── Invoice PDF Downloads ──────────────────────────────────────────────────
router.get('/invoices/:id/download', downloadInvoicePdf);
router.get('/invoices/:id/pdf', downloadInvoicePdf);
router.get('/:id/download', downloadInvoicePdf);
router.get('/:id/pdf', downloadInvoicePdf);

// ── Invoice Listing & Details ─────────────────────────────────────────────
// SRS: Invoice Management — Super Admin, Admin, Sales Executive
// Students can view their own invoices (controller handles scoping)
router.get('/', (req, res, next) => {
  if (req.baseUrl.includes('payments')) return getPaymentHistory(req, res, next);
  return getInvoices(req, res, next);
});

router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  createInvoice
);

// Root path handlers for /api/invoices and /api/payments
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), (req, res, next) => {
  if (req.baseUrl.includes('payments')) return recordPayment(req, res, next);
  return createInvoice(req, res, next);
});

router.get('/:id', (req, res, next) => {
  if (req.baseUrl.includes('invoices')) return getInvoiceById(req, res, next);
  return getInvoiceById(req, res, next);
});

// ── Instalment Management ─────────────────────────────────────────────────
// SRS: Invoice & Instalment Management — Super Admin, Admin, Sales Executive
router.post('/invoices/:id/installments',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  createInstallments
);
router.post('/:id/installments',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  createInstallments
);

// ── Payment Recording ─────────────────────────────────────────────────────
// SRS: Invoice & Instalment Management — Super Admin, Admin, Sales Executive
router.post('/payments',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  recordPayment
);
router.post('/invoices/:id/payments',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  recordPayment
);
router.post('/installments/:installment_id/pay',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  recordPayment
);
router.post('/:installment_id/pay',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  recordPayment
);
router.get('/payments',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  getPaymentHistory
);

module.exports = router;
