const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendEnrollmentDecisionEmail } = require('../utils/emailService');
const { deductCoinsForEnrollment } = require('./walletController');

/**
 * GET /api/enrollments
 * Admin: all requests | Student: their own
 */
const getEnrollmentRequests = async (req, res) => {
  try {
    const user = req.user;
    let query = `
      SELECT er.*,
             u.full_name AS student_name, u.email AS student_email,
             c.name AS course_name, c.code AS course_code, c.fee_amount,
             b.name AS batch_name, b.batch_code, b.start_date, b.timing,
             rev.full_name AS reviewed_by_name,
             sw.coins_balance AS student_coins
      FROM enrollment_requests er
      JOIN students s ON er.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN courses c ON er.course_id = c.id
      LEFT JOIN batches b ON er.batch_id = b.id
      LEFT JOIN users rev ON er.reviewed_by = rev.id
      LEFT JOIN student_wallet sw ON sw.student_id = s.id
    `;
    const params = [];
    if (user.role === 'STUDENT') {
      query += ' WHERE er.student_id = (SELECT id FROM students WHERE user_id = ?)';
      params.push(user.id);
    }
    query += ' ORDER BY er.created_at DESC';
    const [requests] = await pool.query(query, params);
    return successResponse(res, 200, 'Enrollment requests fetched', { requests });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch enrollment requests', error.message);
  }
};

/**
 * POST /api/enrollments
 * Student submits a new course enrollment request
 */
const createEnrollmentRequest = async (req, res) => {
  try {
    const { course_id, message } = req.body;
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

    const [result] = await pool.query(
      'INSERT INTO enrollment_requests (student_id, course_id, message) VALUES (?, ?, ?)',
      [student_id, course_id, message || null]
    );
    return successResponse(res, 201, 'Enrollment request submitted! Awaiting admin approval.', { id: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to submit enrollment request', error.message);
  }
};

/**
 * PATCH /api/enrollments/:id/approve
 * Admin approves — deducts coins (= course fee), creates admission + fee records, enrolls in batch
 */
const approveEnrollment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { batch_id, admin_remarks } = req.body;
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

    // Course fee in coins (1 coin = ₹1)
    const coinsRequired = Math.round(parseFloat(reqData.fee_amount || 0));

    // 💰 Deduct coins from student wallet
    let newBalance = 0;
    if (coinsRequired > 0) {
      newBalance = await deductCoinsForEnrollment(
        conn,
        reqData.student_id,
        reqData.course_id,
        reqData.course_name,
        coinsRequired,
        id,
        req.user.id
      );
    }

    // 1. Update enrollment request to APPROVED
    await conn.query(
      'UPDATE enrollment_requests SET status=?, batch_id=?, admin_remarks=?, reviewed_by=?, reviewed_at=NOW(), coins_deducted=? WHERE id=?',
      ['APPROVED', batch_id, admin_remarks || null, req.user.id, coinsRequired, id]
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
      [admNo, reqData.student_id, reqData.course_id, batch_id, coinsRequired, coinsRequired, req.user.id]
    );
    const admissionId = admResult.insertId;

    // 4. Create Invoice & Payment record (paid in full via coins)
    const invoiceNo = `INV-${Date.now()}`;
    const [invResult] = await conn.query(
      `INSERT INTO invoices (admission_id, student_id, course_id, invoice_number, total_amount, net_amount, paid_amount, due_amount, invoice_date, due_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, CURDATE(), CURDATE(), 'PAID', ?)`,
      [admissionId, reqData.student_id, reqData.course_id, invoiceNo, coinsRequired, coinsRequired, coinsRequired, req.user.id]
    );

    if (coinsRequired > 0) {
      await conn.query(
        `INSERT INTO payments (invoice_id, student_id, amount, payment_date, payment_method, transaction_reference, remarks, received_by)
         VALUES (?, ?, ?, CURDATE(), 'ONLINE', ?, ?, ?)`,
        [invResult.insertId, reqData.student_id, coinsRequired, `COINS-ENROLL-${id}`, `Paid in full via ${coinsRequired} Coins. Remaining balance: ${newBalance} 🪙`, req.user.id]
      );
    }

    // 5. In-app notification to student
    await conn.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ADMISSION')",
      [
        reqData.student_user_id,
        `✅ Enrollment Approved — ${reqData.course_name}`,
        `You have been enrolled in ${reqData.batch_name}. ${coinsRequired} coins were deducted. Your wallet balance: ${newBalance} 🪙`
      ]
    );

    await conn.commit();

    // 6. Gmail notification
    sendEnrollmentDecisionEmail({
      toEmail: reqData.student_email,
      studentName: reqData.student_name,
      courseName: reqData.course_name,
      batchName: reqData.batch_name,
      status: 'APPROVED',
      adminRemarks: admin_remarks,
      coinsDeducted: coinsRequired,
      newBalance
    }).catch(err => console.error('Email error:', err.message));

    return successResponse(res, 200, `Enrollment approved! ${coinsRequired} coins deducted. Admission #${admNo} created.`, {
      admission_number: admNo,
      invoice_number: invoiceNo,
      coins_deducted: coinsRequired,
      student_balance: newBalance
    });
  } catch (error) {
    await conn.rollback();
    // Pass coin error message (insufficient balance) directly
    const statusCode = error.message?.includes('Insufficient coins') ? 402 : 500;
    return errorResponse(res, statusCode, error.message || 'Failed to approve enrollment');
  } finally {
    conn.release();
  }
};

/**
 * PATCH /api/enrollments/:id/reject
 * Admin rejects — no coins deducted
 */
const rejectEnrollment = async (req, res) => {
  try {
    const { admin_remarks } = req.body;
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT er.*, u.full_name AS student_name, u.email AS student_email, s.user_id AS student_user_id,
              c.name AS course_name
       FROM enrollment_requests er
       JOIN students s ON er.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN courses c ON er.course_id = c.id
       WHERE er.id = ?`, [id]
    );
    if (!rows.length) return errorResponse(res, 404, 'Enrollment request not found');
    const reqData = rows[0];
    if (reqData.status !== 'PENDING') return errorResponse(res, 400, 'This request is no longer pending');

    await pool.query(
      'UPDATE enrollment_requests SET status=?, admin_remarks=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?',
      ['REJECTED', admin_remarks || null, req.user.id, id]
    );

    await pool.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ADMISSION')",
      [reqData.student_user_id, `📋 Enrollment Update — ${reqData.course_name}`, `Your enrollment request was not approved. No coins were deducted. Contact admin for details.`]
    );

    sendEnrollmentDecisionEmail({
      toEmail: reqData.student_email,
      studentName: reqData.student_name,
      courseName: reqData.course_name,
      status: 'REJECTED',
      adminRemarks: admin_remarks
    }).catch(err => console.error('Email error:', err.message));

    return successResponse(res, 200, 'Enrollment request rejected. No coins deducted.');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to reject enrollment', error.message);
  }
};

module.exports = { getEnrollmentRequests, createEnrollmentRequest, approveEnrollment, rejectEnrollment };
