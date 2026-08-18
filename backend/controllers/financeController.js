const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { sendPaymentReceiptEmail } = require('../utils/emailService');

/**
 * GET /api/finance/summary
 * Computes top dashboard financial summary cards.
 */
const getFinanceSummary = async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        COALESCE(SUM(net_amount), 0) as total_revenue,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(due_amount), 0) as total_pending,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE() AND due_amount > 0 THEN due_amount ELSE 0 END), 0) as overdue_amount
      FROM invoices
      WHERE status != 'CANCELLED'
    `);

    return successResponse(res, 200, 'Finance summary retrieved successfully', {
      summary: summary[0] || { total_revenue: 0, total_collected: 0, total_pending: 0, overdue_amount: 0 }
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch finance summary', error.message);
  }
};

/**
 * GET /api/invoices
 * Retrieves invoices list with search, status, course_id, and date filters.
 */
const getInvoices = async (req, res) => {
  try {
    const { status, course_id, search } = req.query;

    let query = `
      SELECT inv.*, 
             u.full_name as student_name, u.email as student_email, u.phone as student_phone, s.roll_number,
             c.name as course_name, c.code as course_code,
             a.admission_number,
             cb_u.full_name as created_by_name
      FROM invoices inv
      JOIN students s ON inv.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN admissions a ON inv.admission_id = a.id
      LEFT JOIN courses c ON (inv.course_id = c.id OR a.course_id = c.id)
      LEFT JOIN users cb_u ON inv.created_by = cb_u.id
      WHERE 1=1
    `;
    const params = [];

    const userRole = req.user?.role_name?.toUpperCase();

    if (userRole === 'STUDENT') {
      query += ' AND inv.student_id = ?';
      params.push(req.user.student_id || 0);
    } else if (course_id) {
      query += ' AND (inv.course_id = ? OR a.course_id = ?)';
      params.push(course_id, course_id);
    }

    if (status) {
      query += ' AND inv.status = ?';
      params.push(status.toUpperCase());
    }

    if (search) {
      query += ' AND (inv.invoice_number LIKE ? OR u.full_name LIKE ? OR s.roll_number LIKE ? OR a.admission_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY inv.id DESC';

    const [invoices] = await pool.query(query, params);

    // Auto-update status to OVERDUE if due_date passed and pending > 0
    const today = new Date().toISOString().split('T')[0];

    for (let inv of invoices) {
      let dueDateStr = '';
      if (inv.due_date instanceof Date) {
        dueDateStr = inv.due_date.toISOString().split('T')[0];
      } else if (inv.due_date) {
        dueDateStr = String(inv.due_date).split('T')[0];
      }

      if (dueDateStr && dueDateStr < today && parseFloat(inv.due_amount || 0) > 0 && inv.status !== 'CANCELLED') {
        inv.status = 'OVERDUE';
      }

      const [installments] = await pool.query('SELECT * FROM installments WHERE invoice_id = ? ORDER BY installment_number ASC', [inv.id]);
      inv.installments = installments;

      const [payments] = await pool.query('SELECT * FROM payments WHERE invoice_id = ? ORDER BY id DESC', [inv.id]);
      inv.payments = payments;
    }

    return successResponse(res, 200, 'Invoices fetched successfully', { invoices });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch invoices', error.message);
  }
};

/**
 * GET /api/invoices/:id
 * Retrieves complete details for an invoice including student profile, installments, and payment history.
 */
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, 'Invalid invoice ID provided');
    }

    const [invoices] = await pool.query(
      `SELECT inv.*, 
              u.full_name as student_name, u.email as student_email, u.phone as student_phone, s.roll_number,
              c.name as course_name, c.code as course_code, c.fee_amount as course_fee,
              a.admission_number, a.admission_date,
              cb_u.full_name as created_by_name
       FROM invoices inv
       JOIN students s ON inv.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN admissions a ON inv.admission_id = a.id
       LEFT JOIN courses c ON (inv.course_id = c.id OR a.course_id = c.id)
       LEFT JOIN users cb_u ON inv.created_by = cb_u.id
       WHERE inv.id = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    const invoice = invoices[0];

    // Check student role restriction
    if (req.user.role_name === 'STUDENT' && parseInt(invoice.student_id, 10) !== parseInt(req.user.student_id, 10)) {
      return errorResponse(res, 403, 'You are not authorized to view this invoice');
    }

    const [installments] = await pool.query('SELECT * FROM installments WHERE invoice_id = ? ORDER BY installment_number ASC', [id]);
    invoice.installments = installments;

    const [payments] = await pool.query(
      `SELECT p.*, rec_u.full_name as received_by_name
       FROM payments p
       LEFT JOIN users rec_u ON p.received_by = rec_u.id
       WHERE p.invoice_id = ? ORDER BY p.id DESC`,
      [id]
    );
    invoice.payments = payments;

    return successResponse(res, 200, 'Invoice details retrieved successfully', { invoice });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch invoice details', error.message);
  }
};

/**
 * POST /api/invoices
 * Creates a new invoice record. Calculates Net Amount on backend safely.
 */
const createInvoice = async (req, res) => {
  try {
    const { admission_id, student_id, course_id, total_amount, discount_amount, tax_amount, due_date, status } = req.body;

    if (!admission_id || !student_id || total_amount === undefined || !due_date) {
      return errorResponse(res, 400, 'Admission, Student, Total Fee, and Due Date are required');
    }

    // Backend Financial Calculations
    const grossTotal = parseFloat(total_amount);
    const discount = parseFloat(discount_amount || 0);
    const tax = parseFloat(tax_amount || 0);
    const netAmount = Math.max(0, grossTotal - discount + tax);
    const dueAmount = netAmount;

    const invoiceDate = new Date().toISOString().split('T')[0];
    const invoiceStatus = (status || 'UNPAID').toUpperCase();

    // Auto-Generate Invoice Number
    const year = new Date().getFullYear();
    const [countRow] = await pool.query('SELECT COUNT(id) as total FROM invoices');
    const seqNum = (countRow[0].total || 0) + 1;
    const invoiceNumber = `INV-${year}-${String(seqNum).padStart(4, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO invoices 
       (admission_id, student_id, course_id, invoice_number, total_amount, discount_amount, tax_amount, net_amount, paid_amount, due_amount, invoice_date, due_date, status, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        admission_id,
        student_id,
        course_id || null,
        invoiceNumber,
        grossTotal,
        discount,
        tax,
        netAmount,
        0.00,
        dueAmount,
        invoiceDate,
        due_date,
        invoiceStatus,
        req.user?.id || null
      ]
    );

    return successResponse(res, 201, 'Invoice created successfully', {
      invoiceId: result.insertId,
      invoiceNumber,
      netAmount,
      dueAmount
    });
  } catch (error) {
    return errorResponse(res, 500, 'Invoice creation failed', error.message);
  }
};

/**
 * POST /api/invoices/:id/installments
 * Divides an invoice into installments. Validates total installment amounts <= Net Amount.
 */
const createInstallments = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { installments } = req.body; // Array: [{ installment_number, amount, due_date }]

    if (!Array.isArray(installments) || installments.length === 0) {
      return errorResponse(res, 400, 'Installments array is required');
    }

    const [invoices] = await connection.query('SELECT net_amount FROM invoices WHERE id = ?', [id]);
    if (invoices.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Invoice not found');
    }

    const netAmount = parseFloat(invoices[0].net_amount);
    const sumInstallments = installments.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    if (sumInstallments > netAmount + 0.01) {
      await connection.rollback();
      return errorResponse(res, 400, `Total installment sum ($${sumInstallments.toFixed(2)}) cannot exceed invoice net amount ($${netAmount.toFixed(2)}).`);
    }

    // Delete previous pending installments
    await connection.query('DELETE FROM installments WHERE invoice_id = ? AND status = "PENDING"', [id]);

    for (let inst of installments) {
      const amt = parseFloat(inst.amount);
      await connection.query(
        `INSERT INTO installments (invoice_id, installment_number, amount, paid_amount, pending_amount, due_date, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
        [id, inst.installment_number, amt, 0.00, amt, inst.due_date]
      );
    }

    await connection.commit();
    return successResponse(res, 201, 'Installment schedule created successfully');
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 500, 'Installments creation failed', error.message);
  } finally {
    connection.release();
  }
};

/**
 * POST /api/payments
 * POST /api/invoices/:id/payments
 * POST /api/installments/:id/pay
 * Records a financial payment using a MySQL Transaction.
 * Performs payment validation, payment recording, and automated status recalculations.
 */
const recordPayment = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const invoiceId = req.params.id || req.body.invoice_id;
    const installmentId = req.body.installment_id || (req.params.installment_id ? req.params.installment_id : null);
    const { amount, payment_date, payment_method, transaction_reference, remarks } = req.body;

    const payAmount = parseFloat(amount);
    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const payMethod = (payment_method || 'UPI').toUpperCase();

    // 1. Basic Amount Validation
    if (isNaN(payAmount) || payAmount <= 0) {
      await connection.rollback();
      return errorResponse(res, 400, 'Payment amount must be a positive number');
    }

    // 2. Fetch Invoice Details
    const [invoices] = await connection.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (invoices.length === 0) {
      await connection.rollback();
      return errorResponse(res, 404, 'Invoice not found');
    }

    const invoice = invoices[0];
    const netAmount = parseFloat(invoice.net_amount || invoice.total_amount);
    const currentPaid = parseFloat(invoice.paid_amount || 0);
    const currentDue = parseFloat(invoice.due_amount);

    // 3. Payment Amount Over-payment Validation
    if (payAmount > currentDue + 0.01) {
      await connection.rollback();
      return errorResponse(
        res,
        400,
        `Payment amount ($${payAmount.toFixed(2)}) cannot exceed remaining invoice due amount ($${currentDue.toFixed(2)}).`
      );
    }

    // 4. Record Payment Entry
    const [payResult] = await connection.query(
      `INSERT INTO payments 
       (invoice_id, installment_id, student_id, amount, payment_date, payment_method, transaction_reference, remarks, received_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        installmentId || null,
        invoice.student_id,
        payAmount,
        payDate,
        payMethod,
        transaction_reference || `TXN-${Date.now()}`,
        remarks || null,
        req.user?.id || null
      ]
    );

    // 5. Update Installment status if installmentId specified
    if (installmentId) {
      const [insts] = await connection.query('SELECT * FROM installments WHERE id = ?', [installmentId]);
      if (insts.length > 0) {
        const inst = insts[0];
        const instPaid = parseFloat(inst.paid_amount || 0) + payAmount;
        const instPending = Math.max(0, parseFloat(inst.amount) - instPaid);
        const instStatus = instPending <= 0 ? 'PAID' : 'PARTIALLY_PAID';

        await connection.query(
          `UPDATE installments 
           SET paid_amount = ?, pending_amount = ?, status = ?, paid_date = ?, payment_mode = ?, transaction_id = ? 
           WHERE id = ?`,
          [instPaid, instPending, instStatus, payDate, payMethod, transaction_reference || null, installmentId]
        );
      }
    }

    // 6. Recalculate Invoice Totals & Automated Status Automation
    const newTotalPaid = currentPaid + payAmount;
    const newTotalDue = Math.max(0, netAmount - newTotalPaid);

    let nextInvoiceStatus = 'PARTIALLY_PAID';
    if (newTotalDue <= 0) {
      nextInvoiceStatus = 'PAID';
    } else if (newTotalPaid === 0) {
      nextInvoiceStatus = 'UNPAID';
    }

    await connection.query(
      'UPDATE invoices SET paid_amount = ?, due_amount = ?, status = ? WHERE id = ?',
      [newTotalPaid, newTotalDue, nextInvoiceStatus, invoiceId]
    );

    await connection.commit();

    try {
      const [stu] = await pool.query('SELECT u.full_name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?', [invoice.student_id]);
      if (stu.length > 0) {
        sendPaymentReceiptEmail({
          toEmail: stu[0].email,
          studentName: stu[0].full_name,
          amount: payAmount,
          invoiceNumber: invoice.invoice_number,
          balanceDue: newTotalDue,
          paymentMethod: payment_method || 'UPI / Online'
        }).catch(err => console.error('Payment receipt email error:', err.message));
      }
    } catch (e) {
      console.error('Email dispatch fetch error:', e.message);
    }

    return successResponse(res, 200, 'Payment recorded successfully', {
      paymentId: payResult.insertId,
      paid_amount: newTotalPaid,
      due_amount: newTotalDue,
      invoice_status: nextInvoiceStatus
    });
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, 500, 'Payment processing failed', error.message);
  } finally {
    connection.release();
  }
};

/**
 * GET /api/finance/student/:studentId
 * Retrieves student's personal financial statement and payment history.
 */
const getStudentFinance = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user.student_id;

    if (!studentId) {
      return errorResponse(res, 400, 'Student ID not specified');
    }

    if (req.user.role_name === 'STUDENT' && parseInt(studentId, 10) !== parseInt(req.user.student_id, 10)) {
      return errorResponse(res, 403, 'You are not authorized to view another student\'s financial records');
    }

    const [invoices] = await pool.query(
      `SELECT inv.*, c.name as course_name, c.code as course_code
       FROM invoices inv
       JOIN admissions a ON inv.admission_id = a.id
       LEFT JOIN courses c ON (inv.course_id = c.id OR a.course_id = c.id)
       WHERE inv.student_id = ? ORDER BY inv.id DESC`,
      [studentId]
    );

    const [installments] = await pool.query(
      `SELECT inst.*, inv.invoice_number 
       FROM installments inst
       JOIN invoices inv ON inst.invoice_id = inv.id
       WHERE inv.student_id = ? ORDER BY inst.due_date ASC`,
      [studentId]
    );

    const [payments] = await pool.query(
      `SELECT p.*, inv.invoice_number 
       FROM payments p
       JOIN invoices inv ON p.invoice_id = inv.id
       WHERE p.student_id = ? ORDER BY p.payment_date DESC`,
      [studentId]
    );

    const totalFees = invoices.reduce((sum, i) => sum + parseFloat(i.net_amount || i.total_amount), 0);
    const paidFees = invoices.reduce((sum, i) => sum + parseFloat(i.paid_amount || 0), 0);
    const pendingFees = invoices.reduce((sum, i) => sum + parseFloat(i.due_amount || 0), 0);

    return successResponse(res, 200, 'Student financial statement retrieved', {
      statement: {
        total_fees: totalFees,
        paid_fees: paidFees,
        pending_fees: pendingFees
      },
      invoices,
      installments,
      payments
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch student financial statement', error.message);
  }
};

/**
 * GET /api/payments
 * Retrieves auditable payment history log for financial reporting.
 */
const getPaymentHistory = async (req, res) => {
  try {
    const [payments] = await pool.query(
      `SELECT p.*, 
              inv.invoice_number,
              u.full_name as student_name, u.email as student_email, s.roll_number,
              rec_u.full_name as received_by_name
       FROM payments p
       JOIN invoices inv ON p.invoice_id = inv.id
       JOIN students s ON p.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN users rec_u ON p.received_by = rec_u.id
       ORDER BY p.id DESC`
    );

    return successResponse(res, 200, 'Payment history retrieved successfully', { payments });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch payment history', error.message);
  }
};

module.exports = {
  getFinanceSummary,
  getInvoices,
  getInvoiceById,
  createInvoice,
  createInstallments,
  recordPayment,
  getStudentFinance,
  getPaymentHistory
};
