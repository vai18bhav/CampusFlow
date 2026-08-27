const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/permission-overrides
 * Lists active and past permission overrides
 */
const getPermissionOverrides = async (req, res) => {
  try {
    const [overrides] = await pool.query(
      `SELECT po.*, u.full_name as user_name, u.email as user_email, r.name as role_name,
              cb.full_name as created_by_name
       FROM permission_overrides po
       JOIN users u ON po.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN users cb ON po.created_by = cb.id
       ORDER BY po.id DESC`
    );

    const now = new Date();
    overrides.forEach(o => {
      o.is_expired = new Date(o.expires_at) < now;
    });

    return successResponse(res, 200, 'Permission overrides retrieved', { overrides });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch permission overrides', error.message);
  }
};

/**
 * POST /api/permission-overrides
 * Grants or restricts a permission temporarily for a user (Super Admin only)
 */
const createPermissionOverride = async (req, res) => {
  try {
    const { user_id, permission, action = 'GRANT', expires_at } = req.body;

    if (!user_id || !permission || !expires_at) {
      return errorResponse(res, 400, 'User ID, Permission, and Expiry datetime are required');
    }

    if (!['GRANT', 'RESTRICT'].includes(action.toUpperCase())) {
      return errorResponse(res, 400, 'Action must be GRANT or RESTRICT');
    }

    const expiryDate = new Date(expires_at);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return errorResponse(res, 400, 'Expiry date must be a valid future date and time');
    }

    const mysqlExpiry = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

    const [users] = await pool.query('SELECT u.id, u.full_name, u.email, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?', [user_id]);
    if (users.length === 0) {
      return errorResponse(res, 404, 'User not found');
    }
    const targetUser = users[0];

    const [result] = await pool.query(
      `INSERT INTO permission_overrides (user_id, permission, action, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, permission.trim(), action.toUpperCase(), mysqlExpiry, req.user?.id || null]
    );

    const overrideId = result.insertId;

    // Log to Audit Log (FR-007)
    await logAudit(
      req,
      req.user?.id,
      'CREATE_PERMISSION_OVERRIDE',
      'permission_overrides',
      overrideId,
      `Granted temporary ${action} override for permission '${permission}' to ${targetUser.full_name} (${targetUser.role_name}). Expires: ${expires_at}`
    );

    return successResponse(res, 201, 'Temporary permission override created successfully', {
      id: overrideId,
      user_name: targetUser.full_name,
      permission,
      action: action.toUpperCase(),
      expires_at
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to create permission override', error.message);
  }
};

/**
 * DELETE /api/permission-overrides/:id
 * Revokes a temporary permission override early (Super Admin only)
 */
const revokePermissionOverride = async (req, res) => {
  try {
    const { id } = req.params;

    const [overrides] = await pool.query(
      `SELECT po.*, u.full_name as user_name FROM permission_overrides po
       JOIN users u ON po.user_id = u.id WHERE po.id = ?`,
      [id]
    );
    if (overrides.length === 0) {
      return errorResponse(res, 404, 'Permission override not found');
    }

    const ov = overrides[0];
    await pool.query('DELETE FROM permission_overrides WHERE id = ?', [id]);

    await logAudit(
      req,
      req.user?.id,
      'REVOKE_PERMISSION_OVERRIDE',
      'permission_overrides',
      parseInt(id, 10),
      `Revoked permission override #${id} for ${ov.user_name} (permission: ${ov.permission})`
    );

    return successResponse(res, 200, 'Permission override revoked successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to revoke permission override', error.message);
  }
};

module.exports = {
  getPermissionOverrides,
  createPermissionOverride,
  revokePermissionOverride
};
