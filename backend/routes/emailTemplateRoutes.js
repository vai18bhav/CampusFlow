const express = require('express');
const router = express.Router();
const {
  getEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate
} = require('../controllers/emailTemplateController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);
router.use(authorizeRoles('SUPER_ADMIN', 'ADMIN'));

// GET /api/admin/email-templates
router.get('/', getEmailTemplates);

// PUT /api/admin/email-templates/:id
router.put('/:id', updateEmailTemplate);

// POST /api/admin/email-templates/:id/preview
router.post('/:id/preview', previewEmailTemplate);

module.exports = router;
