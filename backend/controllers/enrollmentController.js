const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendEnrollmentDecisionEmail } = require('../utils/emailService');

/**
 * GET /api/enrollments
 * Admin: all requests | Student: their own requests
 */
const getEnrollmentRequests = async (req, res) => {
  try {
    const user = req.user;
    let query = `
      SELECT er.*,
             u.full_name AS student_name, u.email AS student_email,
             c.name AS course_name, c.code AS course_code, c.fee_amount,
             b.name AS batch_name, b.batch_code, b.start_date, b.timing,
             rev.full_name AS reviewed_by_name
      FROM enrollment_requests er
      JOIN students s ON er.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN courses c ON er.course_id = c.id
      LEFT JOIN batches b ON er.batch_id = b.id
      LEFT JOIN users rev ON er.reviewed_by = rev.id
    `;
    const params = [];

    // Students only see their own requests
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

    // Get student record for this user
    const [students] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!students.length) return errorResponse(res, 403, 'Only students can submit enrollment requests');
    const student_id = students[0].id;

    // Check if already requested for this course (pending or approved)
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
 * Admin approves enrollment — selects a batch, auto-creates admission + batch_student record
 */
const approveEnrollment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { batch_id, admin_remarks } = req.body;
    const { id } = req.params;
    if (!batch_id) return errorResponse(res, 400, 'batch_id is required to approve enrollment');

    // Get enrollment request details
    const [rows] = await conn.query(
      `SELECT er.*, u.full_name AS student_name, u.email AS student_email,
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
    const req_data = rows[0];
    if (req_data.status !== 'PENDING') return errorResponse(res, 400, 'This request is no longer pending');

    // 1. Update request status
    await conn.query(
      'UPDATE enrollment_requests SET status = ?, batch_id = ?, admin_remarks = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      ['APPROVED', batch_id, admin_remarks || null, req.user.id, id]
    );

    // 2. Check if student already in batch_students
    const [existingBatch] = await conn.query(
      'SELECT id FROM batch_students WHERE batch_id = ? AND student_id = ?',
      [batch_id, req_data.student_id]
    );
    if (!existingBatch.length) {
      await conn.query(
        "INSERT INTO batch_students (batch_id, student_id, status) VALUES (?, ?, 'ENROLLED')",
        [batch_id, req_data.student_id]
      );
    }

    // 3. Create admission record
    const admNo = `ADM-${Date.now()}`;
    await conn.query(
      `INSERT INTO admissions (admission_number, student_id, course_id, batch_id, admission_date, total_fee, final_fee, status, created_by)
       VALUES (?, ?, ?, ?, CURDATE(), ?, ?, 'CONFIRMED', ?)`,
      [admNo, req_data.student_id, req_data.course_id, batch_id, req_data.fee_amount, req_data.fee_amount, req.user.id]
    );

    // 4. Notification in DB
    const [stuUser] = await conn.query('SELECT user_id FROM students WHERE id = ?', [req_data.student_id]);
    if (stuUser.length) {
      await conn.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ADMISSION')",
        [stuUser[0].user_id, `✅ Enrollment Approved — ${req_data.course_name}`, `You have been enrolled in ${req_data.batch_name}. Welcome aboard!`]
      );
    }

    await conn.commit();

    // 5. Send Gmail
    sendEnrollmentDecisionEmail({
      toEmail: req_data.student_email,
      studentName: req_data.student_name,
      courseName: req_data.course_name,
      batchName: req_data.batch_name,
      status: 'APPROVED',
      adminRemarks: admin_remarks
    }).catch(err => console.error('Email error:', err.message));

    return successResponse(res, 200, `Enrollment approved! ${req_data.student_name} enrolled in ${req_data.batch_name}.`, { admission_number: admNo });
  } catch (error) {
    await conn.rollback();
    return errorResponse(res, 500, 'Failed to approve enrollment', error.message);
  } finally {
    conn.release();
  }
};

/**
 * PATCH /api/enrollments/:id/reject
 * Admin rejects enrollment request
 */
const rejectEnrollment = async (req, res) => {
  try {
    const { admin_remarks } = req.body;
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT er.*, u.full_name AS student_name, u.email AS student_email, c.name AS course_name
       FROM enrollment_requests er
       JOIN students s ON er.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN courses c ON er.course_id = c.id
       WHERE er.id = ?`,
      [id]
    );
    if (!rows.length) return errorResponse(res, 404, 'Enrollment request not found');
    const req_data = rows[0];
    if (req_data.status !== 'PENDING') return errorResponse(res, 400, 'This request is no longer pending');

    await pool.query(
      'UPDATE enrollment_requests SET status = ?, admin_remarks = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      ['REJECTED', admin_remarks || null, req.user.id, id]
    );

    // Notification
    const [stuUser] = await pool.query('SELECT user_id FROM students WHERE id = ?', [req_data.student_id]);
    if (stuUser.length) {
      await pool.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ADMISSION')",
        [stuUser[0].user_id, `📋 Enrollment Update — ${req_data.course_name}`, `Your enrollment request was not approved. Please contact the admin for details.`]
      );
    }

    // Send Gmail
    sendEnrollmentDecisionEmail({
      toEmail: req_data.student_email,
      studentName: req_data.student_name,
      courseName: req_data.course_name,
      status: 'REJECTED',
      adminRemarks: admin_remarks
    }).catch(err => console.error('Email error:', err.message));

    return successResponse(res, 200, 'Enrollment request rejected');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to reject enrollment', error.message);
  }
};

module.exports = { getEnrollmentRequests, createEnrollmentRequest, approveEnrollment, rejectEnrollment };
