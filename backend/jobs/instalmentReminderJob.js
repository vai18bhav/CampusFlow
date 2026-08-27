const pool = require('../config/db');
const { sendNotification } = require('../services/notificationService');

/**
 * Checks for upcoming fee instalments due in 3 days and overdue instalments.
 */
const checkInstalments = async () => {
  try {
    // 1. Instalments Due in 3 Days
    const [upcoming] = await pool.query(
      `SELECT inst.id as installment_id, inst.amount, inst.due_date, inst.installment_number,
              inv.id as invoice_id, inv.invoice_number, inv.currency,
              s.id as student_id, s.user_id as student_user_id, u_stu.full_name as student_name,
              se.user_id as sales_user_id
       FROM installments inst
       JOIN invoices inv ON inst.invoice_id = inv.id
       JOIN students s ON inv.student_id = s.id
       JOIN users u_stu ON s.user_id = u_stu.id
       LEFT JOIN admissions a ON a.student_id = s.id
       LEFT JOIN admission_links al ON a.admission_link_id = al.id
       LEFT JOIN sales_executives se ON al.sales_exec_id = se.id
       WHERE inst.status = 'PENDING'
         AND inst.due_date >= CURRENT_DATE()
         AND inst.due_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY)`
    );

    for (const inst of upcoming) {
      const title = `Instalment Due in 3 Days — Invoice #${inst.invoice_number}`;
      const msg = `Fee instalment of ${inst.currency === 'USD' ? '$' : '₹'}${inst.amount} for Invoice #${inst.invoice_number} is due on ${inst.due_date}.`;

      // Notify Student
      await sendNotification({
        userId: inst.student_user_id,
        title,
        message: msg,
        type: 'FINANCE',
        templateCode: 'INSTALMENT_DUE_3DAYS',
        variables: {
          student_name: inst.student_name,
          invoice_number: inst.invoice_number,
          amount: inst.amount,
          currency: inst.currency,
          due_date: inst.due_date
        },
        referenceType: 'installment',
        referenceId: inst.installment_id,
        sendInApp: true,
        sendEmail: true,
        preventDuplicates: true
      });

      // Notify Sales Executive
      if (inst.sales_user_id) {
        await sendNotification({
          userId: inst.sales_user_id,
          title,
          message: `Student ${inst.student_name}'s instalment for Invoice #${inst.invoice_number} is due in 3 days.`,
          type: 'FINANCE',
          templateCode: 'INSTALMENT_DUE_3DAYS',
          variables: {
            student_name: inst.student_name,
            invoice_number: inst.invoice_number,
            amount: inst.amount,
            currency: inst.currency,
            due_date: inst.due_date
          },
          referenceType: 'installment',
          referenceId: inst.installment_id,
          sendInApp: true,
          sendEmail: true,
          preventDuplicates: true
        });
      }
    }

    // 2. Overdue Instalments
    const [overdue] = await pool.query(
      `SELECT inst.id as installment_id, inst.amount, inst.due_date,
              inv.id as invoice_id, inv.invoice_number, inv.currency,
              s.id as student_id, s.user_id as student_user_id, u_stu.full_name as student_name,
              se.user_id as sales_user_id
       FROM installments inst
       JOIN invoices inv ON inst.invoice_id = inv.id
       JOIN students s ON inv.student_id = s.id
       JOIN users u_stu ON s.user_id = u_stu.id
       LEFT JOIN admissions a ON a.student_id = s.id
       LEFT JOIN admission_links al ON a.admission_link_id = al.id
       LEFT JOIN sales_executives se ON al.sales_exec_id = se.id
       WHERE inst.status = 'PENDING'
         AND inst.due_date < CURRENT_DATE()`
    );

    // Get Admin Users for Overdue Notifications
    const [adminRows] = await pool.query('SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "ADMIN"');
    const adminUserIds = adminRows.map(a => a.id);

    for (const inst of overdue) {
      const title = `OVERDUE: Fee Instalment — Invoice #${inst.invoice_number}`;
      const msg = `Fee instalment of ${inst.currency === 'USD' ? '$' : '₹'}${inst.amount} for Invoice #${inst.invoice_number} is past due (${inst.due_date}).`;

      // Notify Student
      await sendNotification({
        userId: inst.student_user_id,
        title,
        message: msg,
        type: 'FINANCE',
        templateCode: 'INSTALMENT_OVERDUE',
        variables: {
          student_name: inst.student_name,
          invoice_number: inst.invoice_number,
          amount: inst.amount,
          currency: inst.currency,
          due_date: inst.due_date
        },
        referenceType: 'installment',
        referenceId: inst.installment_id,
        sendInApp: true,
        sendEmail: true,
        preventDuplicates: true
      });

      // Notify Sales Executive
      if (inst.sales_user_id) {
        await sendNotification({
          userId: inst.sales_user_id,
          title,
          message: `Overdue instalment alert for student ${inst.student_name} (Invoice #${inst.invoice_number}).`,
          type: 'FINANCE',
          templateCode: 'INSTALMENT_OVERDUE',
          variables: {
            student_name: inst.student_name,
            invoice_number: inst.invoice_number,
            amount: inst.amount,
            currency: inst.currency,
            due_date: inst.due_date
          },
          referenceType: 'installment',
          referenceId: inst.installment_id,
          sendInApp: true,
          sendEmail: true,
          preventDuplicates: true
        });
      }

      // Notify Admin
      for (const adminId of adminUserIds) {
        await sendNotification({
          userId: adminId,
          title,
          message: `Overdue fee instalment for student ${inst.student_name} (Invoice #${inst.invoice_number}).`,
          type: 'FINANCE',
          templateCode: 'INSTALMENT_OVERDUE',
          variables: {
            student_name: inst.student_name,
            invoice_number: inst.invoice_number,
            amount: inst.amount,
            currency: inst.currency,
            due_date: inst.due_date
          },
          referenceType: 'installment',
          referenceId: inst.installment_id,
          sendInApp: true,
          sendEmail: true,
          preventDuplicates: true
        });
      }
    }
  } catch (error) {
    console.error('Instalment Reminder Job Error:', error.message);
  }
};

module.exports = { checkInstalments };
