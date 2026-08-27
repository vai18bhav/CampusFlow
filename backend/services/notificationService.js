const pool = require('../config/db');
const { sendEmailNotification } = require('./emailService');

/**
 * Checks whether a notification of the same type & reference has been dispatched recently.
 * Prevents duplicate alerts from periodic cron jobs.
 */
const isDuplicateNotification = async (userId, type, referenceType, referenceId, windowHours = 12) => {
  try {
    if (!userId || !referenceType || !referenceId) return false;

    const [rows] = await pool.query(
      `SELECT id FROM notifications 
       WHERE user_id = ? AND type = ? AND reference_type = ? AND reference_id = ?
         AND created_at >= NOW() - INTERVAL ? HOUR
       LIMIT 1`,
      [userId, type.toUpperCase(), referenceType, referenceId, windowHours]
    );

    return rows.length > 0;
  } catch (error) {
    console.error('Error checking duplicate notification:', error.message);
    return false;
  }
};

/**
 * Main Notification Dispatcher supporting In-App and/or Email channels.
 */
const sendNotification = async ({
  userId,
  recipientEmail = null,
  title,
  message,
  type = 'GENERAL',
  templateCode = null,
  variables = {},
  referenceType = null,
  referenceId = null,
  sendInApp = true,
  sendEmail = true,
  preventDuplicates = false
}) => {
  try {
    const notifType = type.toUpperCase();

    // Check duplicate prevention if required
    if (preventDuplicates && await isDuplicateNotification(userId, notifType, referenceType, referenceId)) {
      return { success: false, duplicate: true, message: 'Notification already sent recently' };
    }

    // 1. Create In-App Notification if requested & userId present
    if (sendInApp && userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id, is_read)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [userId, title, message, notifType, referenceType, referenceId]
      );
    }

    // 2. Fetch email address if not passed directly
    let targetEmail = recipientEmail;
    if (sendEmail && !targetEmail && userId) {
      const [uRows] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
      if (uRows.length > 0) targetEmail = uRows[0].email;
    }

    // 3. Send Email Notification if requested & email available
    if (sendEmail && targetEmail) {
      await sendEmailNotification({
        to: targetEmail,
        templateCode,
        variables: { title, message, ...variables },
        subject: title,
        html: null
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send notification:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Marks single notification as read for a user.
 */
const markAsRead = async (notificationId, userId) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return true;
  } catch (error) {
    console.error('Failed to mark notification as read:', error.message);
    return false;
  }
};

/**
 * Marks all notifications as read for a user.
 */
const markAllAsRead = async (userId) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return true;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error.message);
    return false;
  }
};

module.exports = {
  sendNotification,
  isDuplicateNotification,
  markAsRead,
  markAllAsRead
};
