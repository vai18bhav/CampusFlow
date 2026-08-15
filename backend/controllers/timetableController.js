const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/** GET /api/timetable?batch_id=X */
const getTimetable = async (req, res) => {
  try {
    const { batch_id } = req.query;
    if (!batch_id) return errorResponse(res, 400, 'batch_id is required');

    const [slots] = await pool.query(
      `SELECT ts.*, u.full_name AS trainer_name
       FROM timetable_slots ts
       LEFT JOIN trainers t ON ts.trainer_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE ts.batch_id = ?
       ORDER BY FIELD(ts.day_of_week,'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'), ts.start_time`,
      [batch_id]
    );
    return successResponse(res, 200, 'Timetable fetched', { slots });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch timetable', error.message);
  }
};

/** POST /api/timetable */
const addSlot = async (req, res) => {
  try {
    const { batch_id, trainer_id, day_of_week, subject, start_time, end_time, room_number, notes } = req.body;
    if (!batch_id || !day_of_week || !subject || !start_time || !end_time)
      return errorResponse(res, 400, 'batch_id, day_of_week, subject, start_time, end_time are required');

    const [result] = await pool.query(
      `INSERT INTO timetable_slots (batch_id, trainer_id, day_of_week, subject, start_time, end_time, room_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [batch_id, trainer_id || null, day_of_week, subject, start_time, end_time, room_number || null, notes || null]
    );
    return successResponse(res, 201, 'Timetable slot added', { id: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to add slot', error.message);
  }
};

/** PUT /api/timetable/:id */
const updateSlot = async (req, res) => {
  try {
    const { trainer_id, day_of_week, subject, start_time, end_time, room_number, notes } = req.body;
    await pool.query(
      `UPDATE timetable_slots SET trainer_id=?, day_of_week=?, subject=?, start_time=?, end_time=?, room_number=?, notes=? WHERE id=?`,
      [trainer_id || null, day_of_week, subject, start_time, end_time, room_number || null, notes || null, req.params.id]
    );
    return successResponse(res, 200, 'Timetable slot updated');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update slot', error.message);
  }
};

/** DELETE /api/timetable/:id */
const deleteSlot = async (req, res) => {
  try {
    await pool.query('DELETE FROM timetable_slots WHERE id = ?', [req.params.id]);
    return successResponse(res, 200, 'Timetable slot deleted');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete slot', error.message);
  }
};

module.exports = { getTimetable, addSlot, updateSlot, deleteSlot };
