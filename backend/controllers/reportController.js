const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Helper to construct SQL DATE WHERE conditions based on query params (from, to, quick_date)
 */
const buildDateFilter = (dateColumn, from, to, quick_date) => {
  let condition = '';
  const params = [];

  const today = new Date().toISOString().split('T')[0];

  if (quick_date === 'today') {
    condition += ` AND DATE(${dateColumn}) = ?`;
    params.push(today);
  } else if (quick_date === 'this_month') {
    condition += ` AND DATE_FORMAT(${dateColumn}, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')`;
  } else if (quick_date === 'last_month') {
    condition += ` AND ${dateColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)`;
  } else if (quick_date === 'this_year') {
    condition += ` AND YEAR(${dateColumn}) = YEAR(CURRENT_DATE())`;
  } else {
    if (from) {
      condition += ` AND ${dateColumn} >= ?`;
      params.push(from);
    }
    if (to) {
      condition += ` AND ${dateColumn} <= ?`;
      params.push(to);
    }
  }

  return { condition, params };
};

/**
 * GET /api/reports/dashboard-stats
 * Legacy dashboard stats endpoint (Preserved for backwards compatibility)
 */
const getDashboardStats = async (req, res) => {
  try {
    const roleName = req.user.role_name;

    if (roleName === 'STUDENT') {
      const studentId = req.user.student_id;

      const [batches] = await pool.query(
        `SELECT b.name as batch_name, b.batch_code, c.name as course_name, c.code as course_code
         FROM batch_students bs
         JOIN batches b ON bs.batch_id = b.id
         JOIN courses c ON b.course_id = c.id
         WHERE bs.student_id = ? AND bs.status = 'ENROLLED' LIMIT 1`,
        [studentId]
      );

      const [att] = await pool.query('SELECT status FROM attendance WHERE student_id = ?', [studentId]);
      const totalAtt = att.length;
      const presentAtt = att.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const attPercentage = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : 100.0;

      const [pendingAss] = await pool.query(
        `SELECT COUNT(*) as count FROM assignments a
         JOIN batch_students bs ON a.batch_id = bs.batch_id
         WHERE bs.student_id = ? AND a.id NOT IN (
           SELECT assignment_id FROM assignment_submissions WHERE student_id = ?
         )`,
        [studentId, studentId]
      );

      const [upcomingInterviews] = await pool.query(
        'SELECT COUNT(*) as count FROM mock_interviews WHERE student_id = ? AND status = "SCHEDULED"',
        [studentId]
      );

      const [feeSummary] = await pool.query(
        'SELECT SUM(net_amount) as total, SUM(paid_amount) as paid, SUM(due_amount) as due FROM invoices WHERE student_id = ?',
        [studentId]
      );

      return successResponse(res, 200, 'Student Dashboard Metrics', {
        enrolled_batch: batches.length > 0 ? batches[0] : null,
        attendance_percentage: parseFloat(attPercentage),
        pending_assignments: pendingAss[0].count,
        upcoming_interviews: upcomingInterviews[0].count,
        fee_summary: {
          total: parseFloat(feeSummary[0]?.total || 0),
          paid: parseFloat(feeSummary[0]?.paid || 0),
          due: parseFloat(feeSummary[0]?.due || 0)
        }
      });
    }

    if (roleName === 'TRAINER') {
      const trainerId = req.user.trainer_id || 0;
      const [assignedBatches] = await pool.query('SELECT COUNT(*) as count FROM batches WHERE trainer_id = ? AND status IN ("UPCOMING", "ONGOING")', [trainerId]);
      const [totalStudents] = await pool.query(
        'SELECT COUNT(DISTINCT student_id) as count FROM batch_students bs JOIN batches b ON bs.batch_id = b.id WHERE b.trainer_id = ? AND bs.status = "ENROLLED"',
        [trainerId]
      );
      const [pendingMocks] = await pool.query('SELECT COUNT(*) as count FROM mock_interviews WHERE trainer_id = ? AND status = "PENDING"', [trainerId]);
      const [todaysClasses] = await pool.query('SELECT COUNT(*) as count FROM batches WHERE trainer_id = ? AND status = "ONGOING"', [trainerId]);
      const [upcomingMocks] = await pool.query('SELECT COUNT(*) as count FROM mock_interviews WHERE trainer_id = ? AND status = "SCHEDULED"', [trainerId]);
      const [pendingAssignments] = await pool.query('SELECT COUNT(*) as count FROM assignments WHERE trainer_id = ? AND status = "PUBLISHED"', [trainerId]);
      const [delegatedMocks] = await pool.query('SELECT COUNT(*) as count FROM mock_interviews WHERE (trainer_id = ? OR original_trainer_id = ?) AND delegation_status = "ACCEPTED"', [trainerId, req.user.id]);

      return successResponse(res, 200, 'Trainer Dashboard Metrics', {
        assigned_batches: assignedBatches[0].count,
        total_students: totalStudents[0].count,
        pending_mock_requests: pendingMocks[0].count,
        todays_classes: todaysClasses[0].count,
        upcoming_mock_interviews: upcomingMocks[0].count,
        pending_assignment_tracking: pendingAssignments[0].count,
        delegated_mocks: delegatedMocks[0].count
      });
    }

    if (roleName === 'SUPPORT_EXECUTIVE') {
      const userId = req.user.id;
      const [newDelegated] = await pool.query(
        'SELECT COUNT(*) as count FROM mock_interviews WHERE (delegated_to_user_id = ? OR (delegated_to_role_id = 5 AND delegated_to_user_id IS NULL)) AND delegation_status = "PENDING"',
        [userId]
      );
      const [pendingAccept] = await pool.query(
        'SELECT COUNT(*) as count FROM mock_interviews WHERE (delegated_to_user_id = ? OR (delegated_to_role_id = 5 AND delegated_to_user_id IS NULL)) AND delegation_status = "PENDING"',
        [userId]
      );
      const [todaysMocks] = await pool.query(
        'SELECT COUNT(*) as count FROM mock_interviews WHERE (delegated_to_user_id = ? OR trainer_id = ?) AND DATE(scheduled_date) = CURRENT_DATE() AND status = "SCHEDULED"',
        [userId, userId]
      );
      const [upcomingMocks] = await pool.query(
        'SELECT COUNT(*) as count FROM mock_interviews WHERE (delegated_to_user_id = ? OR trainer_id = ?) AND status = "SCHEDULED"',
        [userId, userId]
      );
      const [completedMocks] = await pool.query(
        'SELECT COUNT(*) as count FROM mock_interviews WHERE (delegated_to_user_id = ? OR trainer_id = ?) AND status = "COMPLETED"',
        [userId, userId]
      );

      return successResponse(res, 200, 'Support Executive Dashboard Metrics', {
        new_delegated_mocks: newDelegated[0].count,
        pending_acceptance: pendingAccept[0].count,
        todays_mocks: todaysMocks[0].count,
        upcoming_mocks: upcomingMocks[0].count,
        completed_mocks: completedMocks[0].count
      });
    }

    if (roleName === 'SALES_EXECUTIVE') {
      const salesExecId = req.user.sales_exec_id || null;
      const [totalLinks] = salesExecId
        ? await pool.query('SELECT COUNT(*) as count FROM admission_links WHERE sales_exec_id = ?', [salesExecId])
        : await pool.query('SELECT COUNT(*) as count FROM admission_links');
      const [submitted] = await pool.query('SELECT COUNT(*) as count FROM admissions WHERE status = "SUBMITTED"');
      const [approved] = await pool.query('SELECT COUNT(*) as count FROM admissions WHERE status = "APPROVED"');
      const [rejected] = await pool.query('SELECT COUNT(*) as count FROM admissions WHERE status = "REJECTED"');
      const [totalStudents] = await pool.query('SELECT COUNT(*) as count FROM students');
      const [pendingInstalments] = await pool.query('SELECT COUNT(*) as count FROM installments WHERE status = "PENDING"');
      const [overdueInstalments] = await pool.query('SELECT COUNT(*) as count FROM installments WHERE status = "OVERDUE" OR (status = "PENDING" AND due_date < CURRENT_DATE())');
      const [mockCredits] = await pool.query('SELECT COALESCE(SUM(mock_interview_credits), 0) as total FROM students');

      return successResponse(res, 200, 'Sales Executive Dashboard Metrics', {
        total_admission_links: totalLinks[0].count,
        submitted_admissions: submitted[0].count,
        approved_admissions: approved[0].count,
        rejected_admissions: rejected[0].count,
        total_students: totalStudents[0].count,
        pending_instalments: pendingInstalments[0].count,
        overdue_instalments: overdueInstalments[0].count,
        mock_credits_assigned: parseInt(mockCredits[0].total || 0, 10)
      });
    }

    // Default Admin Overview Metrics (SRS Page 5 - FR-004)
    const [totalStudents] = await pool.query('SELECT COUNT(*) as count FROM students');
    const [totalTrainers] = await pool.query('SELECT COUNT(*) as count FROM trainers');
    const [activeCourses] = await pool.query('SELECT COUNT(*) as count FROM courses WHERE status = "ACTIVE"');
    const [activeBatches] = await pool.query('SELECT COUNT(*) as count FROM batches WHERE status IN ("UPCOMING", "ONGOING")');
    const [totalLeads] = await pool.query('SELECT COUNT(*) as count FROM leads');
    const [totalAdmissions] = await pool.query('SELECT COUNT(*) as count FROM admissions WHERE status IN ("APPROVED", "CONFIRMED")');
    const [pendingAdmissions] = await pool.query('SELECT COUNT(*) as count FROM admissions WHERE status IN ("SUBMITTED", "SENT", "OPENED", "IN_PROGRESS")');
    const [overdueInvoices] = await pool.query('SELECT COUNT(*) as count FROM invoices WHERE status = "UNPAID" OR status = "PARTIAL"');
    const [upcomingMocks] = await pool.query('SELECT COUNT(*) as count FROM mock_interviews WHERE status = "SCHEDULED"');

    const [feeStats] = await pool.query(
      'SELECT SUM(net_amount) as total_revenue, SUM(paid_amount) as collected_revenue, SUM(due_amount) as pending_fees FROM invoices'
    );

    return successResponse(res, 200, 'Admin Dashboard Metrics', {
      total_students: totalStudents[0].count,
      total_trainers: totalTrainers[0].count,
      active_courses: activeCourses[0].count,
      active_batches: activeBatches[0].count,
      total_leads: totalLeads[0].count,
      total_admissions: totalAdmissions[0].count,
      pending_admissions: pendingAdmissions[0].count,
      overdue_invoices: overdueInvoices[0].count,
      upcoming_mocks: upcomingMocks[0].count,
      pending_fees: parseFloat(feeStats[0]?.pending_fees || 0),
      total_revenue: parseFloat(feeStats[0]?.total_revenue || 0),
      collected_revenue: parseFloat(feeStats[0]?.collected_revenue || 0)
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch dashboard metrics', error.message);
  }
};

/**
 * GET /api/reports/summary
 * Executive top summary metrics with global filter capability.
 */
const getExecutiveSummary = async (req, res) => {
  try {
    const { from, to, quick_date, course_id, batch_id } = req.query;

    let invWhere = 'WHERE 1=1';
    const invParams = [];
    if (course_id) { invWhere += ' AND course_id = ?'; invParams.push(course_id); }

    const [studentRow] = await pool.query('SELECT COUNT(s.id) as total_students, SUM(CASE WHEN u.status = "ACTIVE" THEN 1 ELSE 0 END) as active_students FROM students s JOIN users u ON s.user_id = u.id');
    const [admissionRow] = await pool.query('SELECT COUNT(*) as total_admissions FROM admissions WHERE status = "CONFIRMED"');
    const [batchRow] = await pool.query('SELECT COUNT(*) as active_batches FROM batches WHERE status IN ("UPCOMING", "ONGOING")');
    const [courseRow] = await pool.query('SELECT COUNT(*) as total_courses FROM courses WHERE status = "ACTIVE"');

    const [invRow] = await pool.query(
      `SELECT COALESCE(SUM(net_amount), 0) as total_revenue,
              COALESCE(SUM(paid_amount), 0) as total_collected,
              COALESCE(SUM(due_amount), 0) as total_pending
       FROM invoices ${invWhere}`,
      invParams
    );

    const [attRow] = await pool.query('SELECT status FROM attendance');
    const totalAttDays = attRow.length;
    const presentAttDays = attRow.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const avgAttendance = totalAttDays > 0 ? parseFloat(((presentAttDays / totalAttDays) * 100).toFixed(1)) : 0;

    return successResponse(res, 200, 'Executive summary loaded', {
      summary: {
        total_students: studentRow[0].total_students || 0,
        active_students: studentRow[0].active_students || 0,
        total_admissions: admissionRow[0].total_admissions || 0,
        active_batches: batchRow[0].active_batches || 0,
        total_courses: courseRow[0].total_courses || 0,
        total_revenue: parseFloat(invRow[0].total_revenue),
        total_collected: parseFloat(invRow[0].total_collected),
        pending_fees: parseFloat(invRow[0].total_pending),
        average_attendance: avgAttendance
      }
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch executive summary', error.message);
  }
};

/**
 * GET /api/reports/students
 * Detailed Student Roster Report with attendance, pending fees, and interview scores.
 */
const getStudentReport = async (req, res) => {
  try {
    const { course_id, batch_id, status, search } = req.query;

    let query = `
      SELECT s.id as student_id, s.roll_number as student_code, u.status as student_status,
             u.full_name as student_name, u.email as student_email, u.phone,
             c.name as course_name,
             b.name as batch_name, b.batch_code,
             a.status as admission_status,
             COALESCE(inv.due_amount, 0) as pending_fees,
             COALESCE(inv.paid_amount, 0) as paid_fees
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN admissions a ON a.student_id = s.id AND a.status = 'CONFIRMED'
      LEFT JOIN courses c ON a.course_id = c.id
      LEFT JOIN batches b ON a.batch_id = b.id
      LEFT JOIN invoices inv ON inv.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) { query += ' AND a.course_id = ?'; params.push(course_id); }
    if (batch_id) { query += ' AND a.batch_id = ?'; params.push(batch_id); }
    if (status) { query += ' AND u.status = ?'; params.push(status); }
    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR s.roll_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY s.id DESC';

    const [students] = await pool.query(query, params);

    for (let st of students) {
      // Attendance %
      const [att] = await pool.query('SELECT status FROM attendance WHERE student_id = ?', [st.student_id]);
      const totalDays = att.length;
      const presentDays = att.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      st.attendance_percentage = totalDays > 0 ? parseFloat(((presentDays / totalDays) * 100).toFixed(1)) : 0;

      // Interview Score
      const [scores] = await pool.query('SELECT AVG(score) as avg_score FROM mock_interviews WHERE student_id = ? AND status = "COMPLETED"', [st.student_id]);
      st.interview_score = scores[0].avg_score ? parseFloat(parseFloat(scores[0].avg_score).toFixed(1)) : 'N/A';
    }

    return successResponse(res, 200, 'Student report generated', { students });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate student report', error.message);
  }
};

/**
 * GET /api/reports/admissions
 * Admission pipeline and conversion analytics.
 */
const getAdmissionReport = async (req, res) => {
  try {
    const { course_id, batch_id, status } = req.query;

    let query = `
      SELECT adm.*, 
             u.full_name as student_name, u.email as student_email, s.roll_number,
             c.name as course_name, b.name as batch_name, b.batch_code,
             inv.status as payment_status
      FROM admissions adm
      JOIN students s ON adm.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN courses c ON adm.course_id = c.id
      JOIN batches b ON adm.batch_id = b.id
      LEFT JOIN invoices inv ON inv.admission_id = adm.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) { query += ' AND adm.course_id = ?'; params.push(course_id); }
    if (batch_id) { query += ' AND adm.batch_id = ?'; params.push(batch_id); }
    if (status) { query += ' AND adm.status = ?'; params.push(status); }

    query += ' ORDER BY adm.id DESC';

    const [admissions] = await pool.query(query, params);

    const [statusSummary] = await pool.query(`
      SELECT 
        COUNT(*) as total_admissions,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
      FROM admissions
    `);

    return successResponse(res, 200, 'Admission report generated', {
      summary: statusSummary[0],
      admissions
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate admission report', error.message);
  }
};

/**
 * GET /api/reports/courses
 * Course revenue and performance analytics.
 */
const getCourseReport = async (req, res) => {
  try {
    const [courses] = await pool.query(`
      SELECT c.id, c.code, c.name, c.fee_amount, c.duration_weeks, c.status,
             COUNT(DISTINCT a.student_id) as total_students,
             COALESCE(SUM(inv.net_amount), 0) as total_billed,
             COALESCE(SUM(inv.paid_amount), 0) as total_collected,
             COALESCE(SUM(inv.due_amount), 0) as total_pending
      FROM courses c
      LEFT JOIN admissions a ON c.id = a.course_id AND a.status = 'CONFIRMED'
      LEFT JOIN invoices inv ON inv.course_id = c.id
      GROUP BY c.id
      ORDER BY c.id ASC
    `);

    for (let c of courses) {
      const [att] = await pool.query(
        `SELECT att.status 
         FROM attendance att
         JOIN batch_students bs ON att.student_id = bs.student_id
         JOIN batches b ON bs.batch_id = b.id
         WHERE b.course_id = ?`,
        [c.id]
      );
      const totalAtt = att.length;
      const presentAtt = att.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      c.avg_attendance = totalAtt > 0 ? parseFloat(((presentAtt / totalAtt) * 100).toFixed(1)) : 0;

      const [scores] = await pool.query(
        `SELECT AVG(mi.score) as avg_score 
         FROM mock_interviews mi 
         JOIN batch_students bs ON mi.student_id = bs.student_id 
         JOIN batches b ON bs.batch_id = b.id 
         WHERE b.course_id = ? AND mi.status = 'COMPLETED'`,
        [c.id]
      );
      c.avg_interview_score = scores[0].avg_score ? parseFloat(parseFloat(scores[0].avg_score).toFixed(1)) : 'N/A';
    }

    return successResponse(res, 200, 'Course report generated', { courses });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate course report', error.message);
  }
};

/**
 * GET /api/reports/batches
 * Batch performance, trainer assignments, attendance and dues.
 */
const getBatchReport = async (req, res) => {
  try {
    const [batches] = await pool.query(`
      SELECT b.id, b.batch_code, b.name as batch_name, b.start_date, b.end_date, b.status,
             c.name as course_name,
             u.full_name as trainer_name,
             COUNT(DISTINCT bs.student_id) as total_students
      FROM batches b
      JOIN courses c ON b.course_id = c.id
      LEFT JOIN trainers t ON b.trainer_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN batch_students bs ON b.id = bs.batch_id
      GROUP BY b.id
      ORDER BY b.id DESC
    `);

    for (let b of batches) {
      const [att] = await pool.query('SELECT status FROM attendance WHERE batch_id = ?', [b.id]);
      const totalAtt = att.length;
      const presentAtt = att.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      b.avg_attendance = totalAtt > 0 ? parseFloat(((presentAtt / totalAtt) * 100).toFixed(1)) : 0;

      const [ass] = await pool.query('SELECT COUNT(*) as count FROM assignments WHERE batch_id = ?', [b.id]);
      b.assignments_count = ass[0].count;

      const [dues] = await pool.query(
        `SELECT COALESCE(SUM(inv.due_amount), 0) as pending_dues 
         FROM invoices inv 
         JOIN admissions adm ON inv.admission_id = adm.id 
         WHERE adm.batch_id = ?`,
        [b.id]
      );
      b.pending_fees = parseFloat(dues[0].pending_dues);
    }

    return successResponse(res, 200, 'Batch report generated', { batches });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate batch report', error.message);
  }
};

/**
 * GET /api/reports/attendance
 * Attendance metrics and per-student breakdown.
 */
const getAttendanceReport = async (req, res) => {
  try {
    const { batch_id, course_id } = req.query;

    let attWhere = 'WHERE 1=1';
    const params = [];
    if (batch_id) { attWhere += ' AND att.batch_id = ?'; params.push(batch_id); }

    const [rows] = await pool.query(
      `SELECT att.status, s.id as student_id, u.full_name as student_name, b.name as batch_name
       FROM attendance att
       JOIN students s ON att.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN batches b ON att.batch_id = b.id
       ${attWhere}`,
      params
    );

    const totalLogs = rows.length;
    const presentCount = rows.filter(r => r.status === 'PRESENT').length;
    const lateCount = rows.filter(r => r.status === 'LATE').length;
    const absentCount = rows.filter(r => r.status === 'ABSENT').length;
    const leaveCount = rows.filter(r => ['LEAVE', 'EXCUSED'].includes(r.status)).length;
    const avgPercentage = totalLogs > 0 ? parseFloat((((presentCount + lateCount) / totalLogs) * 100).toFixed(1)) : 0;

    return successResponse(res, 200, 'Attendance report generated', {
      summary: {
        total_logs: totalLogs,
        present_count: presentCount,
        late_count: lateCount,
        absent_count: absentCount,
        leave_count: leaveCount,
        avg_attendance: avgPercentage
      }
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate attendance report', error.message);
  }
};

/**
 * GET /api/reports/finance
 * Comprehensive financial report, billed vs collected vs pending.
 */
const getFinanceReport = async (req, res) => {
  try {
    const [invSummary] = await pool.query(`
      SELECT 
        COALESCE(SUM(net_amount), 0) as total_billed,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(due_amount), 0) as total_pending,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE() AND due_amount > 0 THEN due_amount ELSE 0 END), 0) as overdue_amount
      FROM invoices
      WHERE status != 'CANCELLED'
    `);

    const [methodBreakdown] = await pool.query(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      GROUP BY payment_method
    `);

    return successResponse(res, 200, 'Finance report generated', {
      summary: invSummary[0],
      payment_methods: methodBreakdown
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate finance report', error.message);
  }
};

/**
 * GET /api/reports/payments
 * Detailed auditable payment history log report.
 */
const getPaymentReport = async (req, res) => {
  try {
    const { payment_method } = req.query;

    let query = `
      SELECT p.*, inv.invoice_number, u.full_name as student_name, c.name as course_name
      FROM payments p
      JOIN invoices inv ON p.invoice_id = inv.id
      JOIN students s ON p.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN admissions adm ON inv.admission_id = adm.id
      LEFT JOIN courses c ON adm.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (payment_method) {
      query += ' AND p.payment_method = ?';
      params.push(payment_method.toUpperCase());
    }

    query += ' ORDER BY p.id DESC';

    const [payments] = await pool.query(query, params);

    return successResponse(res, 200, 'Payment report generated', { payments });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate payment report', error.message);
  }
};

/**
 * GET /api/reports/interviews
 * Mock interview metrics and evaluation scores report.
 */
const getMockInterviewReport = async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as total_interviews,
        SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
        COALESCE(AVG(CASE WHEN status = 'COMPLETED' THEN score END), 0) as avg_score
      FROM mock_interviews
    `);

    const [interviews] = await pool.query(`
      SELECT mi.*, u.full_name as student_name, t_u.full_name as trainer_name
      FROM mock_interviews mi
      JOIN students s ON mi.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN trainers t ON mi.trainer_id = t.id
      JOIN users t_u ON t.user_id = t_u.id
      ORDER BY mi.id DESC
    `);

    return successResponse(res, 200, 'Mock interview report generated', {
      summary: {
        ...summary[0],
        avg_score: parseFloat(parseFloat(summary[0].avg_score || 0).toFixed(1))
      },
      interviews
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate mock interview report', error.message);
  }
};

/**
 * GET /api/reports/users
 * System users breakdown report by role.
 */
const getUserReport = async (req, res) => {
  try {
    const [roleBreakdown] = await pool.query(`
      SELECT r.name as role_name,
             COUNT(u.id) as total_users,
             SUM(CASE WHEN u.status = 'ACTIVE' THEN 1 ELSE 0 END) as active_users,
             SUM(CASE WHEN u.status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive_users
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      GROUP BY r.id
    `);

    return successResponse(res, 200, 'User report generated', { roles: roleBreakdown });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate user report', error.message);
  }
};

/**
 * GET /api/reports/charts
 * Analytics charts data (Revenue trend, monthly admissions, payment methods).
 */
const getChartsData = async (req, res) => {
  try {
    const [revenueTrend] = await pool.query(`
      SELECT DATE_FORMAT(payment_date, '%b %Y') as month, SUM(amount) as monthly_collected
      FROM payments
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
      ORDER BY DATE_FORMAT(payment_date, '%Y-%m') ASC
    `);

    const [admissionsTrend] = await pool.query(`
      SELECT DATE_FORMAT(admission_date, '%b %Y') as month, COUNT(*) as admissions_count
      FROM admissions
      GROUP BY DATE_FORMAT(admission_date, '%Y-%m')
      ORDER BY DATE_FORMAT(admission_date, '%Y-%m') ASC
    `);

    const [paymentMethods] = await pool.query(`
      SELECT payment_method, SUM(amount) as total_amount
      FROM payments
      GROUP BY payment_method
    `);

    return successResponse(res, 200, 'Charts data loaded', {
      revenue_trend: revenueTrend,
      admissions_trend: admissionsTrend,
      payment_methods: paymentMethods
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch charts data', error.message);
  }
};

module.exports = {
  getDashboardStats,
  getExecutiveSummary,
  getStudentReport,
  getAdmissionReport,
  getCourseReport,
  getBatchReport,
  getAttendanceReport,
  getFinanceReport,
  getPaymentReport,
  getMockInterviewReport,
  getUserReport,
  getChartsData
};
