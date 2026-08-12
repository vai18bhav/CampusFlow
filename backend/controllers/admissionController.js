const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * GET /api/admissions
 * Retrieves admissions list with search, status, course_id, batch_id, and date filters.
 * Returns summary card metrics for top dashboard cards.
 */
const getAdmissions = async (req, res) => {
  try {
    const { status, course_id, batch_id, search } = req.query;

    let query = `
      SELECT a.*, 
             u.full_name as student_name, u.email as student_email, u.phone as student_phone, s.roll_number,
             c.name as course_name, c.code as course_code, c.fee_amount as course_fee,
             b.name as batch_name, b.batch_code, b.timing as batch_timing, b.mode as batch_mode,
             tr_u.full_name as trainer_name,
             l.candidate_name as lead_name
      FROM admissions a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN courses c ON a.course_id = c.id
      JOIN batches b ON a.batch_id = b.id
      LEFT JOIN trainers tr ON b.trainer_id = tr.id
      LEFT JOIN users tr_u ON tr.user_id = tr_u.id
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE 1=1
    `;
    const params = [];

    const userRole = req.user?.role_name?.toUpperCase();

    // Role-specific filtering
    if (userRole === 'STUDENT') {
      query += ' AND a.student_id = ?';
      params.push(req.user.student_id || 0);
    } else if (userRole === 'TRAINER') {
      query += ' AND b.trainer_id = ?';
      params.push(req.user.trainer_id || 0);
    } else {
      if (course_id) {
        query += ' AND a.course_id = ?';
        params.push(course_id);
      }
      if (batch_id) {
        query += ' AND a.batch_id = ?';
        params.push(batch_id);
      }
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status.toUpperCase());
    }

    if (search) {
      query += ' AND (a.admission_number LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR b.batch_code LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    query += ' ORDER BY a.id DESC';

    const [admissions] = await pool.query(query, params);

    // Compute Summary Metrics
    const [summaryStats] = await pool.query(`
      SELECT 
        COUNT(id) as total_admissions,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_admissions,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_admissions,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_admissions,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_admissions
      FROM admissions
    `);

    return successResponse(res, 200, 'Admissions retrieved successfully', {
      admissions,
      summary: summaryStats[0] || { total_admissions: 0, pending_admissions: 0, confirmed_admissions: 0, cancelled_admissions: 0 }
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch admissions', error.message);
  }
};

/**
 * GET /api/admissions/:id
 * Retrieves complete details for a specific admission record.
 */
const getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, 'Invalid admission ID provided');
    }

    const [admissions] = await pool.query(
      `SELECT a.*, 
              u.full_name as student_name, u.email as student_email, u.phone as student_phone, s.roll_number, s.qualification,
              c.name as course_name, c.code as course_code, c.duration_weeks, c.fee_amount as course_fee,
              b.name as batch_name, b.batch_code, b.timing as batch_timing, b.mode as batch_mode, b.start_date as batch_start_date,
              tr_u.full_name as trainer_name, tr_u.email as trainer_email,
              cb_u.full_name as created_by_name,
              i.invoice_number, i.total_amount as invoice_total, i.paid_amount as invoice_paid, i.due_amount as invoice_due, i.status as invoice_status
       FROM admissions a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN courses c ON a.course_id = c.id
       JOIN batches b ON a.batch_id = b.id
       LEFT JOIN trainers tr ON b.trainer_id = tr.id
       LEFT JOIN users tr_u ON tr.user_id = tr_u.id
       LEFT JOIN users cb_u ON a.created_by = cb_u.id
       LEFT JOIN invoices i ON i.admission_id = a.id
       WHERE a.id = ?`,
      [id]
    );

    if (admissions.length === 0) {
      return errorResponse(res, 404, 'Admission not found');
    }

    return successResponse(res, 200, 'Admission details retrieved successfully', { admission: admissions[0] });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch admission details', error.message);
  }
};

/**
 * POST /api/admissions
 * Creates a new student admission inside a MySQL Transaction.
 * Performs Course-Batch compatibility check, Batch capacity check, and Duplicate admission check.
 */
const createAdmission = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { lead_id, student_id, course_id, batch_id, admission_date, total_fee, discount_amount, installment_count, remarks, status } = req.body;
    const admissionStatus = (status || 'CONFIRMED').toUpperCase();
    const admDate = admission_date || new Date().toISOString().split('T')[0];

    // 1. Basic Required Fields Check
    if (!student_id || !course_id || !batch_id) {
      return errorResponse(res, 400, 'Student, Course, and Batch selection are required');
    }

    // 2. Validate Student exists and is ACTIVE
    const [students] = await connection.query(
      'SELECT s.id, u.status FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?',
      [student_id]
    );
    if (students.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Selected student does not exist');
    }
    if (students[0].status === 'INACTIVE' || students[0].status === 'SUSPENDED') {
      await connection.rollback();
      return errorResponse(res, 400, 'Cannot create admission for an inactive or suspended student');
    }

    // 3. Validate Course exists
    const [courses] = await connection.query('SELECT id, fee_amount FROM courses WHERE id = ?', [course_id]);
    if (courses.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Selected course does not exist');
    }

    // 4. Validate Batch exists and check COURSE-BATCH COMPATIBILITY
    const [batches] = await connection.query(
      `SELECT b.id, b.course_id, b.max_students, b.status,
              (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') as enrolled_count
       FROM batches b WHERE b.id = ?`,
      [batch_id]
    );

    if (batches.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Selected batch does not exist');
    }

    const batch = batches[0];

    // COURSE-BATCH COMPATIBILITY CHECK
    if (parseInt(batch.course_id, 10) !== parseInt(course_id, 10)) {
      await connection.rollback();
      return errorResponse(res, 400, 'Selected batch does not belong to the selected course');
    }

    if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED' || batch.status === 'INACTIVE') {
      await connection.rollback();
      return errorResponse(res, 400, `Cannot enroll in a batch with status '${batch.status}'`);
    }

    // 5. BATCH CAPACITY VALIDATION CHECK (CRITICAL REQUIREMENT)
    if (admissionStatus === 'CONFIRMED' && batch.enrolled_count >= batch.max_students) {
      await connection.rollback();
      return errorResponse(
        res,
        400,
        `Selected batch is full (${batch.enrolled_count}/${batch.max_students} seats filled). Please select another batch.`
      );
    }

    // 6. DUPLICATE ADMISSION VALIDATION CHECK
    const [existingAdm] = await connection.query(
      'SELECT id FROM admissions WHERE student_id = ? AND course_id = ? AND status IN ("CONFIRMED", "PENDING")',
      [student_id, course_id]
    );
    if (existingAdm.length > 0) {
      await connection.rollback();
      return errorResponse(res, 409, 'Student already has an active or confirmed admission for this course.');
    }

    // 7. Auto-Generate Unique Admission Number (e.g. ADM-2026-0001)
    const year = new Date().getFullYear();
    const [countRow] = await connection.query('SELECT COUNT(id) as total FROM admissions');
    const seqNum = (countRow[0].total || 0) + 1;
    const admissionNumber = `ADM-${year}-${String(seqNum).padStart(4, '0')}`;

    const feeTotal = parseFloat(total_fee !== undefined ? total_fee : courses[0].fee_amount);
    const discount = parseFloat(discount_amount || 0);
    const finalFee = Math.max(0, feeTotal - discount);

    // 8. Insert Admission Record
    const [admResult] = await connection.query(
      `INSERT INTO admissions 
       (admission_number, lead_id, student_id, course_id, batch_id, admission_date, total_fee, discount_amount, final_fee, status, remarks, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        admissionNumber,
        lead_id || null,
        student_id,
        course_id,
        batch_id,
        admDate,
        feeTotal,
        discount,
        finalFee,
        admissionStatus,
        remarks || null,
        req.user?.id || null
      ]
    );

    const admissionId = admResult.insertId;

    // 9. If Lead ID provided, update lead status to CONVERTED
    if (lead_id) {
      await connection.query('UPDATE leads SET status = "CONVERTED" WHERE id = ?', [lead_id]);
    }

    // 10. If CONFIRMED, Enroll Student in Batch and Generate Invoice
    if (admissionStatus === 'CONFIRMED') {
      const [existingEnrollment] = await connection.query(
        'SELECT id FROM batch_students WHERE batch_id = ? AND student_id = ?',
        [batch_id, student_id]
      );
      if (existingEnrollment.length === 0) {
        await connection.query(
          'INSERT INTO batch_students (batch_id, student_id, status) VALUES (?, ?, "ENROLLED")',
          [batch_id, student_id]
        );
      }

      // Generate Invoice for Module 8 Finance integration
      const invoiceNumber = `INV-${year}-${String(admissionId).padStart(4, '0')}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const [invResult] = await connection.query(
        'INSERT INTO invoices (admission_id, student_id, invoice_number, total_amount, paid_amount, due_amount, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [admissionId, student_id, invoiceNumber, finalFee, 0.00, finalFee, 'UNPAID', dueDate.toISOString().split('T')[0]]
      );

      const invoiceId = invResult.insertId;
      const numInstallments = parseInt(installment_count || 2, 10);
      const installmentAmt = (finalFee / numInstallments).toFixed(2);

      for (let i = 1; i <= numInstallments; i++) {
        const instDueDate = new Date();
        instDueDate.setDate(instDueDate.getDate() + (i - 1) * 30);
        await connection.query(
          'INSERT INTO installments (invoice_id, installment_number, amount, due_date, status, remarks) VALUES (?, ?, ?, ?, ?, ?)',
          [invoiceId, i, installmentAmt, instDueDate.toISOString().split('T')[0], 'PENDING', `Installment #${i} of ${numInstallments}`]
        );
      }
    }

    await connection.commit();

    return successResponse(res, 201, 'Admission created successfully', {
      admissionId,
      admissionNumber,
      status: admissionStatus,
      finalFee
    });
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 500, 'Admission creation failed', error.message);
  } finally {
    connection.release();
  }
};

/**
 * PUT /api/admissions/:id
 * Updates an admission record (Only Super Admin, Admin, Sales Executive).
 */
const updateAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, status, batch_id } = req.body;

    const [existing] = await pool.query('SELECT * FROM admissions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'Admission not found');
    }

    const current = existing[0];

    // If batch_id is changing, verify compatibility & capacity
    let targetBatchId = current.batch_id;
    if (batch_id && parseInt(batch_id, 10) !== current.batch_id) {
      const [batchCheck] = await pool.query(
        `SELECT b.id, b.course_id, b.max_students,
                (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') as enrolled_count
         FROM batches b WHERE b.id = ?`,
        [batch_id]
      );

      if (batchCheck.length === 0) {
        return errorResponse(res, 404, 'Target batch does not exist');
      }

      if (parseInt(batchCheck[0].course_id, 10) !== parseInt(current.course_id, 10)) {
        return errorResponse(res, 400, 'Target batch does not belong to the admission course');
      }

      if (batchCheck[0].enrolled_count >= batchCheck[0].max_students) {
        return errorResponse(res, 400, 'Target batch is full. Cannot transfer admission.');
      }

      targetBatchId = batch_id;
    }

    const nextStatus = status ? status.toUpperCase() : current.status;

    await pool.query(
      'UPDATE admissions SET batch_id = ?, remarks = COALESCE(?, remarks), status = ? WHERE id = ?',
      [targetBatchId, remarks, nextStatus, id]
    );

    return successResponse(res, 200, 'Admission updated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Admission update failed', error.message);
  }
};

/**
 * PATCH /api/admissions/:id/status
 * Updates admission status (PENDING -> CONFIRMED, CONFIRMED -> CANCELLED, etc.).
 */
const toggleAdmissionStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      await connection.rollback();
      return errorResponse(res, 400, 'Status is required');
    }

    const nextStatus = status.toUpperCase();
    if (!['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(nextStatus)) {
      await connection.rollback();
      return errorResponse(res, 400, 'Invalid admission status value');
    }

    const [admissions] = await connection.query('SELECT * FROM admissions WHERE id = ?', [id]);
    if (admissions.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Admission not found');
    }

    const adm = admissions[0];

    // If transitioning to CONFIRMED, verify batch capacity
    if (nextStatus === 'CONFIRMED' && adm.status !== 'CONFIRMED') {
      const [batches] = await connection.query(
        `SELECT b.max_students, 
                (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') as enrolled_count
         FROM batches b WHERE b.id = ?`,
        [adm.batch_id]
      );

      if (batches.length > 0 && batches[0].enrolled_count >= batches[0].max_students) {
        await connection.rollback();
        return errorResponse(res, 400, 'Cannot confirm admission. Batch capacity is full.');
      }

      // Enroll in batch
      await connection.query(
        'INSERT INTO batch_students (batch_id, student_id, status) VALUES (?, ?, "ENROLLED") ON DUPLICATE KEY UPDATE status = "ENROLLED"',
        [adm.batch_id, adm.student_id]
      );
    }

    await connection.query('UPDATE admissions SET status = ? WHERE id = ?', [nextStatus, id]);
    await connection.commit();

    return successResponse(res, 200, `Admission status updated to ${nextStatus}`);
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 500, 'Failed to update admission status', error.message);
  } finally {
    connection.release();
  }
};

module.exports = {
  getAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  toggleAdmissionStatus
};
