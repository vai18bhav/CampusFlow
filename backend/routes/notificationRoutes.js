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
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/notices', getNoticesHistory);
router.post('/broadcast-notice', authorizeRoles('SUPER_ADMIN', 'ADMIN'), broadcastNotice);

router.patch('/read-all', markAsRead);
router.patch('/:id/read', markAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
