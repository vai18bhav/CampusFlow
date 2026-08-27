const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendMockInterviewEmail } = require('../utils/emailService');

/**
 * GET /api/mock-interviews
 * Retrieves mock interviews list. Filters appropriately based on user role.
 */
const getMockInterviews = async (req, res) => {
  try {
    const roleName = (req.user?.role_name || req.user?.role || '').toUpperCase();
    const userId = req.user.id;

    let query = `
      SELECT mi.*, 
             u_stu.full_name as student_name, s.roll_number,
             u_trn.full_name as trainer_name, b.name as batch_name,
             u_del.full_name as delegated_name
      FROM mock_interviews mi
      JOIN students s ON mi.student_id = s.id
      JOIN users u_stu ON s.user_id = u_stu.id
      LEFT JOIN trainers t ON mi.trainer_id = t.id
      LEFT JOIN users u_trn ON t.user_id = u_trn.id
      LEFT JOIN batches b ON mi.batch_id = b.id
      LEFT JOIN users u_del ON mi.delegated_to_user_id = u_del.id
      WHERE 1=1
    `;
    const params = [];

    if (roleName === 'STUDENT') {
      query += ' AND mi.student_id = ?';
      params.push(req.user.student_id || 0);
    } else if (roleName === 'TRAINER') {
      // Trainers see mocks assigned to them, or mocks originally assigned to them
      query += ' AND (mi.trainer_id = ? OR mi.original_trainer_id = ?)';
      params.push(req.user.trainer_id || 0, req.user.id);
    } else if (roleName === 'SUPPORT_EXECUTIVE') {
      // Support Executives see delegated mocks
      query += ' AND (mi.delegated_to_user_id = ? OR (mi.delegated_to_role_id = 5 AND mi.delegation_status = "PENDING"))';
      params.push(userId);
    }

    query += ' ORDER BY mi.scheduled_date DESC';

    const [interviews] = await pool.query(query, params);
    return successResponse(res, 200, 'Mock interviews fetched successfully', { interviews });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch mock interviews', error.message);
  }
};

/**
 * GET /api/mock-interviews/credits
 * Get student's mock interview credits balance.
 */
const getMockCredits = async (req, res) => {
  try {
    const roleName = (req.user?.role_name || req.user?.role || '').toUpperCase();
    if (roleName !== 'STUDENT') {
      return errorResponse(res, 403, 'Only students can check mock credit balances.');
    }

    const [rows] = await pool.query(
      'SELECT mock_credits_total, mock_credits_used, mock_credits_expiry FROM students WHERE user_id = ?',
      [req.user.id]
    );

    if (!rows.length) return errorResponse(res, 404, 'Student profile not found.');

    const student = rows[0];
    const total = student.mock_credits_total || 0;
    const used = student.mock_credits_used || 0;
    const remaining = Math.max(0, total - used);

    return successResponse(res, 200, 'Mock credits balance retrieved', {
      total,
      used,
      remaining,
      expiry: student.mock_credits_expiry
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get mock credits', error.message);
  }
};

/**
 * POST /api/mock-interviews/assign-credits
 * Admin / Sales Executive assigns credits to a student.
 */
const assignMockCredits = async (req, res) => {
  try {
    const { student_id, credits, expiry_date } = req.body;

    if (!student_id || credits === undefined) {
      return errorResponse(res, 400, 'Student ID and credits amount are required.');
    }

    const additionalCredits = parseInt(credits);
    const date = expiry_date || null;

    const [students] = await pool.query('SELECT mock_credits_total FROM students WHERE id = ?', [student_id]);
    if (!students.length) return errorResponse(res, 404, 'Student not found.');

    const newTotal = (students[0].mock_credits_total || 0) + additionalCredits;

    await pool.query(
      'UPDATE students SET mock_credits_total = ?, mock_credits_expiry = ? WHERE id = ?',
      [newTotal, date, student_id]
    );

    return successResponse(res, 200, `Successfully assigned ${additionalCredits} mock credits to student.`, {
      student_id,
      total_credits: newTotal,
      expiry_date: date
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to assign mock credits', error.message);
  }
};

/**
 * POST /api/mock-interviews/request
 * Student requests/schedules a mock interview session using 1 credit.
 */
const requestMockInterview = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { trainer_id, batch_id, scheduled_date, topic, preferred_slot, remarks } = req.body;

    if (!scheduled_date || !topic) {
      return errorResponse(conn, 400, 'Scheduled date and topic are required.');
    }

    // 1. Get student ID & check credit balance
    const [students] = await conn.query(
      'SELECT id, mock_credits_total, mock_credits_used, mock_credits_expiry FROM students WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    if (!students.length) return errorResponse(res, 403, 'Only students can request mock interviews.');
    const student = students[0];

    const remaining = (student.mock_credits_total || 0) - (student.mock_credits_used || 0);
    if (remaining <= 0) {
      return errorResponse(res, 400, 'No mock interview credits remaining. Contact Sales/Admin to purchase.');
    }

    // Check credit expiry
    if (student.mock_credits_expiry) {
      const expiry = new Date(student.mock_credits_expiry);
      expiry.setHours(23, 59, 59, 999);
      if (new Date() > expiry) {
        return errorResponse(res, 400, 'Your mock interview credits have expired.');
      }
    }

    // 2. Consume 1 credit
    await conn.query(
      'UPDATE students SET mock_credits_used = mock_credits_used + 1 WHERE id = ?',
      [student.id]
    );

    // Default trainer selection: first active trainer if not chosen
    let assignedTrainer = trainer_id;
    if (!assignedTrainer) {
      const [trainers] = await conn.query('SELECT id FROM trainers LIMIT 1');
      assignedTrainer = trainers.length ? trainers[0].id : 1;
    }

    // 3. Create PENDING mock request
    const [result] = await conn.query(
      'INSERT INTO mock_interviews (student_id, trainer_id, batch_id, scheduled_date, topic, status, preferred_slot, remarks) VALUES (?, ?, ?, ?, ?, "PENDING", ?, ?)',
      [student.id, assignedTrainer, batch_id || null, scheduled_date, topic, preferred_slot || null, remarks || null]
    );

    await conn.commit();

    return successResponse(res, 201, 'Mock interview request submitted successfully! Awaiting Trainer confirmation.', {
      interviewId: result.insertId
    });
  } catch (error) {
    await conn.rollback();
    return errorResponse(res, 500, 'Failed to submit mock request', error.message);
  } finally {
    conn.release();
  }
};

/**
 * PATCH /api/mock-interviews/:id/review
 * Trainer accepts or rejects the student's mock request.
 */
const reviewMockRequest = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'ACCEPT' or 'REJECT'

    const [rows] = await conn.query(
      'SELECT mi.*, s.user_id as student_user_id, u.email as student_email, u.full_name as student_name FROM mock_interviews mi JOIN students s ON mi.student_id = s.id JOIN users u ON s.user_id = u.id WHERE mi.id = ? FOR UPDATE',
      [id]
    );
    if (!rows.length) return errorResponse(res, 404, 'Mock interview request not found.');

    const mock = rows[0];
    if (mock.status !== 'PENDING') {
      return errorResponse(res, 400, 'This mock interview is no longer pending review.');
    }

    if (action === 'ACCEPT') {
      await conn.query('UPDATE mock_interviews SET status = "SCHEDULED" WHERE id = ?', [id]);

      // Notify Student
      await conn.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INTERVIEW')",
        [mock.student_user_id, `Mock Interview Scheduled: ${mock.topic}`, `Your request for ${mock.scheduled_date} has been accepted!`, 'INTERVIEW']
      );

      sendMockInterviewEmail({
        toEmail: mock.student_email,
        studentName: mock.student_name,
        topic: mock.topic,
        scheduledDate: mock.scheduled_date,
        trainerName: req.user.full_name
      }).catch(err => console.error('Email error:', err.message));

      await conn.commit();
      return successResponse(res, 200, 'Mock interview accepted and scheduled.');
    } else {
      // REJECT: refund 1 credit to student
      await conn.query('UPDATE mock_interviews SET status = "CANCELLED", remarks = ? WHERE id = ?', [reason || 'Request rejected by Trainer', id]);
      await conn.query('UPDATE students SET mock_credits_used = GREATEST(0, mock_credits_used - 1) WHERE id = ?', [mock.student_id]);

      // Notify Student
      await conn.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INTERVIEW')",
        [mock.student_user_id, `Mock Interview Rejected: ${mock.topic}`, `Your request for ${mock.scheduled_date} was declined. Reason: ${reason || 'None provided'}`, 'INTERVIEW']
      );

      await conn.commit();
      return successResponse(res, 200, 'Mock interview request declined. Credit refunded to student.');
    }
  } catch (error) {
    await conn.rollback();
    return errorResponse(res, 500, 'Failed to review mock request', error.message);
  } finally {
    conn.release();
  }
};

/**
 * POST /api/mock-interviews/:id/delegate
 * Trainer delegates an accepted mock interview to another Trainer or a Support Executive.
 */
const delegateMockInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { delegated_to_role_id, delegated_to_user_id } = req.body;

    if (!delegated_to_role_id && !delegated_to_user_id) {
      return errorResponse(res, 400, 'Delegated role ID or specific User ID is required.');
    }

    const [rows] = await pool.query('SELECT trainer_id, status FROM mock_interviews WHERE id = ?', [id]);
    if (!rows.length) return errorResponse(res, 404, 'Mock interview session not found.');

    const mock = rows[0];
    if (mock.status !== 'SCHEDULED' && mock.status !== 'PENDING') {
      return errorResponse(res, 400, 'Only pending or scheduled mocks can be delegated.');
    }

    // Set delegation status and target
    await pool.query(
      `UPDATE mock_interviews 
       SET delegated_to_role_id = ?, 
           delegated_to_user_id = ?, 
           delegation_status = 'PENDING',
           original_trainer_id = ?
       WHERE id = ?`,
      [delegated_to_role_id || null, delegated_to_user_id || null, mock.trainer_id, id]
    );

    // If a specific Support Executive user is targeted, notify them directly
    if (delegated_to_user_id) {
      await pool.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INTERVIEW')",
        [delegated_to_user_id, 'Delegated Mock Interview', 'A trainer has delegated a mock interview session to you.', 'INTERVIEW']
      );
    }

    return successResponse(res, 200, 'Mock interview delegation requested.');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delegate mock interview', error.message);
  }
};

/**
 * PATCH /api/mock-interviews/:id/delegated-review
 * Support Executive / Trainer accepts or rejects a delegated mock.
 */
const reviewDelegation = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'ACCEPT' or 'REJECT'
    const userId = req.user.id;
    const userRole = (req.user.role_name || req.user.role || '').toUpperCase();

    const [rows] = await conn.query(
      `SELECT mi.*, s.user_id as student_user_id, u_stu.full_name as student_name,
              t.user_id as original_trainer_user_id
       FROM mock_interviews mi
       JOIN students s ON mi.student_id = s.id
       JOIN users u_stu ON s.user_id = u_stu.id
       LEFT JOIN trainers t ON (mi.original_trainer_id = t.id OR mi.trainer_id = t.id)
       WHERE mi.id = ? FOR UPDATE`,
      [id]
    );
    if (!rows.length) {
      await conn.rollback();
      return errorResponse(res, 404, 'Mock interview not found.');
    }
    const mock = rows[0];

    // RBAC check: Support Executive can only access mock delegated to them
    if (userRole === 'SUPPORT_EXECUTIVE') {
      if (mock.delegated_to_user_id && parseInt(mock.delegated_to_user_id, 10) !== parseInt(userId, 10)) {
        await conn.rollback();
        return errorResponse(res, 403, 'You are forbidden from accessing mock interviews delegated to another Support Executive.');
      }
    }

    if (mock.delegation_status !== 'PENDING') {
      await conn.rollback();
      return errorResponse(res, 400, 'This delegation request is no longer active.');
    }

    if (action === 'ACCEPT') {
      // Find Trainer ID if user is a Trainer
      let newTrainerId = mock.trainer_id;
      if (userRole === 'TRAINER') {
        const [trn] = await conn.query('SELECT id FROM trainers WHERE user_id = ?', [userId]);
        if (trn.length) newTrainerId = trn[0].id;
      }

      await conn.query(
        `UPDATE mock_interviews 
         SET trainer_id = ?,
             delegated_to_user_id = ?,
             delegation_status = 'ACCEPTED',
             status = 'SCHEDULED'
         WHERE id = ?`,
        [newTrainerId, userId, id]
      );

      // Notify Student
      await conn.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INTERVIEW')",
        [mock.student_user_id, `Mock Interview Scheduled: ${mock.topic}`, `Your mock interview request for ${mock.scheduled_date} has been accepted!`, 'INTERVIEW']
      );

      // Notify Original Trainer
      if (mock.original_trainer_user_id && mock.original_trainer_user_id !== userId) {
        await conn.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INTERVIEW')",
          [mock.original_trainer_user_id, 'Delegated Mock Accepted', `Support Executive ${req.user.full_name} accepted your delegated mock interview for student ${mock.student_name}.`, 'INTERVIEW']
        );
      }

      await conn.commit();
      return successResponse(res, 200, 'Delegated mock interview accepted.');
    } else {
      // REJECT: return delegation to pending state with the original trainer
      await conn.query(
        `UPDATE mock_interviews 
         SET status = 'PENDING',
             delegation_status = 'REJECTED',
             delegated_to_user_id = NULL,
             remarks = ?
         WHERE id = ?`,
        [reason || 'Delegated mock rejected by Support Executive', id]
      );

      // Notify Student
      await conn.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INTERVIEW')",
        [mock.student_user_id, 'Mock Request Returned to Pending', 'Your mock interview request has returned to pending review state.', 'INTERVIEW']
      );

      // Notify Original Trainer
      if (mock.original_trainer_user_id && mock.original_trainer_user_id !== userId) {
        await conn.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INTERVIEW')",
          [mock.original_trainer_user_id, 'Delegated Mock Rejected', `Delegated mock interview for ${mock.student_name} was declined. Reason: ${reason || 'None provided'}`, 'INTERVIEW']
        );
      }

      await conn.commit();
      return successResponse(res, 200, 'Delegated mock interview declined. Returned to pending state.');
    }
  } catch (error) {
    await conn.rollback();
    return errorResponse(res, 500, 'Failed to review delegation', error.message);
  } finally {
    conn.release();
  }
};

/**
 * PATCH /api/mock-interviews/:id/evaluate
 * Submit score and detailed feedback (Strengths, areas for improvement, status COMPLETED or NO_SHOW).
 */
const evaluateMockInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, feedback, key_strengths, areas_for_improvement, status } = req.body;

    const mockStatus = status || 'COMPLETED';

    await pool.query(
      `UPDATE mock_interviews 
       SET score = COALESCE(?, score), 
           feedback = COALESCE(?, feedback), 
           key_strengths = COALESCE(?, key_strengths), 
           areas_for_improvement = COALESCE(?, areas_for_improvement), 
           status = ? 
       WHERE id = ?`,
      [score !== undefined ? score : null, feedback || null, key_strengths || null, areas_for_improvement || null, mockStatus, id]
    );

    // Notify Student
    const [mock] = await pool.query('SELECT student_id, topic FROM mock_interviews WHERE id = ?', [id]);
    if (mock.length) {
      const [stu] = await pool.query('SELECT user_id FROM students WHERE id = ?', [mock[0].student_id]);
      if (stu.length) {
        await pool.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'INTERVIEW')",
          [stu[0].user_id, `Mock Feedback Available: ${mock[0].topic}`, `Feedback for your mock has been entered. Status: ${mockStatus}.`, 'INTERVIEW']
        );
      }
    }

    return successResponse(res, 200, 'Mock interview evaluation successfully updated.');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to evaluate mock interview', error.message);
  }
};

module.exports = {
  getMockInterviews,
  getMockCredits,
  assignMockCredits,
  requestMockInterview,
  reviewMockRequest,
  delegateMockInterview,
  reviewDelegation,
  evaluateMockInterview
};
