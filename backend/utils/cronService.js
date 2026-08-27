const pool = require('../config/db');
const { sendGeneralEmail } = require('./emailService');

/**
 * Checks and triggers in-app and email notifications for various time-sensitive events.
 */
async function checkScheduledNotifications() {
  try {
    console.log('[CRON SERVICE] Checking scheduled notification triggers...');

    // 1. Coupon expiring within 3 days
    const [expiringCoupons] = await pool.query(
      `SELECT c.*, u.id as user_id, u.email as user_email, u.full_name as user_name
       FROM coupons c
       CROSS JOIN users u
       WHERE c.valid_until = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
         AND c.is_active = TRUE
         AND u.role_id IN (1, 2, 3)` // SUPER_ADMIN, ADMIN, SALES_EXECUTIVE
    );
    for (let c of expiringCoupons) {
      await createNotification(c.user_id, '🎟️ Coupon Expiring Soon', `Coupon code "${c.code}" will expire in 3 days on ${c.valid_until}.`, 'SYSTEM');
      sendGeneralEmail(c.user_email, 'Coupon Expiring Soon', `Hi ${c.user_name},\n\nThis is a reminder that coupon code "${c.code}" is set to expire in 3 days on ${c.valid_until}.`);
    }

    // 2. Invoice installment due in 3 days
    const [dueInstallments] = await pool.query(
      `SELECT inst.*, u_stu.id as student_user_id, u_stu.email as student_email, u_stu.full_name as student_name,
              u_sls.id as sales_user_id, u_sls.email as sales_email, u_sls.full_name as sales_name
       FROM installments inst
       JOIN invoices inv ON inst.invoice_id = inv.id
       JOIN students s ON inv.student_id = s.id
       JOIN users u_stu ON s.user_id = u_stu.id
       LEFT JOIN admissions adm ON inv.admission_id = adm.id
       LEFT JOIN users u_sls ON adm.created_by = u_sls.id
       WHERE inst.due_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
         AND inst.status = 'PENDING'`
    );
    for (let inst of dueInstallments) {
      // Notify Student
      await createNotification(inst.student_user_id, '💳 Installment Due Soon', `Installment #${inst.installment_number} of amount ${inst.amount} is due in 3 days.`, 'FEE');
      sendGeneralEmail(inst.student_email, 'Installment Due Soon', `Hi ${inst.student_name},\n\nThis is a reminder that installment #${inst.installment_number} of amount ${inst.amount} is due in 3 days on ${inst.due_date.toISOString().split('T')[0]}.`);

      // Notify Sales Executive
      if (inst.sales_user_id) {
        await createNotification(inst.sales_user_id, '💳 Student Installment Due Soon', `Installment #${inst.installment_number} for student ${inst.student_name} is due in 3 days.`, 'FEE');
      }
    }

    // 3. Installment overdue
    const [overdueInstallments] = await pool.query(
      `SELECT inst.*, u_stu.id as student_user_id, u_stu.email as student_email, u_stu.full_name as student_name,
              u_sls.id as sales_user_id, u_sls.email as sales_email,
              u_adm.id as admin_user_id
       FROM installments inst
       JOIN invoices inv ON inst.invoice_id = inv.id
       JOIN students s ON inv.student_id = s.id
       JOIN users u_stu ON s.user_id = u_stu.id
       LEFT JOIN admissions adm ON inv.admission_id = adm.id
       LEFT JOIN users u_sls ON adm.created_by = u_sls.id
       CROSS JOIN users u_adm
       WHERE inst.due_date < CURDATE()
         AND inst.status = 'PENDING'
         AND u_adm.role_id = 2` // ADMIN
    );
    for (let inst of overdueInstallments) {
      // Update installment status to OVERDUE
      await pool.query('UPDATE installments SET status = "OVERDUE" WHERE id = ?', [inst.id]);
      await pool.query('UPDATE invoices SET status = "OVERDUE" WHERE id = ?', [inst.invoice_id]);

      // Notify Student
      await createNotification(inst.student_user_id, '🚨 Installment Overdue', `Installment #${inst.installment_number} of amount ${inst.amount} is overdue. Please settle immediately.`, 'FEE');
      sendGeneralEmail(inst.student_email, 'Installment Overdue Alert', `Hi ${inst.student_name},\n\nYour installment #${inst.installment_number} of amount ${inst.amount} is overdue. Please settle this outstanding payment as soon as possible.`);

      // Notify Sales Executive
      if (inst.sales_user_id) {
        await createNotification(inst.sales_user_id, '🚨 Student Installment Overdue', `Installment #${inst.installment_number} for student ${inst.student_name} is overdue.`, 'FEE');
      }

      // Notify Admin
      if (inst.admin_user_id) {
        await createNotification(inst.admin_user_id, '🚨 Student Installment Overdue', `Installment #${inst.installment_number} for student ${inst.student_name} is overdue.`, 'FEE');
      }
    }

    // 4. Mock session due in 1 hour
    const [dueMocks] = await pool.query(
      `SELECT mi.*, u_stu.id as student_user_id, u_stu.email as student_email, u_stu.full_name as student_name,
              u_trn.id as trainer_user_id, u_trn.email as trainer_email, u_trn.full_name as trainer_name
       FROM mock_interviews mi
       JOIN students s ON mi.student_id = s.id
       JOIN users u_stu ON s.user_id = u_stu.id
       JOIN trainers t ON mi.trainer_id = t.id
       JOIN users u_trn ON t.user_id = u_trn.id
       WHERE mi.scheduled_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 HOUR)
         AND mi.status = 'SCHEDULED'`
    );
    for (let m of dueMocks) {
      // Notify Student
      await createNotification(m.student_user_id, '⏰ Mock Interview Scheduled Soon', `Your mock interview on "${m.topic}" is starting in less than 1 hour.`, 'INTERVIEW');
      sendGeneralEmail(m.student_email, 'Mock Interview Starting Soon', `Hi ${m.student_name},\n\nYour mock interview session on "${m.topic}" is starting in less than 1 hour. Get ready!`);

      // Notify Trainer
      await createNotification(m.trainer_user_id, '⏰ Mock Interview Scheduled Soon', `Your mock interview with ${m.student_name} is starting in less than 1 hour.`, 'INTERVIEW');
      sendGeneralEmail(m.trainer_email, 'Mock Interview Starting Soon', `Hi ${m.trainer_name},\n\nYour mock interview session with ${m.student_name} on "${m.topic}" is starting in less than 1 hour.`);
    }

    // 5. Mock credits nearing expiry (7 days)
    const [expiringCredits] = await pool.query(
      `SELECT s.*, u.id as student_user_id, u.email as student_email, u.full_name as student_name,
              u_sls.id as sales_user_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN admissions adm ON s.id = adm.student_id
       LEFT JOIN users u_sls ON adm.created_by = u_sls.id
       WHERE s.mock_credits_expiry = DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         AND (s.mock_credits_total - s.mock_credits_used) > 0`
    );
    for (let s of expiringCredits) {
      const remaining = s.mock_credits_total - s.mock_credits_used;
      // Notify Student
      await createNotification(s.student_user_id, '🪙 Mock Credits Expiring', `Your ${remaining} mock interview credits will expire in 7 days on ${s.mock_credits_expiry}.`, 'INTERVIEW');
      sendGeneralEmail(s.student_email, 'Mock Interview Credits Expiring Soon', `Hi ${s.student_name},\n\nYou have ${remaining} mock interview credits remaining that are set to expire in 7 days on ${s.mock_credits_expiry}. Please schedule them soon.`);

      // Notify Sales Executive
      if (s.sales_user_id) {
        await createNotification(s.sales_user_id, '🪙 Student Mock Credits Expiring', `Student ${s.student_name} has ${remaining} credits expiring in 7 days.`, 'INTERVIEW');
      }
    }

    // 6. Mock credits exhausted
    const [exhaustedCredits] = await pool.query(
      `SELECT s.*, u.id as student_user_id, u.email as student_email, u.full_name as student_name,
              u_sls.id as sales_user_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN admissions adm ON s.id = adm.student_id
       LEFT JOIN users u_sls ON adm.created_by = u_sls.id
       WHERE s.mock_credits_total > 0 
         AND s.mock_credits_total = s.mock_credits_used`
    );
    for (let s of exhaustedCredits) {
      // Notify Student
      await createNotification(s.student_user_id, '🪙 Mock Credits Exhausted', `You have used all of your mock interview credits.`, 'INTERVIEW');
      sendGeneralEmail(s.student_email, 'Mock Interview Credits Exhausted', `Hi ${s.student_name},\n\nYou have used all of your mock interview credits. Please contact your coordinator if you wish to purchase more.`);

      // Notify Sales Executive
      if (s.sales_user_id) {
        await createNotification(s.sales_user_id, '🪙 Student Mock Credits Exhausted', `Student ${s.student_name} has exhausted all mock interview credits.`, 'INTERVIEW');
      }
    }

    // 7. Assignment due in 24 hours
    const [dueAssignments] = await pool.query(
      `SELECT a.*, u.id as student_user_id, u.email as student_email, u.full_name as student_name
       FROM assignments a
       JOIN batch_students bs ON a.batch_id = bs.batch_id
       JOIN students s ON bs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND s.id = sub.student_id
       WHERE a.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
         AND a.status = 'PUBLISHED'
         AND (sub.id IS NULL OR sub.status = 'PENDING')`
    );
    for (let a of dueAssignments) {
      await createNotification(a.student_user_id, '📝 Assignment Due in 24h', `Your assignment "${a.title}" is due in less than 24 hours.`, 'ASSIGNMENT');
    }

    console.log('[CRON SERVICE] Scheduled notifications check finished.');
  } catch (error) {
    console.error('[CRON SERVICE ERROR] Failed to run cron service check:', error.message);
  }
}

/**
 * Helper to insert notification record
 */
async function createNotification(userId, title, message, type) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [userId, title, message, type]
    );
  } catch (e) {
    console.error('[CRON SERVICE] Failed to insert notification:', e.message);
  }
}

// Export cron checker
module.exports = {
  checkScheduledNotifications
};
