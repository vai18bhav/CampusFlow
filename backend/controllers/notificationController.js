const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * GET /api/notifications
 * Fetches recent notifications for authenticated user.
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50',
      [userId]
    );

    const [unread] = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return successResponse(res, 200, 'Notifications fetched successfully', {
      unread_count: unread[0].unread_count || 0,
      notifications
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch notifications', error.message);
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns unread notification badge count.
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const [unread] = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return successResponse(res, 200, 'Unread count retrieved', {
      unread_count: unread[0].unread_count || 0
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch unread count', error.message);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * PATCH /api/notifications/read-all
 * Marks single notification or all user notifications as read.
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id || id === 'all' || req.path.includes('read-all')) {
      await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
      return successResponse(res, 200, 'All notifications marked as read');
    }

    const [result] = await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);

    if (result.affectedRows === 0) {
      return errorResponse(res, 404, 'Notification not found or unauthorized');
    }

    return successResponse(res, 200, 'Notification marked as read');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to mark notification as read', error.message);
  }
};

/**
 * DELETE /api/notifications/:id
 * Removes a notification entry.
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);

    if (result.affectedRows === 0) {
      return errorResponse(res, 404, 'Notification not found or unauthorized');
    }

    return successResponse(res, 200, 'Notification deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete notification', error.message);
  }
};

/**
 * POST /api/notifications/broadcast-notice
 * Admin / Super Admin publishes a notice to all students or all system members.
 * Inserts in-app notifications and sends Gmail email to every target user.
 */
const { sendBroadcastNoticeEmail } = require('../utils/emailService');

const broadcastNotice = async (req, res) => {
  try {
    const { title, message, priority = 'GENERAL', target_group = 'ALL_STUDENTS', user_ids = [], batch_ids = [] } = req.body;

    if (!title || !message) {
      return errorResponse(res, 400, 'Notice title and message content are required.');
    }

    let targetUsers = [];

    if (Array.isArray(user_ids) && user_ids.length > 0) {
      // Send to specific selected users
      const [selectedUsers] = await pool.query(
        'SELECT id, full_name, email FROM users WHERE id IN (?) AND status = "ACTIVE"',
        [user_ids]
      );
      targetUsers = selectedUsers;
    } else if (Array.isArray(batch_ids) && batch_ids.length > 0) {
      // Send to students in selected batches
      const [batchUsers] = await pool.query(
        `SELECT DISTINCT u.id, u.full_name, u.email FROM users u
         JOIN students s ON s.user_id = u.id
         JOIN batch_students bs ON bs.student_id = s.id
         WHERE bs.batch_id IN (?) AND u.status = "ACTIVE"`,
        [batch_ids]
      );
      targetUsers = batchUsers;
    } else {
      // Group target selection
      let userQuery = 'SELECT id, full_name, email FROM users WHERE status = "ACTIVE"';
      if (target_group === 'ALL_STUDENTS') {
        userQuery += ' AND role_id = 6';
      } else if (target_group === 'ALL_TRAINERS') {
        userQuery += ' AND role_id = 4';
      } else if (target_group === 'ALL_STAFF') {
        userQuery += ' AND role_id IN (2, 3, 4, 5)';
      }

      const [users] = await pool.query(userQuery);
      targetUsers = users;
    }

    if (targetUsers.length === 0) {
      const [allUsers] = await pool.query('SELECT id, full_name, email FROM users WHERE status = "ACTIVE"');
      targetUsers = allUsers;
    }

    if (targetUsers.length === 0) {
      return errorResponse(res, 400, 'No active users found to receive this notice.');
    }

    const senderName = req.user?.full_name || 'System Administration';

    // 1. Insert in-app notifications & 2. Dispatch email notifications
    for (let u of targetUsers) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, 0)',
        [u.id, `📢 [${priority}] ${title}`, message, 'ANNOUNCEMENT']
      );

      sendBroadcastNoticeEmail({
        toEmail: u.email,
        recipientName: u.full_name,
        noticeTitle: title,
        priority,
        content: message,
        senderName
      }).catch(err => console.error(`Failed email for ${u.email}:`, err.message));
    }

    return successResponse(res, 201, `Notice broadcasted successfully to ${targetUsers.length} recipient(s)!`, {
      recipients_count: targetUsers.length,
      title,
      priority,
      target_group
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to broadcast notice', error.message);
  }
};

/**
 * GET /api/notifications/notices
 * Fetches recent notice board announcements history feed.
 */
const getNoticesHistory = async (req, res) => {
  try {
    const [notices] = await pool.query(
      `SELECT id, title, message, type, created_at 
       FROM notifications 
       WHERE type = 'ANNOUNCEMENT' 
       GROUP BY title, message, created_at
       ORDER BY created_at DESC LIMIT 30`
    );

    return successResponse(res, 200, 'Notice history retrieved', { notices });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch notice history', error.message);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  broadcastNotice,
  getNoticesHistory
};
