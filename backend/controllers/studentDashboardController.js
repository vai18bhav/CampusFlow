const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * GET /api/student/dashboard
 * Aggregates student profile, course, batch, attendance, assignments, finance,
 * mock interviews, recent activities, and notifications from Modules 3-9.
 */
const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    let studentId = req.user.student_id;

    // Fetch student record if student_id not in JWT token directly
    if (!studentId) {
      const [stuRows] = await pool.query('SELECT id FROM students WHERE user_id = ?', [userId]);
      if (stuRows.length === 0) {
        return errorResponse(res, 404, 'Student profile not found for logged-in user');
      }
      studentId = stuRows[0].id;
    }

    // 1. Student Profile & Account Info
    const [profileRows] = await pool.query(
      `SELECT s.id as student_id, s.roll_number as student_code, s.mock_interview_credits, s.mock_credit_expiry,
              u.id as user_id, u.full_name, u.email, u.phone,
              a.id as admission_id, a.admission_number, a.status as admission_status,
              c.id as course_id, c.name as course_name, c.code as course_code,
              b.id as batch_id, b.name as batch_name, b.batch_code, b.start_date, b.end_date, b.status as batch_status,
              t_u.full_name as trainer_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN admissions a ON a.student_id = s.id
       LEFT JOIN courses c ON a.course_id = c.id
       LEFT JOIN batches b ON a.batch_id = b.id
       LEFT JOIN trainers t ON b.trainer_id = t.id
       LEFT JOIN users t_u ON t.user_id = t_u.id
       WHERE s.id = ?
       ORDER BY a.id DESC LIMIT 1`,
      [studentId]
    );

    if (profileRows.length === 0) {
      return errorResponse(res, 404, 'Student details not found');
    }

    const studentProfile = profileRows[0];

    // 2. Attendance Summary & Widget (Module 7)
    const [attRows] = await pool.query('SELECT status FROM attendance WHERE student_id = ?', [studentId]);
    const totalDays = attRows.length;
    const presentDays = attRows.filter(a => a.status === 'PRESENT').length;
    const lateDays = attRows.filter(a => a.status === 'LATE').length;
    const absentDays = attRows.filter(a => a.status === 'ABSENT').length;
    const leaveDays = attRows.filter(a => ['LEAVE', 'EXCUSED'].includes(a.status)).length;

    const attendancePercentage = totalDays > 0 ? parseFloat((((presentDays + lateDays) / totalDays) * 100).toFixed(1)) : 0;

    const attendanceSummary = {
      percentage: attendancePercentage,
      total_days: totalDays,
      present_days: presentDays,
      late_days: lateDays,
      absent_days: absentDays,
      leave_days: leaveDays
    };

    // 3. Assignments Widget & Deadline List (Module 7)
    const batchId = studentProfile.batch_id || 1;
    const [assignmentsRows] = await pool.query(
      `SELECT a.id, a.title, a.description, a.due_date, a.total_marks,
              sub.id as submission_id, sub.submission_date, sub.marks_obtained, sub.status as submission_status
       FROM assignments a
       LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
       WHERE a.batch_id = ?
       ORDER BY a.due_date ASC`,
      [studentId, batchId]
    );

    const nowIso = new Date().toISOString();

    const assignmentsProcessed = assignmentsRows.map(a => {
      let calcStatus = 'Pending';
      if (a.submission_status === 'REVIEWED') {
        calcStatus = 'Reviewed';
      } else if (a.submission_id) {
        calcStatus = 'Submitted';
      } else if (a.due_date && new Date(a.due_date).toISOString() < nowIso) {
        calcStatus = 'Overdue';
      }

      return {
        id: a.id,
        title: a.title,
        due_date: a.due_date,
        total_marks: a.total_marks,
        marks_obtained: a.marks_obtained,
        status: calcStatus
      };
    });

    const pendingAssignmentsCount = assignmentsProcessed.filter(a => ['Pending', 'Overdue'].includes(a.status)).length;

    // 4. Finance Widget & Installments (Module 8)
    const [invoicesRows] = await pool.query(
      'SELECT id, net_amount, total_amount, paid_amount, due_amount, status, due_date, currency FROM invoices WHERE student_id = ? ORDER BY id DESC LIMIT 1',
      [studentId]
    );

    let financeSummary = {
      total_fees: 0,
      paid_fees: 0,
      pending_fees: 0,
      next_installment_amount: 0,
      next_installment_due: null,
      status: 'No Invoice',
      currency: 'INR'
    };

    if (invoicesRows.length > 0) {
      const inv = invoicesRows[0];
      const netFee = parseFloat(inv.net_amount || inv.total_amount || 0);
      const paidFee = parseFloat(inv.paid_amount || 0);
      const pendingFee = parseFloat(inv.due_amount || 0);

      const [nextInst] = await pool.query(
        'SELECT amount, due_date FROM installments WHERE invoice_id = ? AND status = "PENDING" ORDER BY due_date ASC LIMIT 1',
        [inv.id]
      );

      financeSummary = {
        invoice_id: inv.id,
        total_fees: netFee,
        paid_fees: paidFee,
        pending_fees: pendingFee,
        next_installment_amount: nextInst.length > 0 ? parseFloat(nextInst[0].amount) : pendingFee,
        next_installment_due: nextInst.length > 0 ? nextInst[0].due_date : inv.due_date,
        status: inv.status,
        currency: inv.currency || 'INR'
      };
    }

    // 5. Mock Interview & Evaluation Widget (Module 9)
    const [upcomingInterviews] = await pool.query(
      `SELECT mi.id, mi.topic, mi.scheduled_date, mi.status,
              u.full_name as trainer_name
       FROM mock_interviews mi
       JOIN trainers t ON mi.trainer_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE mi.student_id = ? AND mi.status = 'SCHEDULED'
       ORDER BY mi.scheduled_date ASC LIMIT 1`,
      [studentId]
    );

    const [completedInterviews] = await pool.query(
      `SELECT mi.id, mi.topic, mi.score, mi.status, mi.feedback, mi.key_strengths, mi.areas_for_improvement,
              u.full_name as trainer_name
       FROM mock_interviews mi
       JOIN trainers t ON mi.trainer_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE mi.student_id = ? AND mi.status = 'COMPLETED'
       ORDER BY mi.id DESC LIMIT 1`,
      [studentId]
    );

    const upcomingInterview = upcomingInterviews.length > 0 ? upcomingInterviews[0] : null;
    const latestEvaluation = completedInterviews.length > 0 ? completedInterviews[0] : null;

    // 6. Recent Activity Timeline (Aggregated from real module data)
    const recentActivities = [];

    // Add recent assignment submissions
    const [recentSubs] = await pool.query(
      `SELECT sub.submission_date, a.title 
       FROM assignment_submissions sub 
       JOIN assignments a ON sub.assignment_id = a.id 
       WHERE sub.student_id = ? ORDER BY sub.id DESC LIMIT 2`,
      [studentId]
    );
    recentSubs.forEach(s => {
      recentActivities.push({
        id: `sub-${s.submission_date}`,
        title: 'Assignment Submitted',
        description: `Submitted solution for "${s.title}"`,
        timestamp: s.submission_date,
        icon: 'bi-check-circle-fill',
        color: 'success'
      });
    });

    // Add recent payment receipts
    const [recentPays] = await pool.query(
      `SELECT payment_date, amount, payment_method FROM payments WHERE student_id = ? ORDER BY id DESC LIMIT 2`,
      [studentId]
    );
    recentPays.forEach(p => {
      recentActivities.push({
        id: `pay-${p.payment_date}`,
        title: 'Tuition Payment Recorded',
        description: `Payment of $${parseFloat(p.amount).toLocaleString()} received via ${p.payment_method}`,
        timestamp: p.payment_date,
        icon: 'bi-receipt',
        color: 'primary'
      });
    });

    // Add recent attendance entries
    const [recentAtt] = await pool.query(
      `SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 2`,
      [studentId]
    );
    recentAtt.forEach(a => {
      recentActivities.push({
        id: `att-${a.date}`,
        title: 'Attendance Marked',
        description: `Marked ${a.status} for class on ${a.date}`,
        timestamp: a.date,
        icon: 'bi-calendar-check',
        color: a.status === 'PRESENT' ? 'success' : 'warning'
      });
    });

    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 7. Unread Notifications & Recent Notifications
    const [unreadRow] = await pool.query('SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    const [recentNotifs] = await pool.query(
      'SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 5',
      [userId]
    );

    return successResponse(res, 200, 'Student dashboard metrics loaded', {
      student: studentProfile,
      attendance: attendanceSummary,
      assignments: {
        pending_count: pendingAssignmentsCount,
        list: assignmentsProcessed
      },
      finance: financeSummary,
      interviews: {
        upcoming_count: upcomingInterview ? 1 : 0,
        upcoming: upcomingInterview,
        latest_evaluation: latestEvaluation
      },
      notifications: {
        unread_count: unreadRow[0].unread_count || 0,
        recent: recentNotifs
      },
      recentActivities: recentActivities.slice(0, 5)
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch student dashboard data', error.message);
  }
};

module.exports = {
  getStudentDashboard
};
