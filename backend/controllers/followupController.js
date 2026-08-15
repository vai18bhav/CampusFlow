const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/** GET /api/leads/:id/followups */
const getFollowups = async (req, res) => {
  try {
    const { id } = req.params;
    const [followups] = await pool.query(
      `SELECT lf.*, u.full_name AS followed_by_name
       FROM lead_followups lf
       LEFT JOIN users u ON lf.followed_by = u.id
       WHERE lf.lead_id = ?
       ORDER BY lf.created_at DESC`,
      [id]
    );
    return successResponse(res, 200, 'Follow-ups fetched', { followups });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch follow-ups', error.message);
  }
};

/** POST /api/leads/:id/followups */
const addFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const { follow_mode, notes, outcome, next_followup_date } = req.body;
    if (!notes) return errorResponse(res, 400, 'Follow-up notes are required');

    const [result] = await pool.query(
      `INSERT INTO lead_followups (lead_id, followed_by, follow_mode, notes, outcome, next_followup_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, follow_mode || 'CALL', notes, outcome || 'CALLBACK', next_followup_date || null]
    );

    // Auto-update lead status based on outcome
    const statusMap = { CONVERTED: 'CONVERTED', NOT_INTERESTED: 'LOST', INTERESTED: 'IN_PROGRESS', CALLBACK: 'CONTACTED', NO_RESPONSE: 'CONTACTED' };
    if (statusMap[outcome]) {
      await pool.query('UPDATE leads SET status = ? WHERE id = ?', [statusMap[outcome], id]);
    }

    return successResponse(res, 201, 'Follow-up recorded successfully', { id: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to add follow-up', error.message);
  }
};

/** DELETE /api/leads/followups/:fid */
const deleteFollowup = async (req, res) => {
  try {
    await pool.query('DELETE FROM lead_followups WHERE id = ?', [req.params.fid]);
    return successResponse(res, 200, 'Follow-up deleted');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete follow-up', error.message);
  }
};

module.exports = { getFollowups, addFollowup, deleteFollowup };
