const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/** GET /api/documents?student_id=X */
const getDocuments = async (req, res) => {
  try {
    const { student_id } = req.query;
    if (!student_id) return errorResponse(res, 400, 'student_id is required');

    const [docs] = await pool.query(
      `SELECT sd.*, u.full_name AS verified_by_name
       FROM student_documents sd
       LEFT JOIN users u ON sd.verified_by = u.id
       WHERE sd.student_id = ?
       ORDER BY sd.created_at DESC`,
      [student_id]
    );
    return successResponse(res, 200, 'Documents fetched', { documents: docs });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch documents', error.message);
  }
};

/** POST /api/documents */
const addDocument = async (req, res) => {
  try {
    const { student_id, document_type, document_name, file_path } = req.body;
    if (!student_id || !document_type || !document_name)
      return errorResponse(res, 400, 'student_id, document_type, and document_name are required');

    const [result] = await pool.query(
      `INSERT INTO student_documents (student_id, document_type, document_name, file_path)
       VALUES (?, ?, ?, ?)`,
      [student_id, document_type, document_name, file_path || null]
    );
    return successResponse(res, 201, 'Document record added', { id: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to add document', error.message);
  }
};

/** PATCH /api/documents/:id/verify */
const verifyDocument = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status))
      return errorResponse(res, 400, 'Status must be VERIFIED, REJECTED, or PENDING');

    await pool.query(
      `UPDATE student_documents SET status=?, remarks=?, verified_by=?, verified_at=NOW() WHERE id=?`,
      [status, remarks || null, req.user.id, req.params.id]
    );
    return successResponse(res, 200, `Document marked as ${status}`);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update document status', error.message);
  }
};

/** DELETE /api/documents/:id */
const deleteDocument = async (req, res) => {
  try {
    await pool.query('DELETE FROM student_documents WHERE id = ?', [req.params.id]);
    return successResponse(res, 200, 'Document deleted');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete document', error.message);
  }
};

module.exports = { getDocuments, addDocument, verifyDocument, deleteDocument };
