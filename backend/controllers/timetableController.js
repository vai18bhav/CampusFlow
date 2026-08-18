const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendBatchScheduleUpdateEmail } = require('../utils/emailService');

/**
 * GET /api/timetable
 * Supports query by batch_id or auto-resolves student's/trainer's batch.
 */
const getTimetable = async (req, res) => {
  try {
    let { batch_id } = req.query;
    const userRole = req.user?.role_name?.toUpperCase();

    let userBatches = [];

    // Auto-resolve batch for students if not explicitly passed
    if (!batch_id && userRole === 'STUDENT') {
      const [stuBatches] = await pool.query(
        `SELECT b.id, b.name, b.batch_code, b.timing, b.start_time, b.end_time, b.room_number, c.name as course_name
         FROM batch_students bs
         JOIN batches b ON bs.batch_id = b.id
         JOIN courses c ON b.course_id = c.id
         WHERE bs.student_id = ? AND bs.status = 'ENROLLED'
         ORDER BY b.id DESC`,
        [req.user.student_id || 0]
      );
      userBatches = stuBatches;
      if (stuBatches.length > 0) {
        batch_id = stuBatches[0].id;
      }
    } else if (!batch_id && userRole === 'TRAINER') {
      const [trnBatches] = await pool.query(
        `SELECT b.id, b.name, b.batch_code, b.timing, b.start_time, b.end_time, b.room_number, c.name as course_name
         FROM batches b
         JOIN courses c ON b.course_id = c.id
         WHERE b.trainer_id = ?
         ORDER BY b.id DESC`,
        [req.user.trainer_id || 0]
      );
      userBatches = trnBatches;
      if (trnBatches.length > 0) {
        batch_id = trnBatches[0].id;
      }
    }

    if (!batch_id) {
      // If still no batch_id, pick the first active batch as fallback
      const [firstBatch] = await pool.query('SELECT id, name FROM batches ORDER BY id DESC LIMIT 1');
      if (firstBatch.length > 0) {
        batch_id = firstBatch[0].id;
      }
    }

    if (!batch_id) {
      return successResponse(res, 200, 'No batches available', { slots: [], batch_id: null, userBatches });
    }

    const [slots] = await pool.query(
      `SELECT ts.*, u.full_name AS trainer_name, b.name as batch_name, b.batch_code, b.timing as batch_timing
       FROM timetable_slots ts
       JOIN batches b ON ts.batch_id = b.id
       LEFT JOIN trainers t ON ts.trainer_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ts.batch_id = ?
       ORDER BY FIELD(ts.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'), ts.start_time`,
      [batch_id]
    );

    // Get current batch details
    const [batchInfo] = await pool.query(
      `SELECT b.*, c.name as course_name, u.full_name as trainer_name 
       FROM batches b 
       JOIN courses c ON b.course_id = c.id 
       LEFT JOIN trainers t ON b.trainer_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE b.id = ?`,
      [batch_id]
    );

    return successResponse(res, 200, 'Timetable fetched successfully', {
      slots,
      batch: batchInfo[0] || null,
      selected_batch_id: parseInt(batch_id, 10),
      userBatches
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch timetable', error.message);
  }
};

/**
 * POST /api/timetable
 * Add a slot & notify enrolled students.
 */
const addSlot = async (req, res) => {
  try {
    const { batch_id, trainer_id, day_of_week, subject, start_time, end_time, room_number, notes } = req.body;
    if (!batch_id || !day_of_week || !subject || !start_time || !end_time) {
      return errorResponse(res, 400, 'batch_id, day_of_week, subject, start_time, and end_time are required');
    }

    const [result] = await pool.query(
      `INSERT INTO timetable_slots (batch_id, trainer_id, day_of_week, subject, start_time, end_time, room_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [batch_id, trainer_id || null, day_of_week.toUpperCase(), subject, start_time, end_time, room_number || null, notes || null]
    );

    // Fetch batch details and enrolled students
    const [batchRows] = await pool.query('SELECT name FROM batches WHERE id = ?', [batch_id]);
    const batchName = batchRows.length > 0 ? batchRows[0].name : 'Your Batch';

    const [students] = await pool.query(
      `SELECT u.id as user_id, u.full_name, u.email 
       FROM batch_students bs
       JOIN students s ON bs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE bs.batch_id = ? AND bs.status = 'ENROLLED'`,
      [batch_id]
    );

    const timingStr = `${start_time} - ${end_time}`;
    const notifyTitle = `🗓️ New Class Schedule: ${batchName}`;
    const notifyMsg = `${day_of_week}: ${subject} (${timingStr}) in ${room_number || 'Main Lab/Online'}`;

    // Disptach in-app notifications and email to all enrolled students
    for (const stu of students) {
      await pool.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'TIMETABLE')",
        [stu.user_id, notifyTitle, notifyMsg]
      ).catch(() => {});

      sendBatchScheduleUpdateEmail({
        toEmail: stu.email,
        studentName: stu.full_name,
        batchName,
        dayOfWeek: day_of_week,
        subject,
        timing: timingStr,
        roomNumber,
        notes,
        updatedBy: req.user.full_name
      }).catch(() => {});
    }

    return successResponse(res, 201, 'Timetable slot added and students notified', { id: result.insertId, notified_students: students.length });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to add timetable slot', error.message);
  }
};

/**
 * PUT /api/timetable/:id
 * Update an existing slot & notify enrolled students of the new timing.
 */
const updateSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { trainer_id, day_of_week, subject, start_time, end_time, room_number, notes } = req.body;

    const [existing] = await pool.query('SELECT * FROM timetable_slots WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'Timetable slot not found');
    }

    const slot = existing[0];
    const newDay = day_of_week ? day_of_week.toUpperCase() : slot.day_of_week;
    const newSubject = subject || slot.subject;
    const newStart = start_time || slot.start_time;
    const newEnd = end_time || slot.end_time;
    const newRoom = room_number !== undefined ? room_number : slot.room_number;
    const newNotes = notes !== undefined ? notes : slot.notes;
    const newTrainer = trainer_id !== undefined ? trainer_id : slot.trainer_id;

    await pool.query(
      `UPDATE timetable_slots 
       SET trainer_id=?, day_of_week=?, subject=?, start_time=?, end_time=?, room_number=?, notes=? 
       WHERE id=?`,
      [newTrainer || null, newDay, newSubject, newStart, newEnd, newRoom, newNotes, id]
    );

    // Fetch batch details and enrolled students
    const [batchRows] = await pool.query('SELECT name FROM batches WHERE id = ?', [slot.batch_id]);
    const batchName = batchRows.length > 0 ? batchRows[0].name : 'Your Batch';

    const [students] = await pool.query(
      `SELECT u.id as user_id, u.full_name, u.email 
       FROM batch_students bs
       JOIN students s ON bs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE bs.batch_id = ? AND bs.status = 'ENROLLED'`,
      [slot.batch_id]
    );

    const timingStr = `${newStart} - ${newEnd}`;
    const notifyTitle = `⏰ Timing Changed: ${batchName}`;
    const notifyMsg = `${newDay} ${newSubject} updated to ${timingStr} (Room: ${newRoom || 'N/A'})`;

    for (const stu of students) {
      await pool.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'TIMETABLE')",
        [stu.user_id, notifyTitle, notifyMsg]
      ).catch(() => {});

      sendBatchScheduleUpdateEmail({
        toEmail: stu.email,
        studentName: stu.full_name,
        batchName,
        dayOfWeek: newDay,
        subject: newSubject,
        timing: timingStr,
        roomNumber: newRoom,
        notes: newNotes,
        updatedBy: req.user.full_name
      }).catch(() => {});
    }

    return successResponse(res, 200, 'Timetable slot updated and students notified', { notified_students: students.length });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update timetable slot', error.message);
  }
};

/**
 * DELETE /api/timetable/:id
 * Delete a slot & notify students of cancellation.
 */
const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM timetable_slots WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'Timetable slot not found');
    }

    const slot = existing[0];
    await pool.query('DELETE FROM timetable_slots WHERE id = ?', [id]);

    const [batchRows] = await pool.query('SELECT name FROM batches WHERE id = ?', [slot.batch_id]);
    const batchName = batchRows.length > 0 ? batchRows[0].name : 'Your Batch';

    const [students] = await pool.query(
      `SELECT u.id as user_id, u.full_name, u.email 
       FROM batch_students bs
       JOIN students s ON bs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE bs.batch_id = ? AND bs.status = 'ENROLLED'`,
      [slot.batch_id]
    );

    for (const stu of students) {
      await pool.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'TIMETABLE')",
        [stu.user_id, `🚫 Session Cancelled: ${batchName}`, `${slot.day_of_week} ${slot.subject} class has been removed from the schedule.`]
      ).catch(() => {});
    }

    return successResponse(res, 200, 'Timetable slot deleted and students notified');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete timetable slot', error.message);
  }
};

module.exports = { getTimetable, addSlot, updateSlot, deleteSlot };
