const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * GET /api/attendance
 * GET /api/attendance/batch/:batchId
 * Retrieves batch attendance roster for a specific date.
 */
const getBatchAttendance = async (req, res) => {
  try {
    const batch_id = req.params.batchId || req.query.batch_id;
    const { date } = req.query;

    if (!batch_id) {
      return errorResponse(res, 400, 'Batch ID is required');
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // Verify Trainer Batch Assignment (if user is Trainer)
    if (req.user.role_name === 'TRAINER') {
      const [bCheck] = await pool.query('SELECT id FROM batches WHERE id = ? AND trainer_id = ?', [batch_id, req.user.trainer_id]);
      if (bCheck.length === 0) {
        return errorResponse(res, 403, 'You are not assigned to manage attendance for this batch');
      }
    }

    // Fetch batch students with attendance record on target date
    const [attendance] = await pool.query(
      `SELECT s.id as student_id, u.full_name as student_name, u.email as student_email, s.roll_number,
              att.id as attendance_id, att.date, COALESCE(att.status, 'PRESENT') as status, att.remarks
       FROM batch_students bs
       JOIN students s ON bs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN attendance att ON (att.student_id = s.id AND att.batch_id = bs.batch_id AND att.date = ?)
       WHERE bs.batch_id = ? AND bs.status = 'ENROLLED'
       ORDER BY s.roll_number ASC`,
      [targetDate, batch_id]
    );

    return successResponse(res, 200, 'Batch attendance retrieved successfully', {
      batch_id: parseInt(batch_id, 10),
      date: targetDate,
      attendance
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch batch attendance', error.message);
  }
};

/**
 * POST /api/attendance
 * Marks or updates attendance records in bulk for a batch.
 */
const markAttendance = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { batch_id, date, attendance_records } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (!batch_id || !Array.isArray(attendance_records)) {
      return errorResponse(res, 400, 'Batch ID, Date, and Attendance Records array are required');
    }

    // Verify Trainer Batch Assignment
    if (req.user.role_name === 'TRAINER') {
      const [bCheck] = await connection.query('SELECT id FROM batches WHERE id = ? AND trainer_id = ?', [batch_id, req.user.trainer_id]);
      if (bCheck.length === 0) {
        await connection.rollback();
        return errorResponse(res, 403, 'You are not assigned to mark attendance for this batch');
      }
    }

    const markedBy = req.user.id;

    for (let record of attendance_records) {
      const { student_id, status, remarks } = record;

      // Verify Student is enrolled in batch
      const [enrolled] = await connection.query(
        'SELECT id FROM batch_students WHERE batch_id = ? AND student_id = ? AND status = "ENROLLED"',
        [batch_id, student_id]
      );

      if (enrolled.length > 0) {
        await connection.query(
          `INSERT INTO attendance (batch_id, student_id, date, status, marked_by, remarks)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by), remarks = VALUES(remarks)`,
          [batch_id, student_id, targetDate, status || 'PRESENT', markedBy, remarks || null]
        );
      }
    }

    await connection.commit();
    return successResponse(res, 200, 'Attendance saved successfully');
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 500, 'Failed to save attendance', error.message);
  } finally {
    connection.release();
  }
};

/**
 * GET /api/attendance/student/:studentId
 * GET /api/attendance/summary/:studentId
 * Retrieves attendance history and percentage for a student.
 */
const getStudentAttendanceHistory = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user.student_id;

    if (!studentId) {
      return errorResponse(res, 400, 'Student ID not specified');
    }

    // Role check: Students can only view their own attendance
    if (req.user.role_name === 'STUDENT' && parseInt(studentId, 10) !== parseInt(req.user.student_id, 10)) {
      return errorResponse(res, 403, 'You are only authorized to view your own attendance');
    }

    const [attendance] = await pool.query(
      `SELECT att.*, b.name as batch_name, b.batch_code, u.full_name as marked_by_name
       FROM attendance att
       JOIN batches b ON att.batch_id = b.id
       LEFT JOIN users u ON att.marked_by = u.id
       WHERE att.student_id = ?
       ORDER BY att.date DESC`,
      [studentId]
    );

    const totalCount = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
    const lateCount = attendance.filter(a => a.status === 'LATE').length;
    const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
    const leaveCount = attendance.filter(a => a.status === 'LEAVE' || a.status === 'EXCUSED').length;

    // Attendance Percentage = (Present + Late) / Total * 100
    const percentage = totalCount > 0 ? (((presentCount + lateCount) / totalCount) * 100).toFixed(1) : 100.0;

    return successResponse(res, 200, 'Student attendance history fetched successfully', {
      summary: {
        total_days: totalCount,
        present_days: presentCount,
        late_days: lateCount,
        absent_days: absentCount,
        leave_days: leaveCount,
        attendance_percentage: parseFloat(percentage)
      },
      history: attendance
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch attendance history', error.message);
  }
};

module.exports = {
  getBatchAttendance,
  markAttendance,
  getStudentAttendanceHistory
};
