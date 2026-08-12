const { errorResponse } = require('../utils/responseHelper');

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'User not authenticated');
    }

    // Support both uppercase & formatted role names (e.g. 'Admin' or 'ADMIN', 'Sales Executive' or 'SALES_EXECUTIVE')
    const userRoleNormalized = req.user.role_name.toUpperCase().replace(/\s+/g, '_');
    const allowedNormalized = allowedRoles.map(r => r.toUpperCase().replace(/\s+/g, '_'));

    if (!allowedNormalized.includes(userRoleNormalized)) {
      return errorResponse(
        res,
        403,
        `Access denied. Role '${req.user.role_name}' is not authorized to perform this action.`
      );
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
  checkRole: (roles) => authorizeRoles(...(Array.isArray(roles) ? roles : [roles]))
};
