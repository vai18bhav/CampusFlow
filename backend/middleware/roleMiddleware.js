const pool = require('../config/db');
const { errorResponse } = require('../utils/responseHelper');

/**
 * Check if user has an active permission override in DB
 */
const checkActiveOverride = async (userId, path, method) => {
  try {
    const [overrides] = await pool.query(
      `SELECT action, permission FROM permission_overrides
       WHERE user_id = ? AND expires_at > UTC_TIMESTAMP()
       ORDER BY id DESC`,
      [userId]
    );

    if (overrides.length === 0) return null;

    for (const ov of overrides) {
      const perm = ov.permission.toLowerCase();
      const reqPath = (path || '').toLowerCase();
      if (perm === '*' || reqPath.includes(perm) || perm.includes(reqPath)) {
        return ov.action; // 'GRANT' or 'RESTRICT'
      }
    }
    return null;
  } catch (err) {
    console.error('Permission override check error:', err.message);
    return null;
  }
};

// ---------------------------------------------------------------------------
// authorizeRoles(...allowedRoles)
// Allows listed roles OR active GRANT override; blocks active RESTRICT override.
// ---------------------------------------------------------------------------
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'User not authenticated');
    }

    const userRoleNormalized = req.user.role_name.toUpperCase().replace(/\s+/g, '_');
    const allowedNormalized = allowedRoles.map(r => r.toUpperCase().replace(/\s+/g, '_'));

    // Check for active Super Admin temporary permission overrides (FR-007)
    const overrideAction = await checkActiveOverride(req.user.id, req.baseUrl || req.path, req.method);

    if (overrideAction === 'RESTRICT') {
      return errorResponse(
        res,
        403,
        `Access denied. Your role access has been temporarily restricted by Super Admin.`
      );
    }

    if (overrideAction === 'GRANT') {
      return next(); // Override granted access
    }

    if (!allowedNormalized.includes(userRoleNormalized)) {
      return errorResponse(
        res,
        403,
        `Access denied. Role '${req.user.role_name}' is not authorised to perform this action.`
      );
    }

    next();
  };
};

// ---------------------------------------------------------------------------
// requireNotRole(...forbiddenRoles)
// ---------------------------------------------------------------------------
const requireNotRole = (...forbiddenRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'User not authenticated');
    }

    const userRoleNormalized = req.user.role_name.toUpperCase().replace(/\s+/g, '_');
    const forbiddenNormalized = forbiddenRoles.map(r => r.toUpperCase().replace(/\s+/g, '_'));

    if (forbiddenNormalized.includes(userRoleNormalized)) {
      return errorResponse(
        res,
        403,
        `Access denied. Role '${req.user.role_name}' cannot perform this action.`
      );
    }

    next();
  };
};

// ---------------------------------------------------------------------------
// requireOwnOrRoles(getSubjectIdFn, ...adminRoles)
// ---------------------------------------------------------------------------
const requireOwnOrRoles = (getResourceOwnerId, getRequestingId, ...adminRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'User not authenticated');
    }

    const userRoleNormalized = req.user.role_name.toUpperCase().replace(/\s+/g, '_');
    const adminNormalized = adminRoles.map(r => r.toUpperCase().replace(/\s+/g, '_'));

    // Check override first
    const overrideAction = await checkActiveOverride(req.user.id, req.baseUrl || req.path, req.method);
    if (overrideAction === 'RESTRICT') {
      return errorResponse(res, 403, 'Access denied. Temporarily restricted by Super Admin.');
    }
    if (overrideAction === 'GRANT') {
      return next();
    }

    if (adminNormalized.includes(userRoleNormalized)) {
      return next();
    }

    const resourceId = parseInt(getResourceOwnerId(req), 10);
    const requesterId = parseInt(getRequestingId(req), 10);

    if (isNaN(resourceId) || isNaN(requesterId) || resourceId !== requesterId) {
      return errorResponse(res, 403, 'Access denied. You can only access your own data.');
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
  requireNotRole,
  requireOwnOrRoles,
  checkRole: (roles) => authorizeRoles(...(Array.isArray(roles) ? roles : [roles]))
};
