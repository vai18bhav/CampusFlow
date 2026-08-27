const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Helper to get student_id for logged in user
const getStudentId = async (req) => {
  if (req.user.student_id) return req.user.student_id;
  const [rows] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
  return rows.length > 0 ? rows[0].id : null;
};

/**
 * GET /api/student/profile
 */
const getStudentProfile = async (req, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) return errorResponse(res, 404, 'Student profile not found');

    const [rows] = await pool.query(
      `SELECT s.id as student_id, s.roll_number, s.mock_interview_credits, s.mock_credit_expiry,
              u.id as user_id, u.full_name, u.email, u.phone, u.status, u.created_at,
              a.admission_number, a.status as admission_status, a.currency,
              c.name as course_name, c.code as course_code,
              b.name as batch_name, b.batch_code, b.start_date as batch_start_date,
              t_u.full_name as trainer_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN admissions a ON a.student_id = s.id
       LEFT JOIN courses c ON a.course_id = c.id
       LEFT JOIN batches b ON a.batch_id = b.id
       LEFT JOIN trainers t ON b.trainer_id = t.id
       LEFT JOIN users t_u ON t.user_id = t_u.id
       WHERE s.id = ?
       ORDER BY a.id DESC LIMIT 1`,
      [studentId]
    );

    if (rows.length === 0) return errorResponse(res, 404, 'Student profile details not found');

    return successResponse(res, 200, 'Student profile retrieved', { profile: rows[0] });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch student profile', error.message);
  }
};

/**
 * PUT /api/student/profile
 */
const updateStudentProfile = async (req, res) => {
  try {
    const { phone, address, timezone } = req.body;
    const userId = req.user.id;

    if (phone) {
      if (!/^[\+\d\s\-\(\)]{7,20}$/.test(phone.trim())) {
        return errorResponse(res, 400, 'Invalid phone number format');
      }
      await pool.query('UPDATE users SET phone = ? WHERE id = ?', [phone.trim(), userId]);
    }

    return successResponse(res, 200, 'Student profile updated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update student profile', error.message);
  }
};

/**
 * PUT /api/student/password
 */
const updateStudentPassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return errorResponse(res, 400, 'Current password and new password are required');
    }

    if (new_password.length < 6) {
      return errorResponse(res, 400, 'New password must be at least 6 characters');
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (users.length === 0) return errorResponse(res, 404, 'User account not found');

    const match = await bcrypt.compare(current_password, users[0].password);
    if (!match) {
      return errorResponse(res, 400, 'Current password entered is incorrect');
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    return successResponse(res, 200, 'Password updated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update password', error.message);
  }
};

/**
 * GET /api/student/attendance
 */
const getStudentAttendance = async (req, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) return errorResponse(res, 404, 'Student profile not found');

    const [attendance] = await pool.query(
      `SELECT att.id, att.date, att.status, att.remarks, b.name as batch_name, b.batch_code
       FROM attendance att
       JOIN batches b ON att.batch_id = b.id
       WHERE att.student_id = ?
       ORDER BY att.date DESC`,
      [studentId]
    );

    const totalCount = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
    const lateCount = attendance.filter(a => a.status === 'LATE').length;
    const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
    const percentage = totalCount > 0 ? (((presentCount + lateCount) / totalCount) * 100).toFixed(1) : 100.0;

    return successResponse(res, 200, 'Student attendance retrieved', {
      summary: {
        total_classes: totalCount,
        classes_attended: presentCount + lateCount,
        classes_absent: absentCount,
        attendance_percentage: parseFloat(percentage)
      },
      records: attendance
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch attendance', error.message);
  }
};

/**
 * GET /api/student/batch
 */
const getStudentBatch = async (req, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) return errorResponse(res, 404, 'Student profile not found');

    const [batchRows] = await pool.query(
      `SELECT b.id as batch_id, b.name as batch_name, b.batch_code, b.start_date, b.end_date, b.status as batch_status,
              c.name as course_name, c.code as course_code,
              u.full_name as trainer_name, u.email as trainer_email
       FROM batch_students bs
       JOIN batches b ON bs.batch_id = b.id
       JOIN courses c ON b.course_id = c.id
       LEFT JOIN trainers t ON b.trainer_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE bs.student_id = ? AND bs.status = 'ENROLLED' LIMIT 1`,
      [studentId]
    );

    if (batchRows.length === 0) return errorResponse(res, 404, 'No active batch enrollment found for student');

    const batch = batchRows[0];

    // Peer students
    const [peers] = await pool.query(
      `SELECT u.full_name, s.roll_number
       FROM batch_students bs
       JOIN students s ON bs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE bs.batch_id = ? AND bs.status = 'ENROLLED' AND s.id != ?`,
      [batch.batch_id, studentId]
    );

    return successResponse(res, 200, 'Batch details retrieved', { batch, peers });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch batch info', error.message);
  }
};

/**
 * GET /api/student/assignments
 */
const getStudentAssignments = async (req, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) return errorResponse(res, 404, 'Student profile not found');

    const [batchRows] = await pool.query('SELECT batch_id FROM batch_students WHERE student_id = ? AND status = "ENROLLED" LIMIT 1', [studentId]);
    const batchId = batchRows[0]?.batch_id || 1;

    const [assignments] = await pool.query(
      `SELECT a.id, a.title, a.description, a.file_url as attachment_url, a.due_date, a.deadline,
              b.name as batch_name, u.full_name as trainer_name,
              sub.id as submission_id, sub.submission_date, sub.status as completion_status, sub.marks_obtained, sub.feedback
       FROM assignments a
       JOIN batches b ON a.batch_id = b.id
       LEFT JOIN trainers t ON a.trainer_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN assignment_submissions sub ON (sub.assignment_id = a.id AND sub.student_id = ?)
       WHERE a.batch_id = ?
       ORDER BY a.due_date DESC`,
      [studentId, batchId]
    );

    const result = assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      batch_name: a.batch_name,
      trainer_name: a.trainer_name,
      due_date: a.due_date || a.deadline,
      attachment_url: a.attachment_url,
      is_completed: !!a.submission_id,
      completion_status: a.completion_status || 'NOT_COMPLETED',
      marks_obtained: a.marks_obtained,
      feedback: a.feedback
    }));

    return successResponse(res, 200, 'Student assignments retrieved', { assignments: result });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch assignments', error.message);
  }
};

/**
 * PUT /api/student/assignments/:id/completion
 */
const updateAssignmentCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = await getStudentId(req);

    if (!studentId) return errorResponse(res, 404, 'Student profile not found');

    const [submissions] = await pool.query(
      'SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
      [id, studentId]
    );

    if (submissions.length > 0) {
      await pool.query('DELETE FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?', [id, studentId]);
      return successResponse(res, 200, 'Assignment completion toggled to Not Completed');
    } else {
      await pool.query(
        `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, status)
         VALUES (?, ?, 'Marked complete by student', 'SUBMITTED')`,
        [id, studentId]
      );
      return successResponse(res, 200, 'Assignment completion toggled to Completed');
    }
  } catch (error) {
    return errorResponse(res, 500, 'Failed to toggle assignment completion', error.message);
  }
};

/**
 * GET /api/student/mocks
 */
const getStudentMocks = async (req, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) return errorResponse(res, 404, 'Student profile not found');

    const [mocks] = await pool.query(
      `SELECT mi.id, mi.topic, mi.scheduled_date, mi.status, mi.remarks as rejection_reason,
              mi.score, mi.feedback, mi.key_strengths, mi.areas_for_improvement,
              u.full_name as trainer_name
       FROM mock_interviews mi
       LEFT JOIN trainers t ON mi.trainer_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE mi.student_id = ?
       ORDER BY mi.scheduled_date DESC`,
      [studentId]
    );

    return successResponse(res, 200, 'Student mock interviews retrieved', { mocks });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch mock interviews', error.message);
  }
};

/**
 * POST /api/student/mocks
 */
const createMockRequest = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { preferred_date, preferred_time, topic } = req.body;
    const studentId = await getStudentId(req);

    if (!studentId) {
      await conn.rollback();
      return errorResponse(res, 404, 'Student profile not found');
    }

    if (!preferred_date) {
      await conn.rollback();
      return errorResponse(res, 400, 'Preferred date is required');
    }

    // Check credits balance & expiry
    const [students] = await conn.query(
      'SELECT mock_interview_credits, mock_credit_expiry, mock_credits_total, mock_credits_used FROM students WHERE id = ? FOR UPDATE',
      [studentId]
    );

    if (students.length === 0) {
      await conn.rollback();
      return errorResponse(res, 404, 'Student record not found');
    }

    const student = students[0];
    const total = student.mock_interview_credits || student.mock_credits_total || 0;
    const used = student.mock_credits_used || 0;
    const remaining = Math.max(0, total - used);

    if (remaining <= 0) {
      await conn.rollback();
      return errorResponse(res, 400, 'You have 0 remaining mock interview credits.');
    }

    if (student.mock_credit_expiry && new Date(student.mock_credit_expiry) < new Date()) {
      await conn.rollback();
      return errorResponse(res, 400, 'Your mock interview credits have expired.');
    }

    const scheduledDate = `${preferred_date} ${preferred_time || '10:00:00'}`;

    // Get batch trainer_id for student
    const [batchRows] = await conn.query(
      'SELECT b.trainer_id FROM batch_students bs JOIN batches b ON bs.batch_id = b.id WHERE bs.student_id = ? AND bs.status = "ENROLLED" LIMIT 1',
      [studentId]
    );
    const trainerId = batchRows[0]?.trainer_id || 1;

    // Reserve / consume credit
    await conn.query(
      'UPDATE students SET mock_credits_used = mock_credits_used + 1 WHERE id = ?',
      [studentId]
    );

    const [result] = await conn.query(
      `INSERT INTO mock_interviews (student_id, trainer_id, topic, scheduled_date, status)
       VALUES (?, ?, ?, ?, 'SCHEDULED')`,
      [studentId, trainerId, topic || 'General Mock Interview', scheduledDate]
    );

    await conn.commit();
    return successResponse(res, 201, 'Mock interview request submitted successfully', {
      id: result.insertId,
      status: 'PENDING',
      remaining_credits: remaining - 1
    });
  } catch (error) {
    console.error('Mock request creation error detail:', error);
    await conn.rollback();
    return errorResponse(res, 500, 'Failed to schedule mock interview', error.message);
  } finally {
    conn.release();
  }
};

/**
 * GET /api/student/mocks/:id/feedback
 */
const getMockFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = await getStudentId(req);

    const [mocks] = await pool.query(
      `SELECT mi.id, mi.topic, mi.scheduled_date, mi.status, mi.score, mi.feedback,
              mi.key_strengths, mi.areas_for_improvement,
              u.full_name as trainer_name
       FROM mock_interviews mi
       LEFT JOIN trainers t ON mi.trainer_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE mi.id = ? AND mi.student_id = ?`,
      [id, studentId]
    );

    if (mocks.length === 0) return errorResponse(res, 404, 'Mock interview feedback not found for student');

    return successResponse(res, 200, 'Mock interview feedback retrieved', { feedback: mocks[0] });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch mock feedback', error.message);
  }
};

/**
 * GET /api/student/mock-credits
 */
const getStudentMockCredits = async (req, res) => {
  try {
    const studentId = await getStudentId(req);
    const [rows] = await pool.query(
      'SELECT mock_interview_credits, mock_credits_total, mock_credits_used, mock_credit_expiry FROM students WHERE id = ?',
      [studentId]
    );

    if (rows.length === 0) return errorResponse(res, 404, 'Student profile not found');

    const s = rows[0];
    const total = s.mock_interview_credits || s.mock_credits_total || 0;
    const used = s.mock_credits_used || 0;
    const remaining = Math.max(0, total - used);
    const isExpired = s.mock_credit_expiry ? new Date(s.mock_credit_expiry) < new Date() : false;

    return successResponse(res, 200, 'Mock credits balance retrieved', {
      total,
      used,
      remaining,
      expiry_date: s.mock_credit_expiry,
      is_expired: isExpired,
      status: isExpired ? 'Expired' : remaining > 0 ? 'Active' : 'Exhausted'
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch mock credits balance', error.message);
  }
};

/**
 * GET /api/student/invoices
 */
const getStudentInvoices = async (req, res) => {
  try {
    const studentId = await getStudentId(req);
    const [invoices] = await pool.query(
      `SELECT inv.*, c.name as course_name, c.code as course_code
       FROM invoices inv
       LEFT JOIN courses c ON inv.course_id = c.id
       WHERE inv.student_id = ?
       ORDER BY inv.id DESC`,
      [studentId]
    );

    for (let inv of invoices) {
      const [insts] = await pool.query(
        'SELECT * FROM installments WHERE invoice_id = ? ORDER BY installment_number ASC',
        [inv.id]
      );
      inv.installments = insts;
    }

    return successResponse(res, 200, 'Student invoices retrieved', { invoices });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch invoices', error.message);
  }
};

/**
 * GET /api/student/invoices/:id
 */
const getStudentInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = await getStudentId(req);

    const [invoices] = await pool.query(
      `SELECT inv.*, c.name as course_name, c.code as course_code, u.full_name as student_name, u.email as student_email
       FROM invoices inv
       LEFT JOIN courses c ON inv.course_id = c.id
       JOIN students s ON inv.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE inv.id = ? AND inv.student_id = ?`,
      [id, studentId]
    );

    if (invoices.length === 0) return errorResponse(res, 404, 'Invoice not found or unauthorized access');

    const invoice = invoices[0];
    const [installments] = await pool.query(
      'SELECT * FROM installments WHERE invoice_id = ? ORDER BY installment_number ASC',
      [id]
    );
    invoice.installments = installments;

    return successResponse(res, 200, 'Invoice details retrieved', { invoice });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch invoice details', error.message);
  }
};

const { generateInvoicePdfServerSide } = require('../services/invoicePdfService');

/**
 * GET /api/student/invoices/:id/download
 */
const downloadStudentInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = await getStudentId(req);

    const [invoices] = await pool.query(
      'SELECT id FROM invoices WHERE id = ? AND student_id = ?',
      [id, studentId]
    );

    if (invoices.length === 0) return errorResponse(res, 404, 'Invoice not found or unauthorized access');

    const pdfRes = await generateInvoicePdfServerSide(id);
    if (!pdfRes) return errorResponse(res, 500, 'Failed to generate server-side invoice document');

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfRes.fileName}"`);
    return res.send(pdfRes.contentHtml);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to download invoice', error.message);
  }
};

/**
 * GET /api/student/notifications
 */
const getStudentNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50',
      [userId]
    );
    return successResponse(res, 200, 'Notifications retrieved', { notifications });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch notifications', error.message);
  }
};

/**
 * PUT /api/student/notifications/:id/read
 */
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    return successResponse(res, 200, 'Notification marked as read');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update notification', error.message);
  }
};

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  updateStudentPassword,
  getStudentAttendance,
  getStudentBatch,
  getStudentAssignments,
  updateAssignmentCompletion,
  getStudentMocks,
  createMockRequest,
  getMockFeedback,
  getStudentMockCredits,
  getStudentInvoices,
  getStudentInvoiceById,
  downloadStudentInvoicePdf,
  getStudentNotifications,
  markNotificationRead
};
