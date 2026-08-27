const pool = require('../config/db');
const { errorResponse } = require('../utils/responseHelper');
const { logAudit } = require('../utils/auditLogger');

/**
 * Convert array of objects to CSV string
 */
function jsonToCSV(items) {
  if (!items || items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const csvRows = [headers.join(',')];

  for (const item of items) {
    const values = headers.map(header => {
      const val = item[header] ?? '';
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

/**
 * GET /api/export/:type
 * Exports data for students, invoices, attendance, or progress in CSV or JSON format (FR-006)
 */
const exportData = async (req, res) => {
  try {
    const { type } = req.params; // 'students', 'invoices', 'attendance', 'progress'
    const { format = 'csv' } = req.query;

    let data = [];
    let filename = `${type}_export_${new Date().toISOString().split('T')[0]}`;

    if (type === 'students') {
      const [rows] = await pool.query(
        `SELECT s.id as student_id, s.roll_number, u.full_name, u.email, u.phone, u.status as account_status,
                s.dob, s.gender, s.address, s.mock_interview_credits, s.created_at
         FROM students s
         JOIN users u ON s.user_id = u.id
         ORDER BY s.id DESC`
      );
      data = rows;
    } else if (type === 'invoices') {
      const [rows] = await pool.query(
        `SELECT inv.id as invoice_id, inv.invoice_number, u.full_name as student_name, s.roll_number,
                c.name as course_name, inv.total_amount, inv.discount_amount, inv.net_amount,
                inv.paid_amount, inv.due_amount, inv.currency, inv.status, inv.invoice_date, inv.due_date
         FROM invoices inv
         JOIN students s ON inv.student_id = s.id
         JOIN users u ON s.user_id = u.id
         LEFT JOIN courses c ON inv.course_id = c.id
         ORDER BY inv.id DESC`
      );
      data = rows;
    } else if (type === 'attendance') {
      const [rows] = await pool.query(
        `SELECT att.id as attendance_id, att.date, u.full_name as student_name, s.roll_number,
                b.name as batch_name, b.batch_code, att.status, att.remarks
         FROM attendance att
         JOIN students s ON att.student_id = s.id
         JOIN users u ON s.user_id = u.id
         JOIN batches b ON att.batch_id = b.id
         ORDER BY att.date DESC`
      );
      data = rows;
    } else if (type === 'progress') {
      const [rows] = await pool.query(
        `SELECT s.id as student_id, s.roll_number, u.full_name as student_name, u.email,
                c.name as course_name, b.name as batch_name,
                (SELECT COUNT(*) FROM attendance att WHERE att.student_id = s.id AND att.status = 'PRESENT') as present_days,
                (SELECT COUNT(*) FROM attendance att WHERE att.student_id = s.id) as total_class_days,
                (SELECT AVG(score) FROM mock_interviews mi WHERE mi.student_id = s.id AND mi.status = 'COMPLETED') as avg_mock_score,
                (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.student_id = s.id) as assignments_submitted
         FROM students s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN batch_students bs ON bs.student_id = s.id
         LEFT JOIN batches b ON bs.batch_id = b.id
         LEFT JOIN courses c ON b.course_id = c.id
         ORDER BY s.id DESC`
      );
      data = rows;
    } else {
      return errorResponse(res, 400, 'Invalid export type. Must be students, invoices, attendance, or progress');
    }

    await logAudit(req, req.user?.id, 'EXPORT_DATA', type, null, `Exported ${data.length} records of type '${type}' in ${format.toUpperCase()} format`);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.status(200).send(JSON.stringify(data, null, 2));
    } else {
      const csvStr = jsonToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.status(200).send(csvStr);
    }
  } catch (error) {
    return errorResponse(res, 500, 'Data export failed', error.message);
  }
};

module.exports = { exportData };
