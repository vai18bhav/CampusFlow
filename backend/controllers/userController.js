const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendStudentWelcomeEmail } = require('../utils/emailService');

/**
 * Get All Users (Admin / Super Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;

    let query = `
      SELECT u.id, u.role_id, r.name as role_name, u.full_name, u.email, u.phone, u.status, u.avatar_url, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const queryParams = [];

    if (role) {
      query += ' AND r.name = ?';
      queryParams.push(role);
    }

    if (status) {
      query += ' AND u.status = ?';
      queryParams.push(status);
    }

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const term = `%${search}%`;
      queryParams.push(term, term, term);
    }

    query += ' ORDER BY u.id DESC';

    const [users] = await pool.query(query, queryParams);
    return successResponse(res, 200, 'Users retrieved successfully', { users });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch users', error.message);
  }
};

/**
 * Create User with Role Profile
 */
const createUser = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { role_id, full_name, email, password, phone, role_data } = req.body;

    if (!role_id || !full_name || !email || !password) {
      return errorResponse(res, 400, 'Role ID, Full Name, Email, and Password are required');
    }

    // Check duplicate email
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return errorResponse(res, 409, 'Email address is already registered');
    }

    const [roles] = await connection.query('SELECT name FROM roles WHERE id = ?', [role_id]);
    if (roles.length === 0) {
      return errorResponse(res, 404, 'Invalid Role ID');
    }

    const roleName = roles[0].name;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [userResult] = await connection.query(
      'INSERT INTO users (role_id, full_name, email, password_hash, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
      [role_id, full_name, email.trim().toLowerCase(), passwordHash, phone || null, 'ACTIVE']
    );

    const userId = userResult.insertId;

    // Create role specific record
    if (roleName === 'STUDENT') {
      const rollNumber = role_data?.roll_number || `STU-${new Date().getFullYear()}-${String(userId).padStart(3, '0')}`;
      await connection.query(
        'INSERT INTO students (user_id, roll_number, dob, gender, address, qualification, guardian_name, guardian_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          rollNumber,
          role_data?.dob || null,
          role_data?.gender || 'OTHER',
          role_data?.address || null,
          role_data?.qualification || null,
          role_data?.guardian_name || null,
          role_data?.guardian_phone || null
        ]
      );
    } else if (roleName === 'TRAINER') {
      const empId = role_data?.employee_id || `EMP-TRN-${String(userId).padStart(3, '0')}`;
      await connection.query(
        'INSERT INTO trainers (user_id, employee_id, specialization, qualification, experience_years, bio) VALUES (?, ?, ?, ?, ?, ?)',
        [
          userId,
          empId,
          role_data?.specialization || 'Software Engineering',
          role_data?.qualification || null,
          role_data?.experience_years || 0,
          role_data?.bio || null
        ]
      );
    } else if (roleName === 'SALES_EXECUTIVE') {
      const empId = role_data?.employee_id || `EMP-SLS-${String(userId).padStart(3, '0')}`;
      await connection.query(
        'INSERT INTO sales_executives (user_id, employee_id, target_conversions) VALUES (?, ?, ?)',
        [userId, empId, role_data?.target_conversions || 20]
      );
    } else if (roleName === 'SUPPORT_EXECUTIVE') {
      const empId = role_data?.employee_id || `EMP-SUP-${String(userId).padStart(3, '0')}`;
      await connection.query(
        'INSERT INTO support_executives (user_id, employee_id, department) VALUES (?, ?, ?)',
        [userId, empId, role_data?.department || 'Student Helpdesk']
      );
    }

    await connection.commit();

    if (roleName === 'STUDENT') {
      sendStudentWelcomeEmail({
        toEmail: email.trim().toLowerCase(),
        studentName: full_name,
        rollNumber: role_data?.roll_number,
        password: password
      }).catch(err => console.error('Student email error:', err.message));
    }

    return successResponse(res, 201, 'User created successfully', { userId });
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 500, 'User creation failed', error.message);
  } finally {
    connection.release();
  }
};

/**
 * Get Students List
 */
const getStudents = async (req, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT s.id as student_id, u.id as user_id, u.full_name, u.email, u.phone, u.status, s.roll_number, s.dob, s.gender, s.qualification, s.guardian_name, s.guardian_phone, s.created_at
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR s.roll_number LIKE ?)';
      const term = `%${search}%`;
      queryParams.push(term, term, term);
    }

    query += ' ORDER BY s.id DESC';

    const [students] = await pool.query(query, queryParams);

    // Fetch batch enrollments for students
    for (let student of students) {
      const [batches] = await pool.query(
        `SELECT b.id, b.batch_code, b.name as batch_name, c.name as course_name, bs.status as enrollment_status
         FROM batch_students bs
         JOIN batches b ON bs.batch_id = b.id
         JOIN courses c ON b.course_id = c.id
         WHERE bs.student_id = ?`,
        [student.student_id]
      );
      student.batches = batches;
    }

    return successResponse(res, 200, 'Students fetched successfully', { students });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch students', error.message);
  }
};

/**
 * Get Trainers List
 */
const getTrainers = async (req, res) => {
  try {
    const [trainers] = await pool.query(
      `SELECT t.id as trainer_id, u.id as user_id, u.full_name, u.email, u.phone, u.status, t.employee_id, t.specialization, t.qualification, t.experience_years, t.bio
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.id DESC`
    );

    for (let trainer of trainers) {
      const [batches] = await pool.query(
        `SELECT b.id, b.batch_code, b.name as batch_name, b.status 
         FROM batches b 
         WHERE b.trainer_id = ?`,
        [trainer.trainer_id]
      );
      trainer.assigned_batches = batches;
    }

    return successResponse(res, 200, 'Trainers fetched successfully', { trainers });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch trainers', error.message);
  }
};

/**
 * Update User Status / Details
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, status } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'User not found');
    }

    await pool.query(
      'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), status = COALESCE(?, status) WHERE id = ?',
      [full_name, phone, status, id]
    );

    return successResponse(res, 200, 'User updated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'User update failed', error.message);
  }
};

/**
 * Delete User
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return errorResponse(res, 400, 'Cannot delete your own active account');
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return successResponse(res, 200, 'User deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'User deletion failed', error.message);
  }
};

/**
 * Get Roles
 */
const getRoles = async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT id, name, description FROM roles ORDER BY id ASC');
    return successResponse(res, 200, 'Roles retrieved', { roles });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch roles', error.message);
  }
};

/**
 * Update User Status (PATCH /api/users/:id/status)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return errorResponse(res, 400, 'Valid status (ACTIVE, INACTIVE, SUSPENDED) is required');
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'User not found');
    }

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return successResponse(res, 200, `User status updated to ${status}`);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update user status', error.message);
  }
};

/**
 * Get Pending Account Approvals (Super Admin / Admin)
 */
const getPendingApprovals = async (req, res) => {
  try {
    const [pendingUsers] = await pool.query(
      `SELECT u.id as user_id, u.full_name, u.email, u.phone, u.status, u.created_at,
              s.id as student_id, s.roll_number, s.qualification, s.guardian_name, s.guardian_phone
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.status = 'PENDING'
       ORDER BY u.id DESC`
    );

    return successResponse(res, 200, 'Pending approvals fetched', { pendingUsers });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch pending approvals', error.message);
  }
};

/**
 * Approve User Account (Super Admin / Admin)
 */
const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.query('SELECT id, full_name, email FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return errorResponse(res, 404, 'User account not found');
    }

    // Update status to ACTIVE
    await pool.query('UPDATE users SET status = "ACTIVE" WHERE id = ?', [id]);

    // Send confirmation notification
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [id, 'Account Approved 🎉', 'Your CampusFlow student account has been approved by the Administrator. You now have full access to all features.', 'GENERAL']
    );

    return successResponse(res, 200, 'User account approved successfully!');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to approve user account', error.message);
  }
};

/**
 * Reject User Account (Super Admin / Admin)
 */
const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('UPDATE users SET status = "INACTIVE" WHERE id = ?', [id]);
    return successResponse(res, 200, 'User account rejected/deactivated');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to reject user account', error.message);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  getStudents,
  getTrainers,
  updateUser,
  updateUserStatus,
  getPendingApprovals,
  approveUser,
  rejectUser,
  deleteUser,
  getRoles
};
