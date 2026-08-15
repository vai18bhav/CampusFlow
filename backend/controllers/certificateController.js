const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const generateCertNumber = () => {
  const now = new Date();
  const yr = now.getFullYear();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CF-CERT-${yr}-${rand}`;
};

/** GET /api/certificates */
const getCertificates = async (req, res) => {
  try {
    const { student_id } = req.query;
    let query = `
      SELECT cert.*, u.full_name AS student_name, u.email AS student_email,
             c.name AS course_name, b.name AS batch_name, b.batch_code,
             iss.full_name AS issued_by_name
      FROM certificates cert
      JOIN students s ON cert.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN courses c ON cert.course_id = c.id
      JOIN batches b ON cert.batch_id = b.id
      LEFT JOIN users iss ON cert.issued_by = iss.id
    `;
    const params = [];
    if (student_id) {
      query += ' WHERE cert.student_id = ?';
      params.push(student_id);
    }
    query += ' ORDER BY cert.created_at DESC';

    const [certs] = await pool.query(query, params);
    return successResponse(res, 200, 'Certificates fetched', { certificates: certs });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch certificates', error.message);
  }
};

/** GET /api/certificates/:id */
const getCertificateById = async (req, res) => {
  try {
    const [certs] = await pool.query(
      `SELECT cert.*, u.full_name AS student_name, u.email AS student_email,
              c.name AS course_name, b.name AS batch_name, b.batch_code, b.end_date,
              iss.full_name AS issued_by_name
       FROM certificates cert
       JOIN students s ON cert.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN courses c ON cert.course_id = c.id
       JOIN batches b ON cert.batch_id = b.id
       LEFT JOIN users iss ON cert.issued_by = iss.id
       WHERE cert.id = ?`,
      [req.params.id]
    );
    if (!certs.length) return errorResponse(res, 404, 'Certificate not found');
    return successResponse(res, 200, 'Certificate fetched', { certificate: certs[0] });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch certificate', error.message);
  }
};

/** POST /api/certificates */
const issueCertificate = async (req, res) => {
  try {
    const { student_id, batch_id, course_id, grade, issued_date } = req.body;
    if (!student_id || !batch_id || !course_id)
      return errorResponse(res, 400, 'student_id, batch_id, and course_id are required');

    // Check duplicate
    const [existing] = await pool.query(
      'SELECT id FROM certificates WHERE student_id = ? AND batch_id = ?',
      [student_id, batch_id]
    );
    if (existing.length > 0)
      return errorResponse(res, 409, 'Certificate already issued for this student and batch');

    const certNumber = generateCertNumber();
    const [result] = await pool.query(
      `INSERT INTO certificates (certificate_number, student_id, batch_id, course_id, issued_date, grade, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [certNumber, student_id, batch_id, course_id, issued_date || new Date().toISOString().split('T')[0], grade || 'Pass', req.user.id]
    );
    return successResponse(res, 201, 'Certificate issued successfully', { id: result.insertId, certificate_number: certNumber });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to issue certificate', error.message);
  }
};

/** PATCH /api/certificates/:id/revoke */
const revokeCertificate = async (req, res) => {
  try {
    await pool.query('UPDATE certificates SET status = ? WHERE id = ?', ['REVOKED', req.params.id]);
    return successResponse(res, 200, 'Certificate revoked');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to revoke certificate', error.message);
  }
};

module.exports = { getCertificates, getCertificateById, issueCertificate, revokeCertificate };
