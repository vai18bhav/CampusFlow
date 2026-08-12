const pool = require('../config/db');

/**
 * Creates a notification in the database for a user.
 * @param {number} userId - Target user ID
 * @param {string} title - Notification title
 * @param {string} message - Notification text message
 * @param {string} type - ASSIGNMENT, ATTENDANCE, FEE, INTERVIEW, ADMISSION, ANNOUNCEMENT, SYSTEM
 * @param {string} referenceType - assignment, invoice, payment, mock_interview, admission
 * @param {number} referenceId - ID of referenced entity
 */
const createNotification = async (userId, title, message, type = 'GENERAL', referenceType = null, referenceId = null) => {
  try {
    if (!userId) return;

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id, is_read) 
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [userId, title, message, type.toUpperCase(), referenceType, referenceId]
    );
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

/**
 * Dispatches a notification to all students enrolled in a specific batch.
 */
const notifyBatchStudents = async (batchId, title, message, type = 'ASSIGNMENT', referenceType = null, referenceId = null) => {
  try {
    const [students] = await pool.query(
      `SELECT s.user_id 
       FROM batch_students bs
       JOIN students s ON bs.student_id = s.id
       WHERE bs.batch_id = ? AND s.user_id IS NOT NULL`,
      [batchId]
    );

    for (let s of students) {
      await createNotification(s.user_id, title, message, type, referenceType, referenceId);
    }
  } catch (error) {
    console.error('Failed to dispatch batch notifications:', error.message);
  }
};

module.exports = {
  createNotification,
  notifyBatchStudents
};
