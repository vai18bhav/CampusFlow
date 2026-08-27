const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendEnrollmentApprovedEmail } = require('../utils/emailService');

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
 * Helper to validate and apply coupons
 */
const validateAndApplyCoupon = async (conn, couponCode, originalAmount, currency) => {
  if (!couponCode) return { discountAmount: 0, finalAmount: originalAmount };

  const [coupons] = await conn.query('SELECT * FROM coupons WHERE code = ? FOR UPDATE', [couponCode.trim().toUpperCase()]);
  if (coupons.length === 0) {
    throw new Error('Coupon code does not exist.');
  }

  const coupon = coupons[0];
  if (!coupon.is_active) {
    throw new Error('Coupon is currently inactive.');
  }

  if (coupon.valid_until) {
    const expiryDate = new Date(coupon.valid_until);
    expiryDate.setHours(23, 59, 59, 999);
    if (new Date() > expiryDate) {
      throw new Error('Coupon has expired.');
    }
  }

  if (coupon.current_uses >= coupon.max_uses) {
    throw new Error('Coupon redemption limit has been reached.');
  }

  if (coupon.currency && coupon.currency !== 'ANY' && currency && coupon.currency.toUpperCase() !== currency.toUpperCase()) {
    throw new Error(`Coupon is only applicable for ${coupon.currency} transactions.`);
  }

  const orderAmt = parseFloat(originalAmount || 0);
  const minVal = parseFloat(coupon.min_order_value || 0);
  if (orderAmt < minVal) {
    throw new Error(`Minimum course fee threshold of ${minVal} required to apply this coupon.`);
  }

  let discountAmount = 0;
  if (coupon.discount_type === 'PERCENTAGE') {
    discountAmount = orderAmt * (parseFloat(coupon.discount_value) / 100);
  } else {
    discountAmount = parseFloat(coupon.discount_value);
  }

  discountAmount = Math.min(discountAmount, orderAmt);
  return {
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    finalAmount: parseFloat((orderAmt - discountAmount).toFixed(2))
  };
};

/**
 * POST /api/enrollments
 * Student submits a new course enrollment request with preferred payment plan, currency, and coupon code
 */
const createEnrollmentRequest = async (req, res) => {
  try {
    const { course_id, message, payment_plan, installments_count, coupon_code, currency, sales_exec_id, status } = req.body;
    if (!course_id) return errorResponse(res, 400, 'course_id is required');

    let student_id;
    const isStudent = (req.user?.role_name || req.user?.role) === 'STUDENT';
    if (isStudent) {
      const [students] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!students.length) return errorResponse(res, 403, 'Only students can submit enrollment requests');
      student_id = students[0].id;
    } else {
      student_id = req.body.student_id;
      if (!student_id) return errorResponse(res, 400, 'student_id is required');
    }

    // Check if duplicate requests exist
    const [existing] = await pool.query(
      "SELECT id, status FROM enrollment_requests WHERE student_id = ? AND course_id = ? AND status IN ('Submitted','Approved','Opened','In Progress','Sent')",
      [student_id, course_id]
    );
    if (existing.length > 0) {
      return errorResponse(res, 409, `You already have an enrollment record for this course with status: ${existing[0].status}.`);
    }

    const [courses] = await pool.query('SELECT name, fee_amount FROM courses WHERE id = ?', [course_id]);
    if (!courses.length) return errorResponse(res, 404, 'Course not found');
    const originalFee = parseFloat(courses[0].fee_amount);

    const plan = payment_plan || 'FULL';
    const count = parseInt(installments_count) || (plan === '2_INSTALLMENTS' ? 2 : plan === '3_INSTALLMENTS' ? 3 : plan === '4_INSTALLMENTS' ? 4 : 1);
    const appliedCurrency = currency || 'INR';
    const finalStatus = status || 'Submitted';

    // Coupon validation if provided
    if (coupon_code) {
      try {
        await validateAndApplyCoupon(pool, coupon_code, originalFee, appliedCurrency);
      } catch (err) {
        return errorResponse(res, 400, err.message);
      }
    }

    const [result] = await pool.query(
      'INSERT INTO enrollment_requests (student_id, course_id, message, payment_plan, installments_count, coupon_code, currency, sales_exec_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, course_id, message || null, plan, count, coupon_code || null, appliedCurrency, sales_exec_id || null, finalStatus]
    );

    return successResponse(res, 201, 'Enrollment request submitted with installment plan! Awaiting admin approval.', { id: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to submit enrollment request', error.message);
  }
};

/**
 * PATCH /api/enrollments/:id/status
 * Update the tracking status of the enrollment request (e.g. Opened, In Progress, Submitted)
 */
const updateEnrollmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_plan, installments_count, coupon_code, message, currency } = req.body;

    const allowedStatuses = ['Sent', 'Opened', 'In Progress', 'Submitted', 'Approved', 'Rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      return errorResponse(res, 400, `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
    }

    const [rows] = await pool.query('SELECT id, status FROM enrollment_requests WHERE id = ?', [id]);
    if (!rows.length) return errorResponse(res, 404, 'Enrollment request not found');

    if (status === 'Submitted') {
      await pool.query(
        `UPDATE enrollment_requests 
         SET status = ?, payment_plan = ?, installments_count = ?, coupon_code = ?, message = ?, currency = ? 
         WHERE id = ?`,
        [status, payment_plan || 'FULL', installments_count || 1, coupon_code || null, message || null, currency || 'INR', id]
      );
    } else {
      await pool.query('UPDATE enrollment_requests SET status = ? WHERE id = ?', [status, id]);
    }

    return successResponse(res, 200, `Enrollment request status updated to ${status}.`);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update request status', error.message);
  }
};

/**
 * PATCH /api/enrollments/:id/approve
 * Admin approves — creates admission, invoice, and installment milestones without coin deduction
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
    if (reqData.status === 'Approved' || reqData.status === 'Rejected') {
      return errorResponse(res, 400, 'This request is no longer pending or submitted');
    }

    // Apply coupon if present
    const totalFee = parseFloat(reqData.fee_amount || 0);
    let discountAmount = 0;
    let finalFee = totalFee;

    if (reqData.coupon_code) {
      const couponResult = await validateAndApplyCoupon(conn, reqData.coupon_code, totalFee, reqData.currency);
      discountAmount = couponResult.discountAmount;
      finalFee = couponResult.finalAmount;

      // Increment coupon usage count
      await conn.query('UPDATE coupons SET current_uses = current_uses + 1 WHERE code = ?', [reqData.coupon_code]);
    }

    // Determine chosen payment plan
    const effectivePlan = payment_plan || reqData.payment_plan || 'FULL';
    const milestones = calculateInstallmentMilestones(finalFee, effectivePlan);
    const isFullPayment = effectivePlan === 'FULL' || milestones.length === 1;

    // 1. Update enrollment request to Approved
    await conn.query(
      'UPDATE enrollment_requests SET status=?, batch_id=?, admin_remarks=?, reviewed_by=?, reviewed_at=NOW(), payment_plan=?, installments_count=? WHERE id=?',
      ['Approved', batch_id, admin_remarks || null, req.user.id, effectivePlan, milestones.length, id]
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
      `INSERT INTO admissions (admission_number, student_id, course_id, batch_id, admission_date, total_fee, final_fee, discount_amount, currency, status, created_by)
       VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, 'CONFIRMED', ?)`,
      [admNo, reqData.student_id, reqData.course_id, batch_id, totalFee, finalFee, discountAmount, reqData.currency || 'INR', req.user.id]
    );
    const admissionId = admResult.insertId;

    // 4. Create Invoice
    const invoiceNo = `INV-${Date.now()}`;
    const invoiceStatus = 'UNPAID';
    const [invResult] = await conn.query(
      `INSERT INTO invoices (admission_id, student_id, course_id, invoice_number, total_amount, net_amount, paid_amount, due_amount, currency, invoice_date, due_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, ?)`,
      [
        admissionId,
        reqData.student_id,
        reqData.course_id,
        invoiceNo,
        totalFee,
        finalFee,
        finalFee,
        reqData.currency || 'INR',
        isFullPayment ? 30 : 15,
        invoiceStatus,
        req.user.id
      ]
    );
    const invoiceId = invResult.insertId;

    // 5. Create Installment Milestones in `installments` table (unpaid initially, no coins)
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      await conn.query(
        `INSERT INTO installments (invoice_id, installment_number, amount, paid_amount, pending_amount, due_date, paid_date, status, payment_mode)
         VALUES (?, ?, ?, 0.00, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), NULL, 'PENDING', 'ONLINE')`,
        [
          invoiceId,
          m.num,
          m.amount,
          m.amount,
          m.daysOffset
        ]
      );
    }

    // 6. In-app notification to student
    await conn.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ADMISSION')",
      [
        reqData.student_user_id,
        `✅ Enrollment Approved — ${reqData.course_name}`,
        `You have been enrolled in ${reqData.batch_name}. Your invoice ${invoiceNo} of ${reqData.currency === 'USD' ? '$' : '₹'}${finalFee} has been generated.`
      ]
    );

    await conn.commit();

    // 7. Send Confirmation Email via SMTP
    sendEnrollmentApprovedEmail({
      to: reqData.student_email,
      studentName: reqData.student_name,
      courseName: reqData.course_name,
      batchName: reqData.batch_name,
      batchCode: reqData.batch_code,
      coinsDeducted: 0,
      remainingCoins: 0,
      planLabel: isFullPayment ? 'Full Payment' : `${milestones.length} Installments`,
      invoiceNumber: invoiceNo
    }).catch(e => console.error('[EMAIL ERROR]', e.message));

    return successResponse(res, 200, 'Enrollment approved successfully! Admission and Invoice generated.', {
      admission_id: admissionId,
      admission_number: admNo,
      invoice_number: invoiceNo,
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
    if (rows[0].status === 'Approved' || rows[0].status === 'Rejected') {
      return errorResponse(res, 400, 'Request is already processed');
    }

    await pool.query(
      'UPDATE enrollment_requests SET status=?, admin_remarks=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?',
      ['Rejected', admin_remarks || null, req.user.id, id]
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
  updateEnrollmentStatus,
  approveEnrollment,
  rejectEnrollment,
  getEnrollmentRequests
};
