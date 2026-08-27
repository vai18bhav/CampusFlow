/**
 * studentController.js
 * Full CRUD for students including the complete Add Student admission workflow.
 * All write operations use MySQL transactions for atomicity.
 */

const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { createNotification } = require('../utils/notificationHelper');
const { sendStudentWelcomeEmail } = require('../utils/emailService');

// ---------------------------------------------------------------------------
// Helper: create audit log entry (fire-and-forget, non-blocking)
// ---------------------------------------------------------------------------
const logAudit = async (conn, userId, action, entityType, entityId, details, ip) => {
  try {
    await conn.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, details) VALUES (?, ?, ?, ?, ?, ?)',
      [userId || null, action, entityType, entityId || null, ip || null, typeof details === 'string' ? details : JSON.stringify(details)]
    );
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

// ---------------------------------------------------------------------------
// Helper: auto-generate roll number
// ---------------------------------------------------------------------------
const generateRollNumber = (userId) => `STU-${new Date().getFullYear()}-${String(userId).padStart(4, '0')}`;

// ---------------------------------------------------------------------------
// Helper: auto-generate invoice number
// ---------------------------------------------------------------------------
const generateInvoiceNumber = (admissionId) => `INV-${new Date().getFullYear()}-${String(admissionId).padStart(5, '0')}`;

// ---------------------------------------------------------------------------
// POST /api/students
// Creates: user → student → batch_student → admission → invoice → installments
//          → coupon usage → mock credits → audit_log → notification → email
// ---------------------------------------------------------------------------
const createStudent = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      // Personal
      full_name, email, phone, dob, gender, address,
      // Course/Batch
      course_id, batch_id, trainer_id,
      // Admission
      admission_date, currency, total_fee, coupon_code,
      // Instalments
      installment_count,
      // Mock credits
      mock_interview_credits, mock_credit_expiry,
      // Account
      password, roll_number
    } = req.body;

    // ── 1. Validate required fields ──────────────────────────────────────────
    const missingFields = [];
    if (!full_name?.trim()) missingFields.push('full_name');
    if (!email?.trim()) missingFields.push('email');
    if (!phone?.trim()) missingFields.push('phone');
    if (!course_id) missingFields.push('course_id');
    if (!batch_id) missingFields.push('batch_id');
    if (!password?.trim()) missingFields.push('password');

    if (missingFields.length > 0) {
      await connection.rollback();
      return errorResponse(res, 400, `Required fields missing: ${missingFields.join(', ')}`);
    }

    // Phone format validation
    const phoneClean = phone.trim();
    if (!/^[\+\d\s\-\(\)]{7,20}$/.test(phoneClean)) {
      await connection.rollback();
      return errorResponse(res, 400, 'Invalid phone number format');
    }

    const emailClean = email.trim().toLowerCase();

    // ── 2. Unique email check ────────────────────────────────────────────────
    const [existingEmail] = await connection.query('SELECT id FROM users WHERE email = ?', [emailClean]);
    if (existingEmail.length > 0) {
      await connection.rollback();
      return errorResponse(res, 409, 'Email address is already registered');
    }

    // ── 3. Validate course ───────────────────────────────────────────────────
    const [courses] = await connection.query(
      'SELECT id, name, fee_amount, status FROM courses WHERE id = ?',
      [course_id]
    );
    if (courses.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Selected course does not exist');
    }
    if (courses[0].status !== 'ACTIVE') {
      await connection.rollback();
      return errorResponse(res, 400, `Course is currently ${courses[0].status} and not available for new admissions`);
    }
    const course = courses[0];

    // ── 4. Validate batch (course-batch compatibility + capacity) ────────────
    const [batches] = await connection.query(
      `SELECT b.id, b.course_id, b.trainer_id, b.max_students, b.status,
              (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') AS enrolled_count
       FROM batches b WHERE b.id = ?`,
      [batch_id]
    );
    if (batches.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Selected batch does not exist');
    }
    const batch = batches[0];
    if (parseInt(batch.course_id, 10) !== parseInt(course_id, 10)) {
      await connection.rollback();
      return errorResponse(res, 400, 'Selected batch does not belong to the selected course');
    }
    if (['COMPLETED', 'CANCELLED', 'INACTIVE'].includes(batch.status)) {
      await connection.rollback();
      return errorResponse(res, 400, `Cannot enroll in a batch with status '${batch.status}'`);
    }
    if (batch.enrolled_count >= batch.max_students) {
      await connection.rollback();
      return errorResponse(res, 400, `Selected batch is full (${batch.enrolled_count}/${batch.max_students} seats). Please select another batch.`);
    }

    // ── 5. Validate trainer (if explicitly provided, must be valid) ──────────
    const effectiveTrainerId = trainer_id || batch.trainer_id;
    if (trainer_id) {
      const [trainers] = await connection.query('SELECT id FROM trainers WHERE id = ?', [trainer_id]);
      if (trainers.length === 0) {
        await connection.rollback();
        return errorResponse(res, 404, 'Selected trainer does not exist');
      }
    }

    // ── 6. Coupon validation & discount calculation ──────────────────────────
    const courseFee = parseFloat(total_fee !== undefined ? total_fee : course.fee_amount);
    let discountAmount = 0;
    let appliedCouponCode = null;
    let couponId = null;

    if (coupon_code && coupon_code.trim()) {
      const upperCode = coupon_code.trim().toUpperCase();
      const [coupons] = await connection.query('SELECT * FROM coupons WHERE code = ?', [upperCode]);
      if (coupons.length === 0) {
        await connection.rollback();
        return errorResponse(res, 404, `Coupon code '${upperCode}' does not exist`);
      }
      const coupon = coupons[0];
      if (!coupon.is_active) {
        await connection.rollback();
        return errorResponse(res, 400, 'Coupon is currently inactive');
      }
      if (coupon.valid_until) {
        const expiry = new Date(coupon.valid_until);
        expiry.setHours(23, 59, 59, 999);
        if (new Date() > expiry) {
          await connection.rollback();
          return errorResponse(res, 400, 'Coupon has expired');
        }
      }
      if (coupon.current_uses >= coupon.max_uses) {
        await connection.rollback();
        return errorResponse(res, 400, 'Coupon redemption limit has been reached');
      }
      const reqCurrency = (currency || 'ANY').toUpperCase();
      if (coupon.currency && coupon.currency !== 'ANY' && reqCurrency !== 'ANY' && coupon.currency.toUpperCase() !== reqCurrency) {
        await connection.rollback();
        return errorResponse(res, 400, `Coupon is only applicable for ${coupon.currency} transactions`);
      }
      const minVal = parseFloat(coupon.min_order_value || 0);
      if (courseFee < minVal) {
        await connection.rollback();
        return errorResponse(res, 400, `Minimum course fee of ${minVal} required to apply this coupon`);
      }
      if (coupon.discount_type === 'PERCENTAGE') {
        discountAmount = courseFee * (parseFloat(coupon.discount_value) / 100);
      } else {
        discountAmount = parseFloat(coupon.discount_value);
      }
      discountAmount = Math.min(discountAmount, courseFee);
      appliedCouponCode = upperCode;
      couponId = coupon.id;
    }

    const netPayable = Math.max(0, courseFee - discountAmount);

    // ── 7. Hash password ─────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password.trim(), 10);

    // ── 8. Get Student role_id ───────────────────────────────────────────────
    const [roles] = await connection.query("SELECT id FROM roles WHERE name = 'STUDENT' LIMIT 1");
    if (roles.length === 0) {
      await connection.rollback();
      return errorResponse(res, 500, 'STUDENT role not found in database');
    }
    const studentRoleId = roles[0].id;

    // ── 9. Create user account ───────────────────────────────────────────────
    const [userResult] = await connection.query(
      'INSERT INTO users (role_id, full_name, email, password_hash, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
      [studentRoleId, full_name.trim(), emailClean, passwordHash, phoneClean, 'ACTIVE']
    );
    const userId = userResult.insertId;

    // ── 10. Create student profile ───────────────────────────────────────────
    const rollNum = roll_number?.trim() || generateRollNumber(userId);
    const [existRoll] = await connection.query('SELECT id FROM students WHERE roll_number = ?', [rollNum]);
    const finalRollNum = existRoll.length > 0 ? generateRollNumber(userId + Date.now()) : rollNum;

    const [stuResult] = await connection.query(
      `INSERT INTO students 
        (user_id, roll_number, dob, gender, address, mock_interview_credits, mock_credit_expiry)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        finalRollNum,
        dob || null,
        (gender || 'OTHER').toUpperCase(),
        address || null,
        parseInt(mock_interview_credits || 0, 10),
        mock_credit_expiry || null
      ]
    );
    const studentId = stuResult.insertId;

    // ── 11. Enroll in batch ──────────────────────────────────────────────────
    await connection.query(
      'INSERT INTO batch_students (batch_id, student_id, status) VALUES (?, ?, "ENROLLED")',
      [batch_id, studentId]
    );

    // ── 12. Create admission record ──────────────────────────────────────────
    const year = new Date().getFullYear();
    const [countRow] = await connection.query('SELECT COUNT(id) AS total FROM admissions');
    const admSeq = (countRow[0].total || 0) + 1;
    const admissionNumber = `ADM-${year}-${String(admSeq).padStart(4, '0')}`;
    const admDate = admission_date || new Date().toISOString().split('T')[0];

    const [admResult] = await connection.query(
      `INSERT INTO admissions
        (admission_number, student_id, course_id, batch_id, admission_date,
         total_fee, discount_amount, final_fee, status, currency, coupon_code, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?)`,
      [
        admissionNumber, studentId, course_id, batch_id, admDate,
        courseFee, parseFloat(discountAmount.toFixed(2)), parseFloat(netPayable.toFixed(2)),
        (currency || 'INR').toUpperCase(), appliedCouponCode,
        req.user?.id || null
      ]
    );
    const admissionId = admResult.insertId;

    // ── 13. Create invoice ───────────────────────────────────────────────────
    const invoiceNumber = generateInvoiceNumber(admissionId);
    const invDueDate = new Date();
    invDueDate.setDate(invDueDate.getDate() + 30);

    const [invResult] = await connection.query(
      `INSERT INTO invoices
        (admission_id, student_id, course_id, invoice_number, total_amount, discount_amount,
         net_amount, paid_amount, due_amount, invoice_date, due_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, ?, CURDATE(), ?, 'UNPAID', ?)`,
      [
        admissionId, studentId, course_id, invoiceNumber,
        courseFee, parseFloat(discountAmount.toFixed(2)), parseFloat(netPayable.toFixed(2)),
        parseFloat(netPayable.toFixed(2)),
        invDueDate.toISOString().split('T')[0],
        req.user?.id || null
      ]
    );
    const invoiceId = invResult.insertId;

    // ── 14. Create installment records ───────────────────────────────────────
    const numInstallments = Math.max(1, parseInt(installment_count || 1, 10));
    const installAmt = parseFloat((netPayable / numInstallments).toFixed(2));
    const lastInstallAmt = parseFloat((netPayable - installAmt * (numInstallments - 1)).toFixed(2));

    for (let i = 1; i <= numInstallments; i++) {
      const instDue = new Date();
      instDue.setDate(instDue.getDate() + (i - 1) * 30);
      const amt = i === numInstallments ? lastInstallAmt : installAmt;
      await connection.query(
        `INSERT INTO installments
          (invoice_id, installment_number, amount, pending_amount, due_date, status, remarks)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
        [invoiceId, i, amt, amt, instDue.toISOString().split('T')[0], `Instalment ${i} of ${numInstallments}`]
      );
    }

    // ── 15. Increment coupon usage ────────────────────────────────────────────
    if (couponId) {
      await connection.query('UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?', [couponId]);
    }

    // ── 16. Create wallet for student ────────────────────────────────────────
    await connection.query(
      'INSERT INTO student_wallet (student_id, coins_balance, total_earned, total_spent) VALUES (?, 10000, 10000, 0)',
      [studentId]
    );
    await connection.query(
      `INSERT INTO coin_transactions (student_id, type, coins, balance_after, reason, created_by)
       VALUES (?, 'CREDIT', 10000, 10000, 'Welcome bonus on admission', ?)`,
      [studentId, req.user?.id || null]
    );

    // ── 17. Audit log ─────────────────────────────────────────────────────────
    await logAudit(
      connection, req.user?.id, 'CREATE_STUDENT', 'students', studentId,
      `Admin created student: ${emailClean} | Admission: ${admissionNumber} | Invoice: ${invoiceNumber}`,
      req.ip
    );

    // ── 18. Commit ────────────────────────────────────────────────────────────
    await connection.commit();

    // ── 19. Post-commit: notification + email (non-blocking) ─────────────────
    createNotification(
      userId,
      '🎓 Welcome to CampusFlow!',
      `Your admission has been confirmed. Admission No: ${admissionNumber}. Invoice: ${invoiceNumber}. Net Payable: ${netPayable}.`,
      'ADMISSION', 'admission', admissionId
    ).catch(() => {});

    sendStudentWelcomeEmail({
      toEmail: emailClean,
      studentName: full_name.trim(),
      rollNumber: finalRollNum,
      password: password.trim()
    }).catch(err => console.error('Welcome email error:', err.message));

    return successResponse(res, 201, 'Student created and admission confirmed successfully', {
      userId,
      studentId,
      rollNumber: finalRollNum,
      admissionId,
      admissionNumber,
      invoiceId,
      invoiceNumber,
      originalFee: courseFee,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      netPayable: parseFloat(netPayable.toFixed(2)),
      installmentsCreated: numInstallments,
      mockCredits: parseInt(mock_interview_credits || 0, 10)
    });
  } catch (error) {
    await connection.rollback();
    console.error('createStudent error:', error);
    return errorResponse(res, 500, 'Student creation failed. All changes have been rolled back.', error.message);
  } finally {
    connection.release();
  }
};

// ---------------------------------------------------------------------------
// GET /api/students
// Enhanced list with course, batch, trainer, admission, invoice, mock credits
// ---------------------------------------------------------------------------
const getStudents = async (req, res) => {
  try {
    const { search, batch_id, admission_status, outstanding_invoice, min_mock_credits, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT
        s.id AS student_id,
        u.id AS user_id,
        u.full_name, u.email, u.phone, u.status AS account_status, u.avatar_url,
        s.roll_number, s.dob, s.gender, s.address, s.mock_interview_credits, s.mock_credit_expiry,
        s.created_at,
        -- Latest active admission
        a.id AS admission_id, a.admission_number, a.status AS admission_status,
        a.total_fee, a.discount_amount, a.final_fee, a.admission_date,
        -- Course
        c.id AS course_id, c.name AS course_name, c.code AS course_code,
        -- Batch
        b.id AS batch_id, b.name AS batch_name, b.batch_code,
        -- Trainer
        tu.full_name AS trainer_name,
        -- Invoice
        i.id AS invoice_id, i.invoice_number, i.net_amount AS invoice_total,
        i.paid_amount, i.due_amount, i.status AS invoice_status
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN admissions a ON a.student_id = s.id
        AND a.id = (SELECT MAX(a2.id) FROM admissions a2 WHERE a2.student_id = s.id)
      LEFT JOIN courses c ON a.course_id = c.id
      LEFT JOIN batches b ON a.batch_id = b.id
      LEFT JOIN trainers t ON b.trainer_id = t.id
      LEFT JOIN users tu ON t.user_id = tu.id
      LEFT JOIN invoices i ON i.admission_id = a.id
        AND i.id = (SELECT MAX(i2.id) FROM invoices i2 WHERE i2.admission_id = a.id)
      WHERE 1=1
    `;
    const params = [];

    // Role-based scoping
    const userRole = req.user?.role_name?.toUpperCase();
    if (userRole === 'TRAINER') {
      query += ' AND b.trainer_id = ?';
      params.push(req.user.trainer_id || 0);
    }

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR s.roll_number LIKE ?)';
      const t = `%${search}%`;
      params.push(t, t, t, t);
    }
    if (batch_id) { query += ' AND b.id = ?'; params.push(batch_id); }
    if (admission_status) { query += ' AND a.status = ?'; params.push(admission_status.toUpperCase()); }
    if (outstanding_invoice === 'true') { query += " AND i.status IN ('UNPAID','PARTIALLY_PAID','OVERDUE')"; }
    if (min_mock_credits) { query += ' AND s.mock_interview_credits >= ?'; params.push(parseInt(min_mock_credits, 10)); }

    // Count total for pagination
    const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS sub`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;
    query += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [students] = await pool.query(query, params);

    return successResponse(res, 200, 'Students fetched successfully', {
      students,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('getStudents error:', error);
    return errorResponse(res, 500, 'Failed to fetch students', error.message);
  }
};

// ---------------------------------------------------------------------------
// GET /api/students/:id
// ---------------------------------------------------------------------------
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) return errorResponse(res, 400, 'Invalid student ID');

    const [rows] = await pool.query(
      `SELECT
         s.*, u.id AS user_id, u.full_name, u.email, u.phone, u.status AS account_status,
         u.avatar_url, u.created_at AS registered_at
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [id]
    );
    if (rows.length === 0) return errorResponse(res, 404, 'Student not found');

    const student = rows[0];

    // Admissions
    const [admissions] = await pool.query(
      `SELECT a.*, c.name AS course_name, b.name AS batch_name, b.batch_code,
              tu.full_name AS trainer_name
       FROM admissions a
       LEFT JOIN courses c ON a.course_id = c.id
       LEFT JOIN batches b ON a.batch_id = b.id
       LEFT JOIN trainers t ON b.trainer_id = t.id
       LEFT JOIN users tu ON t.user_id = tu.id
       WHERE a.student_id = ? ORDER BY a.id DESC`,
      [id]
    );

    // Invoices
    const [invoices] = await pool.query(
      `SELECT i.*, c.name AS course_name FROM invoices i
       LEFT JOIN courses c ON i.course_id = c.id
       WHERE i.student_id = ? ORDER BY i.id DESC`,
      [id]
    );

    return successResponse(res, 200, 'Student details retrieved', { student, admissions, invoices });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch student details', error.message);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/students/:id
// Update student profile + user record
// ---------------------------------------------------------------------------
const updateStudent = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { full_name, phone, dob, gender, address, mock_interview_credits, mock_credit_expiry } = req.body;

    const [rows] = await connection.query(
      'SELECT s.id, s.user_id FROM students s WHERE s.id = ?', [id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Student not found');
    }
    const { user_id } = rows[0];

    await connection.query(
      'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE id = ?',
      [full_name || null, phone || null, user_id]
    );
    await connection.query(
      `UPDATE students SET
         dob = COALESCE(?, dob),
         gender = COALESCE(?, gender),
         address = COALESCE(?, address),
         mock_interview_credits = COALESCE(?, mock_interview_credits),
         mock_credit_expiry = COALESCE(?, mock_credit_expiry)
       WHERE id = ?`,
      [dob || null, gender || null, address || null,
       mock_interview_credits !== undefined ? mock_interview_credits : null,
       mock_credit_expiry || null, id]
    );

    await logAudit(connection, req.user?.id, 'UPDATE_STUDENT', 'students', parseInt(id), `Updated student id=${id}`, req.ip);
    await connection.commit();
    return successResponse(res, 200, 'Student updated successfully');
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 500, 'Student update failed', error.message);
  } finally {
    connection.release();
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/students/:id/status
// Activate / Deactivate / Suspend student account
// ---------------------------------------------------------------------------
const updateStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return errorResponse(res, 400, `Status must be one of: ${validStatuses.join(', ')}`);
    }
    const [rows] = await pool.query('SELECT user_id FROM students WHERE id = ?', [id]);
    if (rows.length === 0) return errorResponse(res, 404, 'Student not found');

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status.toUpperCase(), rows[0].user_id]);
    return successResponse(res, 200, `Student account status updated to ${status.toUpperCase()}`);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update student status', error.message);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/students/:id  (Super Admin only)
// ---------------------------------------------------------------------------
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT user_id FROM students WHERE id = ?', [id]);
    if (rows.length === 0) return errorResponse(res, 404, 'Student not found');

    // Cascade via FK: deleting user cascades to student → batch_students, etc.
    await pool.query('DELETE FROM users WHERE id = ?', [rows[0].user_id]);
    return successResponse(res, 200, 'Student deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Student deletion failed', error.message);
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  updateStudentStatus,
  deleteStudent
};
