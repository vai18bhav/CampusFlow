const pool = require('../config/db');
const { sendNotification } = require('../services/notificationService');

/**
 * Checks for student mock credits packages nearing expiry (7 days) or exhausted (remaining = 0).
 */
const checkMockCredits = async () => {
  try {
    // 1. Credits Expiring in 7 Days
    const [expiring] = await pool.query(
      `SELECT s.id as student_id, s.user_id as student_user_id, s.mock_interview_credits, s.mock_credits_total,
              s.mock_credits_used, s.mock_credit_expiry, u.full_name as student_name,
              se.user_id as sales_user_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN admissions a ON a.student_id = s.id
       LEFT JOIN admission_links al ON a.admission_link_id = al.id
       LEFT JOIN sales_executives se ON al.sales_exec_id = se.id
       WHERE s.mock_credit_expiry IS NOT NULL
         AND s.mock_credit_expiry >= CURRENT_DATE()
         AND s.mock_credit_expiry <= DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)`
    );

    for (const s of expiring) {
      const total = s.mock_interview_credits || s.mock_credits_total || 0;
      const used = s.mock_credits_used || 0;
      const remaining = Math.max(0, total - used);
      const title = `Alert: Your Mock Credits Expire in 7 Days`;
      const msg = `You have ${remaining} remaining mock interview credits out of ${total} total credits. Expiry date: ${s.mock_credit_expiry}.`;

      // Notify Student
      await sendNotification({
        userId: s.student_user_id,
        title,
        message: msg,
        type: 'INTERVIEW',
        templateCode: 'MOCK_CREDITS_EXPIRING_7DAYS',
        variables: {
          student_name: s.student_name,
          credit_remaining: remaining,
          expiry_date: s.mock_credit_expiry
        },
        referenceType: 'mock_credits',
        referenceId: s.student_id,
        sendInApp: true,
        sendEmail: true,
        preventDuplicates: true
      });

      // Notify Sales Executive
      if (s.sales_user_id) {
        await sendNotification({
          userId: s.sales_user_id,
          title,
          message: `Student ${s.student_name}'s mock credits package expires in 7 days (${remaining} credits remaining).`,
          type: 'INTERVIEW',
          templateCode: 'MOCK_CREDITS_EXPIRING_7DAYS',
          variables: {
            student_name: s.student_name,
            credit_remaining: remaining,
            expiry_date: s.mock_credit_expiry
          },
          referenceType: 'mock_credits',
          referenceId: s.student_id,
          sendInApp: true,
          sendEmail: true,
          preventDuplicates: true
        });
      }
    }

    // 2. Credits Exhausted (Remaining = 0)
    const [exhausted] = await pool.query(
      `SELECT s.id as student_id, s.user_id as student_user_id, u.full_name as student_name,
              se.user_id as sales_user_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN admissions a ON a.student_id = s.id
       LEFT JOIN admission_links al ON a.admission_link_id = al.id
       LEFT JOIN sales_executives se ON al.sales_exec_id = se.id
       WHERE (s.mock_interview_credits <= s.mock_credits_used OR s.mock_credits_total <= s.mock_credits_used)`
    );

    for (const s of exhausted) {
      const title = `Mock Credits Balance Exhausted`;
      const msg = `Your mock interview credits balance has been fully exhausted (0 remaining).`;

      // Notify Student
      await sendNotification({
        userId: s.student_user_id,
        title,
        message: msg,
        type: 'INTERVIEW',
        templateCode: 'MOCK_CREDITS_EXHAUSTED',
        variables: { student_name: s.student_name },
        referenceType: 'mock_credits_exhausted',
        referenceId: s.student_id,
        sendInApp: true,
        sendEmail: true,
        preventDuplicates: true
      });

      // Notify Sales Executive
      if (s.sales_user_id) {
        await sendNotification({
          userId: s.sales_user_id,
          title,
          message: `Student ${s.student_name} has exhausted all assigned mock interview credits.`,
          type: 'INTERVIEW',
          templateCode: 'MOCK_CREDITS_EXHAUSTED',
          variables: { student_name: s.student_name },
          referenceType: 'mock_credits_exhausted',
          referenceId: s.student_id,
          sendInApp: true,
          sendEmail: true,
          preventDuplicates: true
        });
      }
    }
  } catch (error) {
    console.error('Mock Credit Expiry Job Error:', error.message);
  }
};

module.exports = { checkMockCredits };
