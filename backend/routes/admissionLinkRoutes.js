const express = require('express');
const router = express.Router();
const {
  createAdmissionLink,
  getAdmissionLinks,
  getAdmissionLinkInfo,
  submitAdmissionForm,
  approveAdmission,
  rejectAdmission
} = require('../controllers/admissionLinkController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// ── Authenticated routes ──────────────────────────────────────────────────────

// POST /api/admission-links  — create link (Sales Exec, Admin, Super Admin)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  createAdmissionLink
);

// GET /api/admission-links  — list links
router.get(
  '/',
  authenticateJWT,
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'),
  getAdmissionLinks
);

// ── Public routes (no auth) ───────────────────────────────────────────────────

// GET /api/admission-links/:token  — get link info (pre-fill form)
router.get('/:token', getAdmissionLinkInfo);

// POST /api/admission-links/:token/submit  — student submits public form
router.post('/:token/submit', submitAdmissionForm);

module.exports = router;
