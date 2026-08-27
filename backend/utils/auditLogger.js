const pool = require('../config/db');

/**
 * Log action into audit_logs table (non-blocking)
 * @param {Object} req Express request object (optional)
 * @param {number} userId User ID performing the action
 * @param {string} action Action name (e.g. 'CREATE_USER', 'PERMISSION_OVERRIDE', 'UPDATE_CONFIG')
 * @param {string} entityType Affected entity name (e.g. 'users', 'permission_overrides', 'platform_config')
 * @param {number} entityId Entity ID
 * @param {string|Object} details Details or description
 */
const logAudit = async (req, userId, action, entityType = null, entityId = null, details = null) => {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null) : null;
    const finalUserId = userId || req?.user?.id || null;
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [finalUserId, action, entityType, entityId, ip, detailsStr]
    );
  } catch (err) {
    console.error('Audit Logger Error:', err.message);
  }
};

module.exports = { logAudit };
