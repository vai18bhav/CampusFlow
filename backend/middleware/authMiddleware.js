const { verifyToken: jwtVerify } = require('../utils/jwtHelper');
const { errorResponse } = require('../utils/responseHelper');
const pool = require('../config/db');

const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Authentication token missing or invalid format');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwtVerify(token);

    if (!decoded) {
      return errorResponse(res, 401, 'Invalid or expired token');
    }

    const [users] = await pool.query(
      `SELECT u.id, u.role_id, r.name as role_name, u.full_name, u.email, u.phone, u.status, u.avatar_url 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 401, 'User account no longer exists');
    }

    const user = users[0];

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 403, `Account status is ${user.status}. Access denied.`);
    }

    if (user.role_name === 'STUDENT') {
      const [stu] = await pool.query('SELECT id, roll_number FROM students WHERE user_id = ?', [user.id]);
      if (stu.length > 0) user.student_id = stu[0].id;
    } else if (user.role_name === 'TRAINER') {
      const [trn] = await pool.query('SELECT id, employee_id FROM trainers WHERE user_id = ?', [user.id]);
      if (trn.length > 0) user.trainer_id = trn[0].id;
    } else if (user.role_name === 'SALES_EXECUTIVE') {
      const [sls] = await pool.query('SELECT id, employee_id FROM sales_executives WHERE user_id = ?', [user.id]);
      if (sls.length > 0) user.sales_exec_id = sls[0].id;
    } else if (user.role_name === 'SUPPORT_EXECUTIVE') {
      const [sup] = await pool.query('SELECT id, employee_id FROM support_executives WHERE user_id = ?', [user.id]);
      if (sup.length > 0) user.support_exec_id = sup[0].id;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    return errorResponse(res, 500, 'Authentication error', error.message);
  }
};

module.exports = {
  authenticateJWT,
  verifyToken: authenticateJWT
};
