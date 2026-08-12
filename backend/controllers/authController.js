const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken } = require('../utils/jwtHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * User Login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, 'Email and password are required');
    }

    // Query user with role info
    const [users] = await pool.query(
      `SELECT u.id, u.role_id, r.name as role_name, u.full_name, u.email, u.password_hash, u.phone, u.status, u.avatar_url 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    const user = users[0];

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 403, `Account status is ${user.status}. Please contact administrator.`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Role-specific ID attachment
    let roleSpecificData = {};
    if (user.role_name === 'STUDENT') {
      const [stu] = await pool.query('SELECT id, roll_number FROM students WHERE user_id = ?', [user.id]);
      if (stu.length > 0) roleSpecificData = { student_id: stu[0].id, roll_number: stu[0].roll_number };
    } else if (user.role_name === 'TRAINER') {
      const [trn] = await pool.query('SELECT id, employee_id FROM trainers WHERE user_id = ?', [user.id]);
      if (trn.length > 0) roleSpecificData = { trainer_id: trn[0].id, employee_id: trn[0].employee_id };
    } else if (user.role_name === 'SALES_EXECUTIVE') {
      const [sls] = await pool.query('SELECT id, employee_id FROM sales_executives WHERE user_id = ?', [user.id]);
      if (sls.length > 0) roleSpecificData = { sales_exec_id: sls[0].id, employee_id: sls[0].employee_id };
    } else if (user.role_name === 'SUPPORT_EXECUTIVE') {
      const [sup] = await pool.query('SELECT id, employee_id FROM support_executives WHERE user_id = ?', [user.id]);
      if (sup.length > 0) roleSpecificData = { support_exec_id: sup[0].id, employee_id: sup[0].employee_id };
    }

    const token = generateToken({
      userId: user.id,
      roleId: user.role_id,
      roleName: user.role_name,
      email: user.email
    });

    // Don't send password_hash back
    delete user.password_hash;

    const responseUser = {
      ...user,
      ...roleSpecificData
    };

    return successResponse(res, 200, 'Login successful', {
      token,
      user: responseUser
    });
  } catch (error) {
    console.error('Login Error:', error);
    return errorResponse(res, 500, 'Login failed', error.message);
  }
};

/**
 * Get Current Profile
 */
const getProfile = async (req, res) => {
  try {
    return successResponse(res, 200, 'Profile retrieved successfully', {
      user: req.user
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch profile', error.message);
  }
};

/**
 * Change Password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, 'Current and new password are required');
    }

    const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return errorResponse(res, 404, 'User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) {
      return errorResponse(res, 400, 'Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    return successResponse(res, 200, 'Password changed successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Password change failed', error.message);
  }
};

/**
 * User Logout
 */
const logout = async (req, res) => {
  return successResponse(res, 200, 'Logout successful');
};

/**
 * Forgot Password Request
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 400, 'Email address is required');
    }

    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (users.length === 0) {
      return errorResponse(res, 404, 'No account found with this email address');
    }

    return successResponse(res, 200, 'Password reset instructions sent to email');
  } catch (error) {
    return errorResponse(res, 500, 'Password reset request failed', error.message);
  }
};

/**
 * Student Self-Registration (Pending Admin Approval)
 */
const registerStudent = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { full_name, email, password, phone, qualification, guardian_name, guardian_phone } = req.body;

    if (!full_name || !email || !password) {
      return errorResponse(res, 400, 'Full Name, Email, and Password are required');
    }

    // Check duplicate email
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return errorResponse(res, 409, 'An account with this email address already exists');
    }

    // Student role_id is 6
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [userResult] = await connection.query(
      'INSERT INTO users (role_id, full_name, email, password_hash, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
      [6, full_name, email.trim().toLowerCase(), passwordHash, phone || null, 'PENDING']
    );

    const userId = userResult.insertId;
    const rollNumber = `STU-${new Date().getFullYear()}-${String(userId).padStart(3, '0')}`;

    await connection.query(
      'INSERT INTO students (user_id, roll_number, qualification, guardian_name, guardian_phone) VALUES (?, ?, ?, ?, ?)',
      [userId, rollNumber, qualification || null, guardian_name || null, guardian_phone || null]
    );

    await connection.commit();

    return successResponse(res, 201, 'Registration submitted successfully! Your account is pending administrator approval before you can log in.', {
      userId,
      rollNumber,
      status: 'PENDING'
    });
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 500, 'Student registration failed', error.message);
  } finally {
    connection.release();
  }
};

module.exports = {
  login,
  logout,
  forgotPassword,
  registerStudent,
  getProfile,
  changePassword
};
