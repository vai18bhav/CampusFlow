/**
 * admissionLinkController.js
 * Handles:
 *  - Sales Executive generating shareable admission links
 *  - Prospective students submitting the public admission form
 *  - Admin approving/rejecting link-based admissions
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { createNotification } = require('../utils/notificationHelper');
const { sendStudentWelcomeEmail } = require('../utils/emailService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const generateRollNumber = (userId) => `STU-${new Date().getFullYear()}-${String(userId).padStart(4, '0')}`;
const generateAdmissionNumber = async (conn) => {
  const year = new Date().getFullYear();
  const [r] = await conn.query('SELECT COUNT(id) AS total FROM admissions');
  return `ADM-${year}-${String((r[0].total || 0) + 1).padStart(4, '0')}`;
};
const generateInvoiceNumber = (admissionId) => `INV-${new Date().getFullYear()}-${String(admissionId).padStart(5, '0')}`;

// ---------------------------------------------------------------------------
// POST /api/admission-links
// Sales Executive creates a shareable admission link
// ---------------------------------------------------------------------------
const createAdmissionLink = async (req, res) => {
  try {
    const { course_id, currency, expires_in_days } = req.body;
    const salesExecId = req.user?.sales_exec_id || null;

    // Verify course exists if provided
    if (course_id) {
      const [courses] = await pool.query('SELECT id FROM courses WHERE id = ? AND status = "ACTIVE"', [course_id]);
      if (courses.length === 0) return errorResponse(res, 404, 'Course not found or inactive');
    }

    const token = crypto.randomBytes(32).toString('hex');
    let expiresAt = null;
    if (expires_in_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expires_in_days, 10));
    }

    const [result] = await pool.query(
      'INSERT INTO admission_links (token, sales_exec_id, course_id, currency, expires_at) VALUES (?, ?, ?, ?, ?)',
      [token, salesExecId, course_id || null, (currency || 'ANY').toUpperCase(), expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const admissionUrl = `${frontendUrl}/apply/${token}`;

    return successResponse(res, 201, 'Admission link created successfully', {
      id: result.insertId,
      token,
      admissionUrl,
      currency: (currency || 'ANY').toUpperCase(),
      expiresAt
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to create admission link', error.message);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admission-links
// List all admission links (filtered by exec for non-admins)
// ---------------------------------------------------------------------------
const getAdmissionLinks = async (req, res) => {
  try {
    const userRole = req.user?.role_name?.toUpperCase();
    let query = `
      SELECT al.*, c.name AS course_name,
             u.full_name AS created_by_name,
             (SELECT COUNT(*) FROM admissions a WHERE a.admission_link_id = al.id) AS submissions_count
      FROM admission_links al
      LEFT JOIN courses c ON al.course_id = c.id
      LEFT JOIN sales_executives se ON al.sales_exec_id = se.id
      LEFT JOIN users u ON se.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      query += ' AND al.sales_exec_id = ?';
      params.push(req.user.sales_exec_id || 0);
    }

    query += ' ORDER BY al.id DESC';
    const [links] = await pool.query(query, params);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    links.forEach(l => { l.admission_url = `${frontendUrl}/apply/${l.token}`; });

    return successResponse(res, 200, 'Admission links retrieved', { links });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch admission links', error.message);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admission-links/:token  (PUBLIC — no auth)
// Returns link metadata so the form can pre-fill course/currency
// ---------------------------------------------------------------------------
const getAdmissionLinkInfo = async (req, res) => {
  try {
    const { token } = req.params;
    const [links] = await pool.query(
      `SELECT al.id, al.currency, al.status, al.expires_at,
              c.id AS course_id, c.name AS course_name, c.fee_amount, c.description
       FROM admission_links al
       LEFT JOIN courses c ON al.course_id = c.id
       WHERE al.token = ?`,
      [token]
    );
    if (links.length === 0) return errorResponse(res, 404, 'Admission link not found');

    const link = links[0];
    if (link.status !== 'ACTIVE' && link.status !== 'OPENED' && link.status !== 'IN_PROGRESS') {
      return errorResponse(res, 400, 'This admission link is no longer active');
    }
    if (link.expires_at && new Date() > new Date(link.expires_at)) {
      await pool.query('UPDATE admission_links SET status = "EXPIRED" WHERE token = ?', [token]);
      return errorResponse(res, 400, 'This admission link has expired');
    }

    return successResponse(res, 200, 'Link info retrieved', { link });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch link info', error.message);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admission-links/:token/submit  (PUBLIC — no auth)
// Prospective student submits the form. Creates admission with status SUBMITTED.
// ---------------------------------------------------------------------------
const submitAdmissionForm = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { token } = req.params;
    const { full_name, email, phone, dob, gender, address, course_id, currency, coupon_code, message } = req.body;

    // Validate required fields
    if (!full_name?.trim() || !email?.trim() || !phone?.trim()) {
      await connection.rollback();
      return errorResponse(res, 400, 'Full name, email, and phone are required');
    }

    // Phone format validation
    if (!/^[\+\d\s\-\(\)]{7,20}$/.test(phone.trim())) {
      await connection.rollback();
      return errorResponse(res, 400, 'Invalid phone number format');
    }

    // Validate link
    const [links] = await connection.query('SELECT * FROM admission_links WHERE token = ?', [token]);
    if (links.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Admission link not found');
    }
    const link = links[0];
    if (!['ACTIVE', 'OPENED', 'IN_PROGRESS'].includes(link.status)) {
      await connection.rollback();
      return errorResponse(res, 400, 'This admission link is no longer active');
    }
    if (link.expires_at && new Date() > new Date(link.expires_at)) {
      await connection.query('UPDATE admission_links SET status = "EXPIRED" WHERE id = ?', [link.id]);
      await connection.rollback();
      return errorResponse(res, 400, 'This admission link has expired');
    }

    // Check if email already submitted via this link or registered
    const [dupeEmail] = await connection.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (dupeEmail.length > 0) {
      await connection.rollback();
      return errorResponse(res, 409, 'An account with this email address already exists');
    }

    // Determine effective course
    const effectiveCourseId = link.course_id || course_id;
    let courseFee = 0;
    if (effectiveCourseId) {
      const [courses] = await connection.query('SELECT fee_amount FROM courses WHERE id = ?', [effectiveCourseId]);
      if (courses.length > 0) courseFee = parseFloat(courses[0].fee_amount);
    }

    // Validate currency
    const selectedCurrency = (currency || link.currency || 'INR').toUpperCase();
    if (!['INR', 'USD'].includes(selectedCurrency) && selectedCurrency !== 'ANY') {
      await connection.rollback();
      return errorResponse(res, 400, 'Invalid currency. Must be INR or USD');
    }

    // Coupon validation if entered
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
      if (coupon.currency && coupon.currency !== 'ANY' && selectedCurrency !== 'ANY' && coupon.currency.toUpperCase() !== selectedCurrency) {
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

    // Create a temporary PENDING user (no password yet — will be set on approval)
    const [roles] = await connection.query("SELECT id FROM roles WHERE name = 'STUDENT' LIMIT 1");
    if (roles.length === 0) {
      await connection.rollback();
      return errorResponse(res, 500, 'STUDENT role not configured');
    }
    const tempPasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    const [userResult] = await connection.query(
      'INSERT INTO users (role_id, full_name, email, password_hash, phone, status) VALUES (?, ?, ?, ?, ?, "PENDING")',
      [roles[0].id, full_name.trim(), email.trim().toLowerCase(), tempPasswordHash, phone.trim()]
    );
    const userId = userResult.insertId;

    // Create student record
    const rollNum = generateRollNumber(userId);
    const [stuResult] = await connection.query(
      'INSERT INTO students (user_id, roll_number, dob, gender, address) VALUES (?, ?, ?, ?, ?)',
      [userId, rollNum, dob || null, (gender || 'OTHER').toUpperCase(), address || null]
    );
    const studentId = stuResult.insertId;

    // Find a suitable batch (first UPCOMING or ONGOING batch for the course)
    let batchId = null;
    if (effectiveCourseId) {
      const [availBatches] = await connection.query(
        `SELECT b.id FROM batches b
         WHERE b.course_id = ? AND b.status IN ('UPCOMING','ONGOING')
           AND (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') < b.max_students
         ORDER BY b.start_date ASC LIMIT 1`,
        [effectiveCourseId]
      );
      if (availBatches.length > 0) batchId = availBatches[0].id;
    }

    // Create admission record with SUBMITTED status
    const admissionNumber = await generateAdmissionNumber(connection);
    const today = new Date().toISOString().split('T')[0];

    const [admResult] = await connection.query(
      `INSERT INTO admissions
        (admission_number, admission_link_id, student_id, course_id, batch_id,
         admission_date, total_fee, discount_amount, final_fee, status, currency, coupon_code, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?)`,
      [
        admissionNumber, link.id, studentId,
        effectiveCourseId || null, batchId,
        today, courseFee, discountAmount, netPayable,
        selectedCurrency === 'ANY' ? 'INR' : selectedCurrency,
        appliedCouponCode,
        message || null
      ]
    );
    const admissionId = admResult.insertId;

    // Increment coupon usage if used
    if (couponId) {
      await connection.query('UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?', [couponId]);
    }

    // Update link status
    await connection.query('UPDATE admission_links SET status = "USED" WHERE id = ?', [link.id]);

    await connection.commit();

    // Notify assigned sales executive & all admins of new submission
    const recipients = new Set();
    if (link.sales_exec_id) {
      const [se] = await pool.query('SELECT user_id FROM sales_executives WHERE id = ?', [link.sales_exec_id]);
      if (se.length > 0 && se[0].user_id) recipients.add(se[0].user_id);
    }
    const [admins] = await pool.query(
      `SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name IN ('SUPER_ADMIN','ADMIN') AND u.status = 'ACTIVE'`
    );
    admins.forEach(a => recipients.add(a.id));

    recipients.forEach(adminUserId => {
      createNotification(
        adminUserId,
        '📋 New Admission Application Submitted',
        `${full_name.trim()} submitted an admission form. Admission No: ${admissionNumber}. Net Payable: ${selectedCurrency === 'USD' ? '$' : '₹'}${netPayable}. Please review and approve/reject.`,
        'ADMISSION', 'admission', admissionId
      ).catch(() => {});
    });

    return successResponse(res, 201, 'Admission form submitted successfully! We will review your application shortly.', {
      admissionNumber,
      netPayable,
      currency: selectedCurrency,
      message: 'Your application has been received. You will be notified once reviewed.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('submitAdmissionForm error:', error);
    return errorResponse(res, 500, 'Failed to submit admission form', error.message);
  } finally {
    connection.release();
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/admissions/:id/approve  (Admin / Super Admin)
// Approves a SUBMITTED admission → activates student, assigns batch, creates invoice
// ---------------------------------------------------------------------------
const approveAdmission = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { batch_id, total_fee, discount_amount, installment_count, new_password, mock_interview_credits, mock_credit_expiry } = req.body;

    const [admissions] = await connection.query(
      `SELECT a.*, s.id AS sid, s.user_id, u.email, u.full_name
       FROM admissions a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE a.id = ?`,
      [id]
    );
    if (admissions.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Admission not found');
    }
    const adm = admissions[0];
    if (!['SUBMITTED', 'PENDING', 'IN_PROGRESS'].includes(adm.status)) {
      await connection.rollback();
      return errorResponse(res, 400, `Admission cannot be approved from status '${adm.status}'`);
    }

    // Determine effective batch
    const effectiveBatchId = batch_id || adm.batch_id;
    if (!effectiveBatchId) {
      await connection.rollback();
      return errorResponse(res, 400, 'A batch must be assigned before approving the admission');
    }

    // Validate batch capacity
    const [batches] = await connection.query(
      `SELECT b.id, b.max_students,
              (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') AS enrolled_count
       FROM batches b WHERE b.id = ?`,
      [effectiveBatchId]
    );
    if (batches.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Target batch not found');
    }
    if (batches[0].enrolled_count >= batches[0].max_students) {
      await connection.rollback();
      return errorResponse(res, 400, 'Target batch is full');
    }

    // Set password if provided
    if (new_password?.trim()) {
      const hash = await bcrypt.hash(new_password.trim(), 10);
      await connection.query('UPDATE users SET password_hash = ?, status = "ACTIVE" WHERE id = ?', [hash, adm.user_id]);
    } else {
      await connection.query('UPDATE users SET status = "ACTIVE" WHERE id = ?', [adm.user_id]);
    }

    // Update mock credits if provided
    if (mock_interview_credits !== undefined) {
      await connection.query(
        'UPDATE students SET mock_interview_credits = ?, mock_credit_expiry = ? WHERE id = ?',
        [parseInt(mock_interview_credits, 10), mock_credit_expiry || null, adm.sid]
      );
    }

    // Enroll in batch
    await connection.query(
      'INSERT INTO batch_students (batch_id, student_id, status) VALUES (?, ?, "ENROLLED") ON DUPLICATE KEY UPDATE status = "ENROLLED"',
      [effectiveBatchId, adm.student_id]
    );

    // Compute fees
    const feeTotal = parseFloat(total_fee || adm.total_fee);
    const disc = parseFloat(discount_amount || adm.discount_amount || 0);
    const netPayable = Math.max(0, feeTotal - disc);

    // Update admission
    await connection.query(
      'UPDATE admissions SET status = "APPROVED", batch_id = ?, total_fee = ?, discount_amount = ?, final_fee = ? WHERE id = ?',
      [effectiveBatchId, feeTotal, disc, netPayable, id]
    );

    // Create invoice
    const invoiceNumber = generateInvoiceNumber(parseInt(id, 10));
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const [invResult] = await connection.query(
      `INSERT INTO invoices
        (admission_id, student_id, course_id, invoice_number, total_amount, discount_amount,
         net_amount, paid_amount, due_amount, invoice_date, due_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, ?, CURDATE(), ?, 'UNPAID', ?)`,
      [id, adm.student_id, adm.course_id, invoiceNumber, feeTotal, disc, netPayable, netPayable,
       dueDate.toISOString().split('T')[0], req.user?.id || null]
    );
    const invoiceId = invResult.insertId;

    // Create installments
    const numInst = Math.max(1, parseInt(installment_count || 1, 10));
    const installAmt = parseFloat((netPayable / numInst).toFixed(2));
    const lastInstAmt = parseFloat((netPayable - installAmt * (numInst - 1)).toFixed(2));
    for (let i = 1; i <= numInst; i++) {
      const dDate = new Date();
      dDate.setDate(dDate.getDate() + (i - 1) * 30);
      const amt = i === numInst ? lastInstAmt : installAmt;
      await connection.query(
        'INSERT INTO installments (invoice_id, installment_number, amount, pending_amount, due_date, status) VALUES (?, ?, ?, ?, ?, "PENDING")',
        [invoiceId, i, amt, amt, dDate.toISOString().split('T')[0]]
      );
    }

    // Create wallet
    await connection.query(
      'INSERT IGNORE INTO student_wallet (student_id, coins_balance, total_earned, total_spent) VALUES (?, 10000, 10000, 0)',
      [adm.student_id]
    );

    await connection.commit();

    // Notify student
    createNotification(
      adm.user_id,
      '🎉 Admission Approved!',
      `Congratulations! Your admission has been approved. Invoice: ${invoiceNumber}. Net Payable: ${netPayable}.`,
      'ADMISSION', 'admission', parseInt(id, 10)
    ).catch(() => {});

    if (new_password?.trim()) {
      sendStudentWelcomeEmail({
        toEmail: adm.email,
        studentName: adm.full_name,
        rollNumber: '',
        password: new_password.trim()
      }).catch(() => {});
    }

    return successResponse(res, 200, 'Admission approved successfully', {
      admissionId: parseInt(id, 10),
      invoiceId,
      invoiceNumber,
      netPayable
    });
  } catch (error) {
    await connection.rollback();
    console.error('approveAdmission error:', error);
    return errorResponse(res, 500, 'Failed to approve admission', error.message);
  } finally {
    connection.release();
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/admissions/:id/reject  (Admin / Super Admin)
// ---------------------------------------------------------------------------
const rejectAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const [admissions] = await pool.query(
      `SELECT a.*, s.user_id, u.full_name FROM admissions a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id WHERE a.id = ?`,
      [id]
    );
    if (admissions.length === 0) return errorResponse(res, 404, 'Admission not found');

    const adm = admissions[0];
    await pool.query(
      'UPDATE admissions SET status = "REJECTED", remarks = COALESCE(?, remarks) WHERE id = ?',
      [remarks || null, id]
    );
    // Deactivate pending user
    await pool.query('UPDATE users SET status = "INACTIVE" WHERE id = ? AND status = "PENDING"', [adm.user_id]);

    createNotification(
      adm.user_id,
      '❌ Admission Application Rejected',
      `Unfortunately, your admission application has been rejected. Reason: ${remarks || 'Please contact support for details.'}.`,
      'ADMISSION', 'admission', parseInt(id, 10)
    ).catch(() => {});

    return successResponse(res, 200, 'Admission rejected');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to reject admission', error.message);
  }
};

module.exports = {
  createAdmissionLink,
  getAdmissionLinks,
  getAdmissionLinkInfo,
  submitAdmissionForm,
  approveAdmission,
  rejectAdmission
};
