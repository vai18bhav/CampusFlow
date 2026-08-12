const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * GET /api/courses
 * Retrieves courses with search, status, and category filters.
 * Non-admin roles (e.g., Student) automatically get filtered for ACTIVE courses.
 */
const getCourses = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    // Role-based status filtering: Non-admins default to ACTIVE courses
    const userRole = req.user?.role_name?.toUpperCase();
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

    if (status) {
      query += ' AND status = ?';
      params.push(status.toUpperCase());
    } else if (!isAdmin) {
      query += ' AND status = "ACTIVE"';
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ? OR category LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC';

    const [courses] = await pool.query(query, params);
    return successResponse(res, 200, 'Courses retrieved successfully', { courses });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch courses', error.message);
  }
};

/**
 * GET /api/courses/:id
 * Retrieves complete course details along with aggregated batch & student stats.
 */
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, 'Invalid course ID provided');
    }

    const [courses] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
    if (courses.length === 0) {
      return errorResponse(res, 404, 'Course not found');
    }

    const course = courses[0];

    // Aggregated statistics for course details & future module integration
    const [batchStats] = await pool.query(
      'SELECT COUNT(id) as total_batches FROM batches WHERE course_id = ?',
      [id]
    );

    const [studentStats] = await pool.query(
      `SELECT COUNT(DISTINCT bs.student_id) as total_students 
       FROM batch_students bs 
       JOIN batches b ON bs.batch_id = b.id 
       WHERE b.course_id = ?`,
      [id]
    );

    const [trainerStats] = await pool.query(
      `SELECT COUNT(DISTINCT b.trainer_id) as assigned_trainers 
       FROM batches b 
       WHERE b.course_id = ? AND b.trainer_id IS NOT NULL`,
      [id]
    );

    course.stats = {
      total_batches: batchStats[0].total_batches || 0,
      total_students: studentStats[0].total_students || 0,
      assigned_trainers: trainerStats[0].assigned_trainers || 0
    };

    return successResponse(res, 200, 'Course details retrieved successfully', { course });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch course details', error.message);
  }
};

/**
 * POST /api/courses
 * Create a new course (Only Super Admin & Admin).
 */
const createCourse = async (req, res) => {
  try {
    // Support aliases: course_name/name, course_code/code, duration/duration_weeks, fees/fee_amount
    const code = (req.body.course_code || req.body.code || '').trim().toUpperCase();
    const name = (req.body.course_name || req.body.name || '').trim();
    const category = (req.body.category || 'Web Development').trim();
    const description = (req.body.description || '').trim();
    const duration_weeks = parseInt(req.body.duration_weeks || req.body.duration, 10);
    const fee_amount = parseFloat(req.body.fee_amount !== undefined ? req.body.fee_amount : req.body.fees);
    const status = (req.body.status || 'ACTIVE').toUpperCase();

    // Validation Rules
    if (!code || !name) {
      return errorResponse(res, 400, 'Course Code and Course Name are required');
    }

    if (isNaN(duration_weeks) || duration_weeks <= 0) {
      return errorResponse(res, 400, 'Duration must be a positive integer (number of weeks)');
    }

    if (isNaN(fee_amount) || fee_amount < 0) {
      return errorResponse(res, 400, 'Fees must be a valid positive number');
    }

    if (!['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      return errorResponse(res, 400, 'Status must be ACTIVE, INACTIVE, or ARCHIVED');
    }

    // Check Unique Course Code
    const [existing] = await pool.query('SELECT id FROM courses WHERE code = ?', [code]);
    if (existing.length > 0) {
      return errorResponse(res, 409, `Course Code '${code}' already exists. Please use a unique code.`);
    }

    const [result] = await pool.query(
      'INSERT INTO courses (code, name, category, description, duration_weeks, fee_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [code, name, category, description || null, duration_weeks, fee_amount, status]
    );

    return successResponse(res, 201, 'Course created successfully', {
      courseId: result.insertId,
      code,
      name,
      category,
      duration_weeks,
      fee_amount,
      status
    });
  } catch (error) {
    return errorResponse(res, 500, 'Course creation failed', error.message);
  }
};

/**
 * PUT /api/courses/:id
 * Update an existing course (Only Super Admin & Admin).
 */
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'Course not found');
    }

    const current = existing[0];

    const code = req.body.course_code || req.body.code ? (req.body.course_code || req.body.code).trim().toUpperCase() : current.code;
    const name = req.body.course_name || req.body.name ? (req.body.course_name || req.body.name).trim() : current.name;
    const category = req.body.category !== undefined ? req.body.category.trim() : current.category;
    const description = req.body.description !== undefined ? req.body.description.trim() : current.description;
    const duration_weeks = req.body.duration_weeks || req.body.duration ? parseInt(req.body.duration_weeks || req.body.duration, 10) : current.duration_weeks;
    const fee_amount = req.body.fee_amount !== undefined || req.body.fees !== undefined ? parseFloat(req.body.fee_amount !== undefined ? req.body.fee_amount : req.body.fees) : current.fee_amount;
    const status = req.body.status ? req.body.status.toUpperCase() : current.status;

    // Validation Rules
    if (isNaN(duration_weeks) || duration_weeks <= 0) {
      return errorResponse(res, 400, 'Duration must be a positive integer (number of weeks)');
    }

    if (isNaN(fee_amount) || fee_amount < 0) {
      return errorResponse(res, 400, 'Fees must be a valid positive number');
    }

    if (code !== current.code) {
      const [duplicate] = await pool.query('SELECT id FROM courses WHERE code = ? AND id != ?', [code, id]);
      if (duplicate.length > 0) {
        return errorResponse(res, 409, `Course Code '${code}' is already assigned to another course.`);
      }
    }

    await pool.query(
      'UPDATE courses SET code = ?, name = ?, category = ?, description = ?, duration_weeks = ?, fee_amount = ?, status = ? WHERE id = ?',
      [code, name, category, description, duration_weeks, fee_amount, status, id]
    );

    return successResponse(res, 200, 'Course updated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Course update failed', error.message);
  }
};

/**
 * PATCH /api/courses/:id/status
 * Change course status (ACTIVE <-> INACTIVE) (Only Super Admin & Admin).
 */
const toggleCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    const [existing] = await pool.query('SELECT status FROM courses WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'Course not found');
    }

    if (!status) {
      // Toggle automatically if no explicit status provided
      status = existing[0].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    } else {
      status = status.toUpperCase();
    }

    if (!['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
      return errorResponse(res, 400, 'Status must be ACTIVE, INACTIVE, or ARCHIVED');
    }

    await pool.query('UPDATE courses SET status = ? WHERE id = ?', [status, id]);
    return successResponse(res, 200, `Course status updated to ${status}`);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update course status', error.message);
  }
};

/**
 * DELETE /api/courses/:id
 * Delete or soft-deactivate a course (Only Super Admin & Admin).
 */
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const [batches] = await pool.query('SELECT id FROM batches WHERE course_id = ?', [id]);
    if (batches.length > 0) {
      // Soft-deactivate if active batches exist
      await pool.query('UPDATE courses SET status = "INACTIVE" WHERE id = ?', [id]);
      return successResponse(res, 200, 'Course deactivated because active batches exist');
    }

    await pool.query('DELETE FROM courses WHERE id = ?', [id]);
    return successResponse(res, 200, 'Course deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Course deletion failed', error.message);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  toggleCourseStatus,
  deleteCourse
};
