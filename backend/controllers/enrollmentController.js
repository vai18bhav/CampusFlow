const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendEnrollmentApprovedEmail } = require('../utils/emailService');

/**
 * Deduct coins atomically from student wallet
 */
const deductCoinsForEnrollment = async (conn, studentId, courseId, courseName, coinsRequired, requestId, adminUserId, planLabel) => {
  const [wallets] = await conn.query(
    'SELECT * FROM student_wallet WHERE student_id = ? FOR UPDATE',
    [studentId]
  );
  if (!wallets.length) {
    throw new Error('Student wallet not found. Please initialize wallet first.');
  }

  const currentBalance = wallets[0].coins_balance;
  if (currentBalance < coinsRequired) {
    throw new Error(
      `Insufficient coins. Required: ${coinsRequired} 🪙, Available balance: ${currentBalance} 🪙.`
    );
  }

  const newBalance = currentBalance - coinsRequired;
  const newSpent = wallets[0].total_spent + coinsRequired;

  // Update wallet
  await conn.query(
    'UPDATE student_wallet SET coins_balance = ?, total_spent = ? WHERE student_id = ?',
    [newBalance, newSpent, studentId]
  );

  // Log coin transaction
  await conn.query(
    `INSERT INTO coin_transactions (student_id, type, coins, balance_after, reason, reference_type, reference_id, created_by)
     VALUES (?, 'DEBIT', ?, ?, ?, 'ENROLLMENT', ?, ?)`,
    [
      studentId,
      coinsRequired,
      newBalance,
      `Course Enrollment (${planLabel || 'Initial Installment'}): ${courseName}`,
      requestId,
      adminUserId
    ]
  );

  return newBalance;
};

/**
 * Helper to split course fees into installment milestones
 */
const calculateInstallmentMilestones = (totalFee, plan) => {
  const fee = Math.round(parseFloat(totalFee || 0));
  if (plan === '2_INSTALLMENTS') {
    const inst1 = Math.ceil(fee / 2);
    const inst2 = fee - inst1;
    return [
      { num: 1, amount: inst1, daysOffset: 0 },
      { num: 2, amount: inst2, daysOffset: 30 }
    ];
  }
  if (plan === '3_INSTALLMENTS') {
    const inst1 = Math.round(fee * 0.4);
    const inst2 = Math.round(fee * 0.3);
    const inst3 = fee - inst1 - inst2;
    return [
      { num: 1, amount: inst1, daysOffset: 0 },
      { num: 2, amount: inst2, daysOffset: 30 },
      { num: 3, amount: inst3, daysOffset: 60 }
    ];
  }
  if (plan === '4_INSTALLMENTS') {
    const inst1 = Math.round(fee * 0.25);
    const inst2 = Math.round(fee * 0.25);
    const inst3 = Math.round(fee * 0.25);
    const inst4 = fee - inst1 - inst2 - inst3;
    return [
      { num: 1, amount: inst1, daysOffset: 0 },
      { num: 2, amount: inst2, daysOffset: 30 },
      { num: 3, amount: inst3, daysOffset: 60 },
      { num: 4, amount: inst4, daysOffset: 90 }
    ];
  }
  // Default: FULL payment
  return [{ num: 1, amount: fee, daysOffset: 0 }];
};

/**
 * POST /api/enrollments
 * Student submits a new course enrollment request with preferred payment plan
 */
const createEnrollmentRequest = async (req, res) => {
  try {
    const { course_id, message, payment_plan, installments_count } = req.body;
    if (!course_id) return errorResponse(res, 400, 'course_id is required');

    const [students] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!students.length) return errorResponse(res, 403, 'Only students can submit enrollment requests');
    const student_id = students[0].id;

    const [existing] = await pool.query(
      "SELECT id, status FROM enrollment_requests WHERE student_id = ? AND course_id = ? AND status IN ('PENDING','APPROVED')",
      [student_id, course_id]
    );
    if (existing.length > 0) {
      return errorResponse(res, 409, `You already have a ${existing[0].status} request for this course.`);
    }

    const plan = payment_plan || 'FULL';
    const count = parseInt(installments_count) || (plan === '2_INSTALLMENTS' ? 2 : plan === '3_INSTALLMENTS' ? 3 : plan === '4_INSTALLMENTS' ? 4 : 1);

    const [result] = await pool.query(
      'INSERT INTO enrollment_requests (student_id, course_id, message, payment_plan, installments_count) VALUES (?, ?, ?, ?, ?)',
      [student_id, course_id, message || null, plan, count]
    );
    return successResponse(res, 201, 'Enrollment request submitted with installment plan! Awaiting admin approval.', { id: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to submit enrollment request', error.message);
  }
};

/**
 * PATCH /api/enrollments/:id/approve
 * Admin approves — deducts initial installment coins, creates admission + fee ledger + installment milestones
 */
const approveEnrollment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { batch_id, admin_remarks, payment_plan } = req.body;
    const { id } = req.params;
    if (!batch_id) return errorResponse(res, 400, 'batch_id is required to approve enrollment');

    // Get full enrollment + student + course details
    const [rows] = await conn.query(
      `SELECT er.*,
              u.full_name AS student_name, u.email AS student_email, s.user_id AS student_user_id,
              c.name AS course_name, c.fee_amount,
              b.name AS batch_name, b.batch_code
       FROM enrollment_requests er
       JOIN students s ON er.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN courses c ON er.course_id = c.id
       JOIN batches b ON b.id = ?
       WHERE er.id = ?`,
      [batch_id, id]
    );
    if (!rows.length) return errorResponse(res, 404, 'Enrollment request not found');
    const reqData = rows[0];
    if (reqData.status !== 'PENDING') return errorResponse(res, 400, 'This request is no longer pending');

    // Determine chosen payment plan
    const effectivePlan = payment_plan || reqData.payment_plan || 'FULL';
    const totalFee = Math.round(parseFloat(reqData.fee_amount || 0));
    const milestones = calculateInstallmentMilestones(totalFee, effectivePlan);
    const upfrontCoins = milestones[0]?.amount || totalFee;
    const isFullPayment = effectivePlan === 'FULL' || milestones.length === 1;

    // 💰 Deduct upfront installment coins from student wallet
    let newBalance = 0;
    if (upfrontCoins > 0) {
      newBalance = await deductCoinsForEnrollment(
        conn,
        reqData.student_id,
        reqData.course_id,
        reqData.course_name,
        upfrontCoins,
        id,
        req.user.id,
        isFullPayment ? 'Full Payment' : `Installment 1 of ${milestones.length}`
      );
    }

    // 1. Update enrollment request to APPROVED
    await conn.query(
      'UPDATE enrollment_requests SET status=?, batch_id=?, admin_remarks=?, reviewed_by=?, reviewed_at=NOW(), coins_deducted=?, payment_plan=?, installments_count=? WHERE id=?',
      ['APPROVED', batch_id, admin_remarks || null, req.user.id, upfrontCoins, effectivePlan, milestones.length, id]
    );

    // 2. Add student to batch_students
    const [existingBatch] = await conn.query(
      'SELECT id FROM batch_students WHERE batch_id = ? AND student_id = ?',
      [batch_id, reqData.student_id]
    );
    if (!existingBatch.length) {
      await conn.query(
        "INSERT INTO batch_students (batch_id, student_id, status) VALUES (?, ?, 'ENROLLED')",
        [batch_id, reqData.student_id]
      );
    }

    // 3. Create Admission record
    const admNo = `ADM-${Date.now()}`;
    const [admResult] = await conn.query(
      `INSERT INTO admissions (admission_number, student_id, course_id, batch_id, admission_date, total_fee, final_fee, discount_amount, status, created_by)
       VALUES (?, ?, ?, ?, CURDATE(), ?, ?, 0, 'CONFIRMED', ?)`,
      [admNo, reqData.student_id, reqData.course_id, batch_id, totalFee, totalFee, req.user.id]
    );
    const admissionId = admResult.insertId;

    // 4. Create Invoice
    const invoiceNo = `INV-${Date.now()}`;
    const invoiceStatus = isFullPayment ? 'PAID' : 'PARTIALLY_PAID';
    const dueAmount = Math.max(0, totalFee - upfrontCoins);
    const [invResult] = await conn.query(
      `INSERT INTO invoices (admission_id, student_id, course_id, invoice_number, total_amount, net_amount, paid_amount, due_amount, invoice_date, due_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, ?)`,
      [
        admissionId,
        reqData.student_id,
        reqData.course_id,
        invoiceNo,
        totalFee,
        totalFee,
        upfrontCoins,
        dueAmount,
        isFullPayment ? 0 : 30,
        invoiceStatus,
        req.user.id
      ]
    );
    const invoiceId = invResult.insertId;

    // 5. Create Payment record for 1st installment
    let firstPaymentId = null;
    if (upfrontCoins > 0) {
      const [payResult] = await conn.query(
        `INSERT INTO payments (invoice_id, student_id, amount, payment_date, payment_method, transaction_reference, remarks, received_by)
         VALUES (?, ?, ?, CURDATE(), 'ONLINE', ?, ?, ?)`,
        [
          invoiceId,
          reqData.student_id,
          upfrontCoins,
          `COINS-ENROLL-INST1-${id}`,
          isFullPayment
            ? `Paid in full via ${upfrontCoins} Coins. Wallet balance: ${newBalance} 🪙`
            : `Installment 1/${milestones.length} paid via ${upfrontCoins} Coins. Remaining due: ${dueAmount} 🪙`,
          req.user.id
        ]
      );
      firstPaymentId = payResult.insertId;
    }

    // 6. Create Installment Milestones in `installments` table
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const isFirst = i === 0;
      await conn.query(
        `INSERT INTO installments (admission_id, invoice_id, installment_number, amount, paid_amount, pending_amount, due_date, paid_date, status, payment_mode, transaction_id)
         VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, ?, ?, ?)`,
        [
          admissionId,
          invoiceId,
          m.num,
          m.amount,
          isFirst ? m.amount : 0,
          isFirst ? 0 : m.amount,
          m.daysOffset,
          isFirst ? new Date().toISOString().split('T')[0] : null,
          isFirst ? 'PAID' : 'PENDING',
          isFirst ? 'COINS' : null,
          isFirst ? `COINS-INST1-${id}` : null
        ]
      );
    }

    // 7. In-app notification to student
    await conn.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ADMISSION')",
      [
        reqData.student_user_id,
        `✅ Enrollment Approved — ${reqData.course_name}`,
        isFullPayment
          ? `You have been enrolled in ${reqData.batch_name}. ${upfrontCoins} coins deducted. Wallet balance: ${newBalance} 🪙`
          : `Enrolled in ${reqData.batch_name} on ${milestones.length}-Installment Plan! Upfront: ${upfrontCoins} coins deducted. Balance due in upcoming installments.`
      ]
    );

    await conn.commit();

    // 8. Send Confirmation Email via SMTP
    sendEnrollmentApprovedEmail({
      to: reqData.student_email,
      studentName: reqData.student_name,
      courseName: reqData.course_name,
      batchName: reqData.batch_name,
      batchCode: reqData.batch_code,
      coinsDeducted: upfrontCoins,
      remainingCoins: newBalance,
      planLabel: isFullPayment ? 'Full Payment' : `${milestones.length} Installments`,
      invoiceNumber: invoiceNo
    }).catch(e => console.error('[EMAIL ERROR]', e.message));

    return successResponse(res, 200, 'Enrollment approved! Upfront coins deducted, admission created, and installment milestones scheduled.', {
      admission_id: admissionId,
      admission_number: admNo,
      invoice_number: invoiceNo,
      coins_deducted: upfrontCoins,
      remaining_balance: newBalance,
      payment_plan: effectivePlan,
      total_installments: milestones.length
    });
  } catch (error) {
    await conn.rollback();
    return errorResponse(res, 500, error.message || 'Failed to approve enrollment');
  } finally {
    conn.release();
  }
};

/**
 * PATCH /api/enrollments/:id/reject
 */
const rejectEnrollment = async (req, res) => {
  try {
    const { admin_remarks } = req.body;
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT er.*, s.user_id AS student_user_id, c.name AS course_name
       FROM enrollment_requests er
       JOIN students s ON er.student_id = s.id
       JOIN courses c ON er.course_id = c.id
       WHERE er.id = ?`,
      [id]
    );
    if (!rows.length) return errorResponse(res, 404, 'Enrollment request not found');
    if (rows[0].status !== 'PENDING') return errorResponse(res, 400, 'Request is no longer pending');

    await pool.query(
      'UPDATE enrollment_requests SET status=?, admin_remarks=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?',
      ['REJECTED', admin_remarks || null, req.user.id, id]
    );

    // Notify student
    await pool.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ADMISSION')",
      [
        rows[0].student_user_id,
        `❌ Enrollment Request Rejected — ${rows[0].course_name}`,
        `Your enrollment request was not approved. Remarks: ${admin_remarks || 'Contact administration for details.'}`
      ]
    );

    return successResponse(res, 200, 'Enrollment request rejected.');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to reject enrollment', error.message);
  }
};

/**
 * GET /api/enrollments
 */
const getEnrollmentRequests = async (req, res) => {
  try {
    const isStudent = (req.user?.role_name || req.user?.role) === 'STUDENT';
    let query = `
      SELECT er.*,
             u.full_name AS student_name, u.email AS student_email, u.phone AS student_phone,
             c.name AS course_name, c.fee_amount, c.duration_weeks,
             b.name AS batch_name, b.batch_code,
             rev.full_name AS reviewer_name
      FROM enrollment_requests er
      JOIN students s ON er.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN courses c ON er.course_id = c.id
      LEFT JOIN batches b ON er.batch_id = b.id
      LEFT JOIN users rev ON er.reviewed_by = rev.id
    `;
    const params = [];
    if (isStudent) {
      const [stu] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (stu.length) {
        query += ' WHERE er.student_id = ?';
        params.push(stu[0].id);
      }
    }
    query += ' ORDER BY er.created_at DESC';

    const [requests] = await pool.query(query, params);
    return successResponse(res, 200, 'Enrollment requests fetched', { requests });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch enrollment requests', error.message);
  }
};

module.exports = {
  createEnrollmentRequest,
  approveEnrollment,
  rejectEnrollment,
  getEnrollmentRequests
};
