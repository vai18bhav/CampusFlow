const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  broadcastNotice,
  getNoticesHistory
} = require('../controllers/notificationController');
const {
  getEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate
} = require('../controllers/emailTemplateController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// Super Admin Email Template APIs (SRS Page 18: /api/admin/email-templates or /api/notifications/email-templates)
router.get('/email-templates', authorizeRoles('SUPER_ADMIN'), getEmailTemplates);
router.put('/email-templates/:id', authorizeRoles('SUPER_ADMIN'), updateEmailTemplate);
router.post('/email-templates/:id/preview', authorizeRoles('SUPER_ADMIN'), previewEmailTemplate);

// General User Notification Endpoints
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/notices', getNoticesHistory);
router.post('/broadcast-notice', authorizeRoles('SUPER_ADMIN', 'ADMIN'), broadcastNotice);

// Read / Mark As Read
router.put('/read-all', markAsRead);
router.patch('/read-all', markAsRead);
router.put('/:id/read', markAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
