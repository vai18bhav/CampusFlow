const pool = require('../config/db');
const { sendNotification } = require('../services/notificationService');

/**
 * Checks for mock interview sessions starting in 1 hour.
 * Notifies Student and Trainer/Support Executive.
 */
const checkUpcomingMocks = async () => {
  try {
    const [mocks] = await pool.query(
      `SELECT mi.id as mock_id, mi.topic, mi.scheduled_date, mi.delegated_to_user_id,
              s.id as student_id, s.user_id as student_user_id, u_stu.full_name as student_name,
              t.user_id as trainer_user_id, u_trn.full_name as trainer_name
       FROM mock_interviews mi
       JOIN students s ON mi.student_id = s.id
       JOIN users u_stu ON s.user_id = u_stu.id
       LEFT JOIN trainers t ON mi.trainer_id = t.id
       LEFT JOIN users u_trn ON t.user_id = u_trn.id
       WHERE mi.status = 'SCHEDULED'
         AND mi.scheduled_date >= NOW()
         AND mi.scheduled_date <= DATE_ADD(NOW(), INTERVAL 1 HOUR)`
    );

    for (const mock of mocks) {
      const interviewerUserId = mock.delegated_to_user_id || mock.trainer_user_id;
      const title = `Reminder: Mock Interview Starting in 1 Hour`;
      const msg = `Your mock interview session "${mock.topic}" is scheduled to start in 1 hour (${mock.scheduled_date}).`;

      // Notify Student
      await sendNotification({
        userId: mock.student_user_id,
        title,
        message: msg,
        type: 'INTERVIEW',
        templateCode: 'MOCK_DUE_1HOUR',
        variables: {
          student_name: mock.student_name,
          mock_time: mock.scheduled_date,
          interviewer_name: mock.trainer_name || 'Assigned Interviewer'
        },
        referenceType: 'mock_interview',
        referenceId: mock.mock_id,
        sendInApp: true,
        sendEmail: true,
        preventDuplicates: true
      });

      // Notify Interviewer (Trainer or Support Exec)
      if (interviewerUserId) {
        await sendNotification({
          userId: interviewerUserId,
          title,
          message: `Mock interview session with ${mock.student_name} is starting in 1 hour.`,
          type: 'INTERVIEW',
          templateCode: 'MOCK_DUE_1HOUR',
          variables: {
            student_name: mock.student_name,
            mock_time: mock.scheduled_date,
            interviewer_name: mock.trainer_name || 'Interviewer'
          },
          referenceType: 'mock_interview',
          referenceId: mock.mock_id,
          sendInApp: true,
          sendEmail: true,
          preventDuplicates: true
        });
      }
    }
  } catch (error) {
    console.error('Mock Reminder Job Error:', error.message);
  }
};

module.exports = { checkUpcomingMocks };
