const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { compileTemplate } = require('../services/templateService');

/**
 * GET /api/admin/email-templates
 * List all configurable email templates (Super Admin)
 */
const getEmailTemplates = async (req, res) => {
  try {
    const [templates] = await pool.query('SELECT * FROM email_templates ORDER BY category ASC, id ASC');
    return successResponse(res, 200, 'Email templates retrieved successfully', { templates });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch email templates', error.message);
  }
};

/**
 * PUT /api/admin/email-templates/:id
 * Update subject, HTML body, or active status of a template (Super Admin)
 */
const updateEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body_html, is_active } = req.body;

    if (!subject || !body_html) {
      return errorResponse(res, 400, 'Subject and Email Body are required');
    }

    const [result] = await pool.query(
      'UPDATE email_templates SET subject = ?, body_html = ?, is_active = COALESCE(?, is_active) WHERE id = ?',
      [subject, body_html, is_active !== undefined ? (is_active ? 1 : 0) : null, id]
    );

    if (result.affectedRows === 0) return errorResponse(res, 404, 'Email template not found');

    return successResponse(res, 200, 'Email template updated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update email template', error.message);
  }
};

/**
 * POST /api/admin/email-templates/:id/preview
 * Returns HTML preview with mock sample variables
 */
const previewEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const sampleVariables = {
      student_name: 'Rahul Sharma',
      student_email: 'rahul.sharma@example.com',
      course_name: 'Full Stack Web Development',
      batch_name: 'Batch FSWD-2026-A',
      invoice_number: 'INV-2026-00042',
      amount: '12,500',
      currency: 'INR',
      due_date: '2026-09-05',
      mock_date: '2026-09-02',
      mock_time: '14:00 PM',
      interviewer_name: 'Anjali Verma',
      credit_remaining: 5,
      expiry_date: '2026-10-31',
      assignment_title: 'Building RESTful APIs with Node & Express',
      login_link: 'http://localhost:5173/login',
      reset_link: 'http://localhost:5173/reset-password?token=sample-reset-token-123'
    };

    const [rows] = await pool.query('SELECT code FROM email_templates WHERE id = ?', [id]);
    if (rows.length === 0) return errorResponse(res, 404, 'Template not found');

    const compiled = await compileTemplate(rows[0].code, sampleVariables);
    return successResponse(res, 200, 'Template preview generated', compiled);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to generate template preview', error.message);
  }
};

module.exports = {
  getEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate
};
