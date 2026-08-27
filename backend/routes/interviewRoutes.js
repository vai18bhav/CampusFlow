const express = require('express');
const router = express.Router();
const {
  getMockInterviews,
  getMockCredits,
  assignMockCredits,
  requestMockInterview,
  reviewMockRequest,
  delegateMockInterview,
  reviewDelegation,
  evaluateMockInterview
} = require('../controllers/interviewController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// Get all mocks (filtered per role inside controller)
router.get('/', getMockInterviews);

// Student credits check — Student only
router.get('/credits', authorizeRoles('STUDENT'), getMockCredits);

// ── Mock Interview Scheduling ──────────────────────────────────────────────
// SRS Page 3: ALL 6 roles can schedule/request a mock interview
router.post('/request', requestMockInterview);

// ── Credit Assignment (Admin/Sales) ───────────────────────────────────────
router.post('/assign-credits', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), assignMockCredits);

// ── Mock Accept / Reject (review pending requests) ────────────────────────
// SRS Page 3: Super Admin, Admin, Trainer, Support Executive
router.patch('/:id/review', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SUPPORT_EXECUTIVE'), reviewMockRequest);

// ── Mock Delegation ────────────────────────────────────────────────────────
// SRS Page 3: Super Admin, Admin, Trainer
router.post('/:id/delegate', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), delegateMockInterview);

// ── Delegation Review (Support Exec can review) ───────────────────────────
// SRS Page 3: Super Admin, Admin, Trainer, Support Executive
router.patch('/:id/delegated-review', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SUPPORT_EXECUTIVE'), reviewDelegation);

// ── Mock Feedback / Evaluate ──────────────────────────────────────────────
// SRS Page 3: Super Admin, Admin, Trainer, Support Executive
router.patch('/:id/evaluate', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SUPPORT_EXECUTIVE'), evaluateMockInterview);

module.exports = router;
