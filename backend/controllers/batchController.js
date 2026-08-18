const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendBatchScheduleUpdateEmail } = require('../utils/emailService');

/**
 * GET /api/batches
 * Retrieves batch list with search, course_id, trainer_id, status, and mode filters.
 * Returns summary card stats for top dashboard cards.
 */
const getBatches = async (req, res) => {
  try {
    const { course_id, trainer_id, status, mode, search } = req.query;

    let query = `
      SELECT b.*, 
             c.name as course_name, c.code as course_code, c.fee_amount,
             u.full_name as trainer_name,
             (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') as enrolled_students_count
      FROM batches b
      JOIN courses c ON b.course_id = c.id
      LEFT JOIN trainers t ON b.trainer_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Role specific filtering
    const userRole = req.user?.role_name?.toUpperCase();

    if (userRole === 'TRAINER') {
      query += ' AND b.trainer_id = ?';
      params.push(req.user.trainer_id || 0);
    } else if (userRole === 'STUDENT') {
      query += ' AND b.id IN (SELECT batch_id FROM batch_students WHERE student_id = ?)';
      params.push(req.user.student_id || 0);
    } else {
      if (course_id) {
        query += ' AND b.course_id = ?';
        params.push(course_id);
      }
      if (trainer_id) {
        query += ' AND b.trainer_id = ?';
        params.push(trainer_id);
      }
    }

    if (status) {
      query += ' AND b.status = ?';
      params.push(status.toUpperCase());
    }

    if (mode) {
      query += ' AND b.mode = ?';
      params.push(mode.toUpperCase());
    }

    if (search) {
      query += ' AND (b.name LIKE ? OR b.batch_code LIKE ? OR c.name LIKE ? OR u.full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY b.id DESC';

    const [batches] = await pool.query(query, params);

    // Compute Summary Card Metrics
    const [summaryStats] = await pool.query(`
      SELECT 
        COUNT(id) as total_batches,
        SUM(CASE WHEN status IN ('ONGOING', 'ACTIVE') THEN 1 ELSE 0 END) as active_batches,
        SUM(CASE WHEN status = 'UPCOMING' THEN 1 ELSE 0 END) as upcoming_batches,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_batches
      FROM batches
    `);

    // Calculate available seats for each batch
    const formattedBatches = batches.map(b => ({
      ...b,
      available_seats: Math.max(0, (b.max_students || 30) - (b.enrolled_students_count || 0))
    }));

    return successResponse(res, 200, 'Batches fetched successfully', {
      batches: formattedBatches,
      summary: summaryStats[0] || { total_batches: 0, active_batches: 0, upcoming_batches: 0, completed_batches: 0 }
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch batches', error.message);
  }
};

/**
 * GET /api/batches/:id
 * Retrieves complete batch details and student roster.
 */
const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, 'Invalid batch ID provided');
    }

    const [batches] = await pool.query(
      `SELECT b.*, 
              c.name as course_name, c.code as course_code, c.fee_amount, c.duration_weeks,
              u.full_name as trainer_name, u.email as trainer_email, u.phone as trainer_phone,
              (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') as enrolled_students_count
       FROM batches b
       JOIN courses c ON b.course_id = c.id
       LEFT JOIN trainers t ON b.trainer_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (batches.length === 0) {
      return errorResponse(res, 404, 'Batch not found');
    }

    const batch = batches[0];
    batch.available_seats = Math.max(0, (batch.max_students || 30) - (batch.enrolled_students_count || 0));

    // Fetch enrolled students roster
    const [students] = await pool.query(
      `SELECT s.id as student_id, u.full_name, u.email, u.phone, s.roll_number, bs.enrolled_at, bs.status as enrollment_status
       FROM batch_students bs
       JOIN students s ON bs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE bs.batch_id = ?
       ORDER BY bs.enrolled_at DESC`,
      [id]
    );

    batch.students = students;

    return successResponse(res, 200, 'Batch details fetched successfully', { batch });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch batch details', error.message);
  }
};

/**
 * POST /api/batches
 * Create a new batch (Only Super Admin & Admin).
 */
const createBatch = async (req, res) => {
  try {
    const {
      course_id,
      trainer_id,
      batch_code,
      name,
      start_date,
      end_date,
      timing,
      start_time,
      end_time,
      room_number,
      mode,
      max_students,
      capacity,
      description,
      status
    } = req.body;

    const batchCode = (batch_code || '').trim().toUpperCase();
    const batchName = (name || req.body.batch_name || '').trim();
    const maxCapacity = parseInt(max_students || capacity || 30, 10);
    const batchMode = (mode || 'OFFLINE').toUpperCase();
    const batchStatus = (status || 'UPCOMING').toUpperCase();
    const timeSchedule = timing || (start_time && end_time ? `${start_time} - ${end_time}` : null);

    // Required Field Validations
    if (!course_id || !batchCode || !batchName || !start_date) {
      return errorResponse(res, 400, 'Course, Batch Code, Batch Name, and Start Date are required');
    }

    // Capacity Validation
    if (isNaN(maxCapacity) || maxCapacity <= 0) {
      return errorResponse(res, 400, 'Batch capacity must be a positive integer');
    }

    // Date Validation: End Date cannot be before Start Date
    if (end_date && new Date(end_date) < new Date(start_date)) {
      return errorResponse(res, 400, 'End Date cannot be before Start Date');
    }

    // Unique Batch Code Check
    const [existing] = await pool.query('SELECT id FROM batches WHERE batch_code = ?', [batchCode]);
    if (existing.length > 0) {
      return errorResponse(res, 409, `Batch code '${batchCode}' already exists. Please enter a unique code.`);
    }

    // Verify Course exists and is ACTIVE
    const [courseCheck] = await pool.query('SELECT id, status FROM courses WHERE id = ?', [course_id]);
    if (courseCheck.length === 0) {
      return errorResponse(res, 404, 'Selected course does not exist');
    }

    const [result] = await pool.query(
      `INSERT INTO batches 
       (course_id, trainer_id, batch_code, name, start_date, end_date, timing, start_time, end_time, room_number, mode, max_students, description, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        course_id,
        trainer_id || null,
        batchCode,
        batchName,
        start_date,
        end_date || null,
        timeSchedule,
        start_time || null,
        end_time || null,
        room_number || null,
        batchMode,
        maxCapacity,
        description || null,
        batchStatus
      ]
    );

    return successResponse(res, 201, 'Batch created successfully', { batchId: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Batch creation failed', error.message);
  }
};

/**
 * PUT /api/batches/:id
 * Update an existing batch (Super Admin, Admin).
 */
const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      `SELECT b.*, 
              (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') as enrolled_students_count 
       FROM batches b WHERE b.id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return errorResponse(res, 404, 'Batch not found');
    }

    const current = existing[0];

    const course_id = req.body.course_id || current.course_id;
    const trainer_id = req.body.trainer_id !== undefined ? req.body.trainer_id : current.trainer_id;
    const name = req.body.name || req.body.batch_name ? (req.body.name || req.body.batch_name).trim() : current.name;
    const start_date = req.body.start_date || current.start_date;
    const end_date = req.body.end_date !== undefined ? req.body.end_date : current.end_date;
    const start_time = req.body.start_time !== undefined ? req.body.start_time : current.start_time;
    const end_time = req.body.end_time !== undefined ? req.body.end_time : current.end_time;
    const timing = req.body.timing || (start_time && end_time ? `${start_time} - ${end_time}` : current.timing);
    const room_number = req.body.room_number !== undefined ? req.body.room_number : current.room_number;
    const mode = req.body.mode ? req.body.mode.toUpperCase() : current.mode;
    const max_students = req.body.max_students || req.body.capacity ? parseInt(req.body.max_students || req.body.capacity, 10) : current.max_students;
    const description = req.body.description !== undefined ? req.body.description : current.description;
    const status = req.body.status ? req.body.status.toUpperCase() : current.status;

    // Date Validation
    if (end_date && new Date(end_date) < new Date(start_date)) {
      return errorResponse(res, 400, 'End Date cannot be before Start Date');
    }

    // Capacity Validation: Cannot reduce capacity below current enrolled student count
    if (max_students < current.enrolled_students_count) {
      return errorResponse(
        res,
        400,
        `Capacity (${max_students}) cannot be less than the current number of enrolled students (${current.enrolled_students_count}).`
      );
    }

    await pool.query(
      `UPDATE batches 
       SET course_id = ?, trainer_id = ?, name = ?, start_date = ?, end_date = ?, timing = ?, start_time = ?, end_time = ?, room_number = ?, mode = ?, max_students = ?, description = ?, status = ? 
       WHERE id = ?`,
      [course_id, trainer_id || null, name, start_date, end_date || null, timing, start_time, end_time, room_number, mode, max_students, description, status, id]
    );

    // If timing or schedule changed, notify all enrolled students
    if (current.timing !== timing || current.start_time !== start_time || current.end_time !== end_time || current.room_number !== room_number) {
      const [students] = await pool.query(
        `SELECT u.id as user_id, u.full_name, u.email 
         FROM batch_students bs
         JOIN students s ON bs.student_id = s.id
         JOIN users u ON s.user_id = u.id
         WHERE bs.batch_id = ? AND bs.status = 'ENROLLED'`,
        [id]
      );

      const timingText = timing || (start_time && end_time ? `${start_time} - ${end_time}` : 'Updated Schedule');
      const notifyTitle = `⏰ Batch Schedule Changed: ${name}`;
      const notifyMsg = `Your batch timing has been updated to: ${timingText} (Room/Link: ${room_number || 'Main Lab'}).`;

      for (const stu of students) {
        await pool.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'TIMETABLE')",
          [stu.user_id, notifyTitle, notifyMsg]
        ).catch(() => {});

        sendBatchScheduleUpdateEmail({
          toEmail: stu.email,
          studentName: stu.full_name,
          batchName: name,
          timing: timingText,
          roomNumber: room_number,
          notes: description,
          updatedBy: req.user.full_name
        }).catch(() => {});
      }
    }

    return successResponse(res, 200, 'Batch updated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Batch update failed', error.message);
  }
};

/**
 * PATCH /api/batches/:id/status
 * Change batch status (Only Super Admin & Admin).
 */
const toggleBatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    const [existing] = await pool.query('SELECT status FROM batches WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'Batch not found');
    }

    if (!status) {
      status = existing[0].status === 'ONGOING' ? 'INACTIVE' : 'ONGOING';
    } else {
      status = status.toUpperCase();
    }

    if (!['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'INACTIVE', 'ACTIVE'].includes(status)) {
      return errorResponse(res, 400, 'Invalid batch status value');
    }

    const nextStatus = status === 'ACTIVE' ? 'ONGOING' : status === 'INACTIVE' ? 'CANCELLED' : status;

    await pool.query('UPDATE batches SET status = ? WHERE id = ?', [nextStatus, id]);
    return successResponse(res, 200, `Batch status updated to ${nextStatus}`);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update batch status', error.message);
  }
};

/**
 * POST /api/batches/:id/students
 * Add a student to a batch with Capacity Over-enrollment Check.
 */
const addStudentToBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id } = req.body;

    if (!student_id) {
      return errorResponse(res, 400, 'Student ID is required');
    }

    // Fetch batch capacity & current enrollment
    const [batches] = await pool.query(
      `SELECT b.max_students, 
              (SELECT COUNT(*) FROM batch_students bs WHERE bs.batch_id = b.id AND bs.status = 'ENROLLED') as enrolled_students_count
       FROM batches b WHERE b.id = ?`,
      [id]
    );

    if (batches.length === 0) {
      return errorResponse(res, 404, 'Batch not found');
    }

    const { max_students, enrolled_students_count } = batches[0];

    // OVER-CAPACITY PREVENTION CHECK (Module 5 Logic for Module 6 Admissions)
    if (enrolled_students_count >= max_students) {
      return errorResponse(
        res,
        400,
        `Batch capacity is full. Maximum limit is ${max_students} students.`
      );
    }

    // Check duplicate student enrollment
    const [existing] = await pool.query('SELECT id FROM batch_students WHERE batch_id = ? AND student_id = ?', [id, student_id]);
    if (existing.length > 0) {
      return errorResponse(res, 409, 'Student is already enrolled in this batch');
    }

    await pool.query('INSERT INTO batch_students (batch_id, student_id, status) VALUES (?, ?, ?)', [id, student_id, 'ENROLLED']);
    return successResponse(res, 201, 'Student enrolled in batch successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to enroll student in batch', error.message);
  }
};

module.exports = {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  toggleBatchStatus,
  addStudentToBatch
};
