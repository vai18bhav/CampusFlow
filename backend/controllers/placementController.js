const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/** GET /api/placements */
const getPlacements = async (req, res) => {
  try {
    const [placements] = await pool.query(
      `SELECT p.*, u.full_name AS student_name, u.email AS student_email,
              c.name AS course_name, b.name AS batch_name
       FROM placements p
       JOIN students s ON p.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN courses c ON p.course_id = c.id
       LEFT JOIN batches b ON p.batch_id = b.id
       ORDER BY p.created_at DESC`
    );

    // Stats summary
    const [stats] = await pool.query(
      `SELECT
         COUNT(*) AS total_placed,
         AVG(ctc_lpa) AS avg_ctc,
         MAX(ctc_lpa) AS highest_ctc,
         COUNT(DISTINCT company_name) AS unique_companies
       FROM placements WHERE status = 'PLACED'`
    );

    return successResponse(res, 200, 'Placements fetched', { placements, stats: stats[0] });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch placements', error.message);
  }
};

/** POST /api/placements */
const addPlacement = async (req, res) => {
  try {
    const { student_id, batch_id, course_id, company_name, job_role, ctc_lpa, offer_date, joining_date, placement_type, notes } = req.body;
    if (!student_id || !company_name || !job_role)
      return errorResponse(res, 400, 'student_id, company_name, and job_role are required');

    // Check if student already has a placement record
    const [existing] = await pool.query('SELECT id FROM placements WHERE student_id = ?', [student_id]);
    if (existing.length > 0) {
      // Update instead
      await pool.query(
        `UPDATE placements SET batch_id=?, course_id=?, company_name=?, job_role=?, ctc_lpa=?, offer_date=?, joining_date=?, placement_type=?, notes=?, status='PLACED', recorded_by=? WHERE student_id=?`,
        [batch_id || null, course_id || null, company_name, job_role, ctc_lpa || null, offer_date || null, joining_date || null, placement_type || 'FULL_TIME', notes || null, req.user.id, student_id]
      );
      return successResponse(res, 200, 'Placement record updated');
    }

    const [result] = await pool.query(
      `INSERT INTO placements (student_id, batch_id, course_id, company_name, job_role, ctc_lpa, offer_date, joining_date, placement_type, status, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLACED', ?, ?)`,
      [student_id, batch_id || null, course_id || null, company_name, job_role, ctc_lpa || null, offer_date || null, joining_date || null, placement_type || 'FULL_TIME', notes || null, req.user.id]
    );
    return successResponse(res, 201, 'Placement record added', { id: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to add placement', error.message);
  }
};

/** PUT /api/placements/:id */
const updatePlacement = async (req, res) => {
  try {
    const { company_name, job_role, ctc_lpa, offer_date, joining_date, placement_type, status, notes } = req.body;
    await pool.query(
      `UPDATE placements SET company_name=?, job_role=?, ctc_lpa=?, offer_date=?, joining_date=?, placement_type=?, status=?, notes=? WHERE id=?`,
      [company_name, job_role, ctc_lpa || null, offer_date || null, joining_date || null, placement_type || 'FULL_TIME', status || 'PLACED', notes || null, req.params.id]
    );
    return successResponse(res, 200, 'Placement updated');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update placement', error.message);
  }
};

/** DELETE /api/placements/:id */
const deletePlacement = async (req, res) => {
  try {
    await pool.query('DELETE FROM placements WHERE id = ?', [req.params.id]);
    return successResponse(res, 200, 'Placement record deleted');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete placement', error.message);
  }
};

module.exports = { getPlacements, addPlacement, updatePlacement, deletePlacement };
