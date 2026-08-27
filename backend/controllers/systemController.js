const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/config
 * Retrieves all platform configuration settings (public or authenticated)
 */
const getPlatformConfig = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT config_key, config_value FROM platform_config');
    const configMap = {};
    rows.forEach(r => {
      try {
        configMap[r.config_key] = JSON.parse(r.config_value);
      } catch {
        configMap[r.config_key] = r.config_value;
      }
    });

    return successResponse(res, 200, 'Platform configuration retrieved', { config: configMap });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch platform configuration', error.message);
  }
};

/**
 * PUT /api/config
 * Updates platform configuration settings (Super Admin only)
 */
const updatePlatformConfig = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { settings } = req.body; // Object: { app_name: '...', course_categories: [...], ... }
    if (!settings || typeof settings !== 'object') {
      return errorResponse(res, 400, 'Settings object is required');
    }

    for (const [key, val] of Object.entries(settings)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      await connection.query(
        'INSERT INTO platform_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)',
        [key, valStr]
      );
    }

    await logAudit(req, req.user?.id, 'UPDATE_PLATFORM_CONFIG', 'platform_config', null, `Updated keys: ${Object.keys(settings).join(', ')}`);
    await connection.commit();

    return successResponse(res, 200, 'Platform configuration updated successfully');
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 500, 'Failed to update platform configuration', error.message);
  } finally {
    connection.release();
  }
};

module.exports = {
  getPlatformConfig,
  updatePlatformConfig
};
