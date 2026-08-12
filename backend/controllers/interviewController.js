const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendMockInterviewEmail } = require('../utils/emailService');

const getMockInterviews = async (req, res) => {
  try {
    let query = `
      SELECT mi.*, u_stu.full_name as student_name, s.roll_number,
             u_trn.full_name as trainer_name, b.name as batch_name
      FROM mock_interviews mi
      JOIN students s ON mi.student_id = s.id
      JOIN users u_stu ON s.user_id = u_stu.id
      JOIN trainers t ON mi.trainer_id = t.id
      JOIN users u_trn ON t.user_id = u_trn.id
      LEFT JOIN batches b ON mi.batch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role_name === 'STUDENT') {
      query += ' AND mi.student_id = ?';
      params.push(req.user.student_id || 0);
    } else if (req.user.role_name === 'TRAINER') {
      query += ' AND mi.trainer_id = ?';
      params.push(req.user.trainer_id || 0);
    }

    query += ' ORDER BY mi.scheduled_date DESC';

    const [interviews] = await pool.query(query, params);
    return successResponse(res, 200, 'Mock interviews fetched', { interviews });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch mock interviews', error.message);
  }
};

const scheduleMockInterview = async (req, res) => {
  try {
    const { student_id, trainer_id, batch_id, scheduled_date, topic } = req.body;

    if (!student_id || !scheduled_date || !topic) {
      return errorResponse(res, 400, 'Student ID, Scheduled Date, and Topic are required');
    }

    const assignedTrainer = trainer_id || req.user.trainer_id || 1;

    const [result] = await pool.query(
      'INSERT INTO mock_interviews (student_id, trainer_id, batch_id, scheduled_date, topic, status) VALUES (?, ?, ?, ?, ?, "SCHEDULED")',
      [student_id, assignedTrainer, batch_id || null, scheduled_date, topic]
    );

    // Notify student via in-app notification & Gmail
    const [stu] = await pool.query('SELECT s.user_id, u.full_name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?', [student_id]);
    if (stu.length > 0) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [stu[0].user_id, `Mock Interview Scheduled: ${topic}`, `Your mock interview is scheduled for ${scheduled_date}. Topic: ${topic}`, 'INTERVIEW']
      );

      sendMockInterviewEmail({
        toEmail: stu[0].email,
        studentName: stu[0].full_name,
        topic: topic,
        scheduledDate: scheduled_date,
        trainerName: 'Faculty Trainer'
      }).catch(err => console.error('Mock interview email error:', err.message));
    }

    return successResponse(res, 201, 'Mock interview scheduled successfully', { interviewId: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to schedule mock interview', error.message);
  }
};

const evaluateMockInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, feedback, key_strengths, areas_for_improvement, status } = req.body;

    await pool.query(
      'UPDATE mock_interviews SET score = COALESCE(?, score), feedback = COALESCE(?, feedback), key_strengths = COALESCE(?, key_strengths), areas_for_improvement = COALESCE(?, areas_for_improvement), status = COALESCE(?, "COMPLETED") WHERE id = ?',
      [score, feedback, key_strengths, areas_for_improvement, status, id]
    );

    return successResponse(res, 200, 'Mock interview evaluated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to evaluate mock interview', error.message);
  }
};

module.exports = {
  getMockInterviews,
  scheduleMockInterview,
  evaluateMockInterview
};
