const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * GET /api/audit-logs
 * Retrieves audit logs with date range, user, and action filters (Super Admin only)
 */
const getAuditLogs = async (req, res) => {
  try {
    const { from, to, user_id, action, page = 1, limit = 50 } = req.query;

    let query = `
      SELECT al.*, u.full_name as user_name, u.email as user_email, r.name as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (from) { query += ' AND al.created_at >= ?'; params.push(`${from} 00:00:00`); }
    if (to) { query += ' AND al.created_at <= ?'; params.push(`${to} 23:59:59`); }
    if (user_id) { query += ' AND al.user_id = ?'; params.push(user_id); }
    if (action) { query += ' AND al.action = ?'; params.push(action); }

    // Count
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_sub`;
    const [countRow] = await pool.query(countQuery, params);
    const total = countRow[0]?.total || 0;

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    query += ' ORDER BY al.id DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [logs] = await pool.query(query, params);

    return successResponse(res, 200, 'Audit logs retrieved', {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch audit logs', error.message);
  }
};

/**
 * GET /api/audit-logs/action-types
 * Returns distinct action types for filter dropdown
 */
const getActionTypes = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC');
    const actions = rows.map(r => r.action);
    return successResponse(res, 200, 'Action types retrieved', { actions });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch action types', error.message);
  }
};

module.exports = {
  getAuditLogs,
  getActionTypes
};
