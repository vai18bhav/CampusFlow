const pool = require('../config/db');
const { sendNotification } = require('../services/notificationService');

/**
 * Checks for assignments due in approximately 24 hours.
 * Notifies students in the batch (In-App only per SRS Matrix).
 */
const checkAssignmentDeadlines = async () => {
  try {
    const [assignments] = await pool.query(
      `SELECT a.id as assignment_id, a.title, a.due_date, a.batch_id
       FROM assignments a
       WHERE (a.due_date >= NOW() AND a.due_date <= DATE_ADD(NOW(), INTERVAL 24 HOUR))
          OR (a.deadline >= NOW() AND a.deadline <= DATE_ADD(NOW(), INTERVAL 24 HOUR))`
    );

    for (const a of assignments) {
      const [students] = await pool.query(
        `SELECT s.id as student_id, s.user_id
         FROM batch_students bs
         JOIN students s ON bs.student_id = s.id
         WHERE bs.batch_id = ? AND bs.status = 'ENROLLED'`,
        [a.batch_id]
      );

      const title = `Reminder: Assignment Due in 24 Hours`;
      const msg = `Assignment "${a.title}" is due in 24 hours (Due: ${a.due_date}). Submit your solution before the deadline.`;

      for (const s of students) {
        if (!s.user_id) continue;

        await sendNotification({
          userId: s.user_id,
          title,
          message: msg,
          type: 'ASSIGNMENT',
          templateCode: 'ASSIGNMENT_DUE_24HOURS',
          variables: { assignment_title: a.title, due_date: a.due_date },
          referenceType: 'assignment',
          referenceId: a.assignment_id,
          sendInApp: true,
          sendEmail: false, // In-app ONLY according to SRS Trigger Matrix
          preventDuplicates: true
        });
      }
    }
  } catch (error) {
    console.error('Assignment Reminder Job Error:', error.message);
  }
};

module.exports = { checkAssignmentDeadlines };
