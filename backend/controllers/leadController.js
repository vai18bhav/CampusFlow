const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const getLeads = async (req, res) => {
  try {
    const { status, sales_exec_id, search } = req.query;

    let query = `
      SELECT l.*, c.name as course_name, u.full_name as sales_exec_name
      FROM leads l
      LEFT JOIN courses c ON l.course_id = c.id
      LEFT JOIN sales_executives se ON l.sales_exec_id = se.id
      LEFT JOIN users u ON se.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role_name === 'SALES_EXECUTIVE') {
      query += ' AND l.sales_exec_id = ?';
      params.push(req.user.sales_exec_id || 0);
    } else if (sales_exec_id) {
      query += ' AND l.sales_exec_id = ?';
      params.push(sales_exec_id);
    }

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (l.candidate_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY l.id DESC';

    const [leads] = await pool.query(query, params);
    return successResponse(res, 200, 'Leads fetched successfully', { leads });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch leads', error.message);
  }
};

const createLead = async (req, res) => {
  try {
    const { candidate_name, email, phone, course_id, lead_source, notes, sales_exec_id } = req.body;

    if (!candidate_name || !email || !phone) {
      return errorResponse(res, 400, 'Candidate name, email, and phone are required');
    }

    // Default sales executive to logged in sales exec if available
    const assignedSalesExec = sales_exec_id || (req.user.role_name === 'SALES_EXECUTIVE' ? req.user.sales_exec_id : null);

    const [result] = await pool.query(
      'INSERT INTO leads (sales_exec_id, candidate_name, email, phone, course_id, lead_source, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [assignedSalesExec, candidate_name, email, phone, course_id || null, lead_source || 'WEBSITE', 'NEW', notes || null]
    );

    return successResponse(res, 201, 'Lead created successfully', { leadId: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Lead creation failed', error.message);
  }
};

const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, sales_exec_id } = req.body;

    await pool.query(
      'UPDATE leads SET status = COALESCE(?, status), notes = COALESCE(?, notes), sales_exec_id = COALESCE(?, sales_exec_id) WHERE id = ?',
      [status, notes, sales_exec_id, id]
    );

    return successResponse(res, 200, 'Lead updated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Lead update failed', error.message);
  }
};

const getInquiries = async (req, res) => {
  try {
    const [inquiries] = await pool.query(
      `SELECT i.*, l.candidate_name as lead_name, u.full_name as student_name
       FROM inquiries i
       LEFT JOIN leads l ON i.lead_id = l.id
       LEFT JOIN students s ON i.student_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       ORDER BY i.id DESC`
    );

    return successResponse(res, 200, 'Inquiries retrieved', { inquiries });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch inquiries', error.message);
  }
};

const createInquiry = async (req, res) => {
  try {
    const { lead_id, student_id, query } = req.body;

    if (!query) {
      return errorResponse(res, 400, 'Inquiry query content is required');
    }

    const [result] = await pool.query(
      'INSERT INTO inquiries (lead_id, student_id, query, status) VALUES (?, ?, ?, ?)',
      [lead_id || null, student_id || req.user.student_id || null, query, 'PENDING']
    );

    return successResponse(res, 201, 'Inquiry submitted successfully', { inquiryId: result.insertId });
  } catch (error) {
    return errorResponse(res, 500, 'Inquiry creation failed', error.message);
  }
};

const respondInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { response, status } = req.body;

    if (!response) {
      return errorResponse(res, 400, 'Response text is required');
    }

    await pool.query(
      'UPDATE inquiries SET response = ?, status = COALESCE(?, "RESOLVED") WHERE id = ?',
      [response, status, id]
    );

    return successResponse(res, 200, 'Inquiry response recorded');
  } catch (error) {
    return errorResponse(res, 500, 'Inquiry response failed', error.message);
  }
};

module.exports = {
  getLeads,
  createLead,
  updateLeadStatus,
  getInquiries,
  createInquiry,
  respondInquiry
};
