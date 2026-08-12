const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendAssignmentEmail } = require('../utils/emailService');

/**
 * GET /api/assignments
 * Retrieves assignment list filtered by batch, status, or user role.
 */
const getAssignments = async (req, res) => {
  try {
    const { batch_id, status, search } = req.query;

    let query = `
      SELECT a.*, 
             c.name as course_name, c.code as course_code,
             b.name as batch_name, b.batch_code, 
             u.full_name as trainer_name,
             (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = a.id) as submission_count
      FROM assignments a
      JOIN batches b ON a.batch_id = b.id
      LEFT JOIN courses c ON (a.course_id = c.id OR b.course_id = c.id)
      JOIN trainers t ON a.trainer_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    const userRole = req.user?.role_name?.toUpperCase();

    if (userRole === 'TRAINER') {
      query += ' AND a.trainer_id = ?';
      params.push(req.user.trainer_id || 0);
    } else if (userRole === 'STUDENT') {
      query += ' AND a.batch_id IN (SELECT batch_id FROM batch_students WHERE student_id = ?)';
      params.push(req.user.student_id || 0);
    } else if (batch_id) {
      query += ' AND a.batch_id = ?';
      params.push(batch_id);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status.toUpperCase());
    }

    if (search) {
      query += ' AND (a.title LIKE ? OR a.description LIKE ? OR b.batch_code LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY a.id DESC';

    const [assignments] = await pool.query(query, params);

    // If Student, attach personal submission state
    if (userRole === 'STUDENT' && req.user.student_id) {
      for (let assignment of assignments) {
        const [sub] = await pool.query(
          `SELECT id, submission_date, submission_text, submission_url, file_url, marks_obtained, feedback, status 
           FROM assignment_submissions 
           WHERE assignment_id = ? AND student_id = ?`,
          [assignment.id, req.user.student_id]
        );
        assignment.my_submission = sub.length > 0 ? sub[0] : null;
      }
    }

    return successResponse(res, 200, 'Assignments fetched successfully', { assignments });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch assignments', error.message);
  }
};

/**
 * GET /api/assignments/:id
 * Retrieves details for a specific assignment.
 */
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [assignments] = await pool.query(
      `SELECT a.*, 
              c.name as course_name, c.code as course_code,
              b.name as batch_name, b.batch_code,
              u.full_name as trainer_name
       FROM assignments a
       JOIN batches b ON a.batch_id = b.id
       LEFT JOIN courses c ON (a.course_id = c.id OR b.course_id = c.id)
       JOIN trainers t ON a.trainer_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (assignments.length === 0) {
      return errorResponse(res, 404, 'Assignment not found');
    }

    const assignment = assignments[0];

    if (req.user.role_name === 'STUDENT' && req.user.student_id) {
      const [sub] = await pool.query(
        'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
        [id, req.user.student_id]
      );
      assignment.my_submission = sub.length > 0 ? sub[0] : null;
    }

    return successResponse(res, 200, 'Assignment details retrieved', { assignment });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch assignment details', error.message);
  }
};

/**
 * POST /api/assignments
 * Creates a new assignment (Trainers, Admins).
 */
const createAssignment = async (req, res) => {
  try {
    const { batch_id, title, description, instructions, due_date, deadline, total_marks, max_marks, status, file_url } = req.body;

    const targetDueDate = due_date || deadline;
    const marksTotal = parseInt(total_marks || max_marks || 100, 10);
    const assignStatus = (status || 'PUBLISHED').toUpperCase();

    if (!batch_id || !title || !targetDueDate) {
      return errorResponse(res, 400, 'Batch, Title, and Due Date are required');
    }

    const trainerId = req.user.trainer_id || 1;

    // Fetch batch to get course_id
    const [batches] = await pool.query('SELECT course_id FROM batches WHERE id = ?', [batch_id]);
    const courseId = batches.length > 0 ? batches[0].course_id : null;

    const [result] = await pool.query(
      `INSERT INTO assignments 
       (course_id, batch_id, trainer_id, title, description, instructions, due_date, deadline, total_marks, max_marks, status, file_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        batch_id,
        trainerId,
        title.trim(),
        description || null,
        instructions || null,
        targetDueDate,
        targetDueDate,
        marksTotal,
        marksTotal,
        assignStatus,
        file_url || null
      ]
    );

    // Send notifications & email alerts to students enrolled in batch
    const [students] = await pool.query('SELECT student_id FROM batch_students WHERE batch_id = ? AND status = "ENROLLED"', [batch_id]);
    for (let s of students) {
      const [u] = await pool.query('SELECT u.user_id, u2.full_name, u2.email FROM students u JOIN users u2 ON u.user_id = u2.id WHERE u.id = ?', [s.student_id]);
      if (u.length > 0) {
        await pool.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [u[0].user_id, `New Assignment: ${title}`, `New assignment "${title}" published. Due Date: ${targetDueDate}`, 'ASSIGNMENT']
        );

        sendAssignmentEmail({
          toEmail: u[0].email,
          studentName: u[0].full_name,
          assignmentTitle: title,
          batchName: `Batch #${batch_id}`,
          dueDate: targetDueDate,
          instructions: instructions || description
        }).catch(err => console.error('Assignment email error:', err.message));
      }
    }

    return successResponse(res, 201, 'Assignment created successfully', { assignmentId: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Assignment creation failed', error.message);
  }
};

/**
 * POST /api/assignments/:id/submit
 * Submits an assignment text/URL (Students).
 */
const submitAssignment = async (req, res) => {
  try {
    const assignmentId = req.params.id || req.body.assignment_id;
    const { submission_text, submission_url, file_url } = req.body;
    const studentId = req.user.student_id;

    if (!studentId) {
      return errorResponse(res, 403, 'Only enrolled students can submit assignments');
    }

    if (!assignmentId || (!submission_text && !submission_url && !file_url)) {
      return errorResponse(res, 400, 'Assignment ID and submission content or link are required');
    }

    // Verify assignment exists & check due date
    const [assignments] = await pool.query('SELECT due_date, deadline FROM assignments WHERE id = ?', [assignmentId]);
    if (assignments.length === 0) {
      return errorResponse(res, 404, 'Assignment not found');
    }

    const dueDate = new Date(assignments[0].due_date || assignments[0].deadline);
    const isLate = new Date() > dueDate;
    const submissionStatus = isLate ? 'LATE' : 'SUBMITTED';

    await pool.query(
      `INSERT INTO assignment_submissions 
       (assignment_id, student_id, submission_text, submission_url, file_url, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       submission_text = VALUES(submission_text), 
       submission_url = VALUES(submission_url), 
       file_url = VALUES(file_url), 
       status = VALUES(status), 
       submission_date = CURRENT_TIMESTAMP`,
      [assignmentId, studentId, submission_text || null, submission_url || file_url || null, file_url || null, submissionStatus]
    );

    return successResponse(res, 200, `Assignment ${isLate ? 'submitted late' : 'submitted successfully'}`);
  } catch (error) {
    return errorResponse(res, 500, 'Assignment submission failed', error.message);
  }
};

/**
 * GET /api/assignments/:id/submissions
 * Retrieves student submissions roster for a specific assignment (Trainers, Admins).
 */
const getSubmissionsForAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const [submissions] = await pool.query(
      `SELECT sub.*, 
              s.roll_number, u.full_name as student_name, u.email as student_email,
              ev_u.full_name as reviewed_by_name
       FROM assignment_submissions sub
       JOIN students s ON sub.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN users ev_u ON sub.evaluated_by = ev_u.id
       WHERE sub.assignment_id = ?
       ORDER BY sub.submission_date DESC`,
      [id]
    );

    return successResponse(res, 200, 'Submissions retrieved successfully', { submissions });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch assignment submissions', error.message);
  }
};

/**
 * PUT /api/submissions/:id
 * PATCH /api/submissions/:id/review
 * Reviews and evaluates a student submission (Marks & Feedback).
 */
const evaluateSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id || req.params.submission_id;
    const { marks_obtained, feedback, status } = req.body;

    if (marks_obtained === undefined || isNaN(marks_obtained)) {
      return errorResponse(res, 400, 'Valid marks obtained are required');
    }

    // Verify submission & total marks limit
    const [sub] = await pool.query(
      `SELECT sub.id, a.total_marks, a.max_marks 
       FROM assignment_submissions sub 
       JOIN assignments a ON sub.assignment_id = a.id 
       WHERE sub.id = ?`,
      [submissionId]
    );

    if (sub.length === 0) {
      return errorResponse(res, 404, 'Submission not found');
    }

    const maxMarks = sub[0].total_marks || sub[0].max_marks || 100;
    const marksNum = parseInt(marks_obtained, 10);

    if (marksNum < 0 || marksNum > maxMarks) {
      return errorResponse(res, 400, `Marks obtained (${marksNum}) cannot exceed total marks (${maxMarks}).`);
    }

    const nextStatus = status ? status.toUpperCase() : 'REVIEWED';

    await pool.query(
      `UPDATE assignment_submissions 
       SET marks_obtained = ?, feedback = ?, status = ?, evaluated_by = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [marksNum, feedback || null, nextStatus, req.user.id, req.user.id, submissionId]
    );

    return successResponse(res, 200, 'Submission evaluated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Submission evaluation failed', error.message);
  }
};

module.exports = {
  getAssignments,
  getAssignmentById,
  createAssignment,
  submitAssignment,
  getSubmissionsForAssignment,
  evaluateSubmission
};
