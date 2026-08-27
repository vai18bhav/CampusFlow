const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

/**
 * Generates an official server-side invoice PDF/structured document layout
 * and saves it securely under backend/uploads/invoices/
 */
const generateInvoicePdfServerSide = async (invoiceId) => {
  try {
    const [invoices] = await pool.query(
      `SELECT inv.*, c.name as course_name, c.code as course_code,
              u.full_name as student_name, u.email as student_email, s.roll_number
       FROM invoices inv
       LEFT JOIN courses c ON inv.course_id = c.id
       JOIN students s ON inv.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE inv.id = ?`,
      [invoiceId]
    );

    if (invoices.length === 0) return null;
    const inv = invoices[0];

    const [installments] = await pool.query(
      'SELECT * FROM installments WHERE invoice_id = ? ORDER BY installment_number ASC',
      [invoiceId]
    );

    const invoicesDir = path.join(__dirname, '..', 'uploads', 'invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const fileName = `${inv.invoice_number || `INV-${inv.id}`}.pdf`;
    const filePath = path.join(invoicesDir, fileName);

    const currencySymbol = inv.currency === 'USD' ? '$' : '₹';

    const contentHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${inv.invoice_number}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 40px; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .brand-title { font-size: 26px; font-weight: 800; color: #2563eb; margin: 0; }
    .brand-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
    .inv-title { text-align: right; }
    .inv-num { font-size: 20px; font-weight: 700; color: #0f172a; }
    .details-row { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .box { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; width: 48%; }
    .box h4 { margin: 0 0 10px 0; color: #2563eb; font-size: 14px; text-transform: uppercase; }
    .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .table th { background: #f1f5f9; color: #475569; font-size: 12px; text-transform: uppercase; }
    .totals { margin-top: 30px; text-align: right; }
    .totals-row { font-size: 14px; margin-bottom: 6px; }
    .totals-final { font-size: 18px; font-weight: 800; color: #2563eb; border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 10px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 12px; text-transform: uppercase; }
    .status-PAID { background: #dcfce7; color: #166534; }
    .status-PENDING { background: #fef3c7; color: #92400e; }
    .status-OVERDUE { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">CampusFlow Portal</div>
      <div class="brand-sub">EdTech Training & Admission Management</div>
    </div>
    <div class="inv-title">
      <div class="inv-num">${inv.invoice_number}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Date: ${inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : ''}</div>
    </div>
  </div>

  <div class="details-row">
    <div class="box">
      <h4>Billed To</h4>
      <div><strong>${inv.student_name}</strong></div>
      <div>Roll No: ${inv.roll_number || 'N/A'}</div>
      <div>Email: ${inv.student_email}</div>
    </div>
    <div class="box">
      <h4>Course Enrollment</h4>
      <div><strong>${inv.course_name} (${inv.course_code || 'CS'})</strong></div>
      <div>Currency: <strong>${inv.currency}</strong></div>
      <div>Status: <span class="status-badge status-${inv.status}">${inv.status}</span></div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Instalment #</th>
        <th>Due Date</th>
        <th>Status</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${installments.length > 0 ? installments.map(inst => `
        <tr>
          <td>Instalment #${inst.installment_number}</td>
          <td>${inst.due_date ? new Date(inst.due_date).toISOString().split('T')[0] : 'N/A'}</td>
          <td>${inst.status}</td>
          <td style="text-align: right;">${currencySymbol} ${parseFloat(inst.amount).toLocaleString()}</td>
        </tr>
      `).join('') : `
        <tr>
          <td colspan="3">Full Course Fee</td>
          <td style="text-align: right;">${currencySymbol} ${parseFloat(inv.net_amount || inv.total_amount).toLocaleString()}</td>
        </tr>
      `}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">Total Fee: ${currencySymbol} ${parseFloat(inv.total_amount).toLocaleString()}</div>
    <div class="totals-row">Discount: ${currencySymbol} ${parseFloat(inv.discount_amount || 0).toLocaleString()}</div>
    <div class="totals-final">Net Payable: ${currencySymbol} ${parseFloat(inv.net_amount).toLocaleString()}</div>
  </div>
</body>
</html>
    `;

    fs.writeFileSync(filePath, contentHtml, 'utf8');

    // Update pdf_url in database if column exists
    await pool.query('UPDATE invoices SET pdf_url = ? WHERE id = ?', [`/uploads/invoices/${fileName}`, invoiceId]).catch(() => {});

    return { filePath, fileName, contentHtml };
  } catch (error) {
    console.error('Server-Side Invoice PDF Generation Error:', error.message);
    return null;
  }
};

module.exports = {
  generateInvoicePdfServerSide
};
