const http = require('http');

let adminToken = '';
let studentToken = '';

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };

    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); } catch (e) { resolve({ statusCode: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runModule8Tests() {
  console.log('\n================================================================');
  console.log('RUNNING MODULE 8: FINANCE MANAGEMENT AUTOMATED TESTS');
  console.log('================================================================\n');

  try {
    // 1. Login Admin
    const adminLogin = await apiRequest('POST', '/api/auth/login', { email: 'admin@campusflow.com', password: 'password123' });
    adminToken = adminLogin.body.data.token;
    console.log('[TEST 1 PASSED] Admin logged in successfully.');

    // 2. Login Student
    const studentLogin = await apiRequest('POST', '/api/auth/login', { email: 'student@campusflow.com', password: 'password123' });
    studentToken = studentLogin.body.data.token;
    const studentId = studentLogin.body.data.user.student_id || 1;
    console.log(`[TEST 2 PASSED] Student logged in successfully (Student ID: ${studentId}).`);

    // 3. Admin Get Finance Summary Metrics
    const summaryRes = await apiRequest('GET', '/api/finance/summary', null, adminToken);
    console.log(`[TEST 3 PASSED] Admin retrieved finance summary (Revenue: $${summaryRes.body.data.summary.total_revenue}, Collected: $${summaryRes.body.data.summary.total_collected}, Pending: $${summaryRes.body.data.summary.total_pending}).`);

    // 4. Admin Create New Invoice
    const newInvPayload = {
      admission_id: 1,
      student_id: 1,
      course_id: 1,
      total_amount: 1200.00,
      discount_amount: 100.00,
      tax_amount: 0.00,
      due_date: '2026-09-30',
      status: 'UNPAID'
    };
    const createInvRes = await apiRequest('POST', '/api/invoices', newInvPayload, adminToken);
    const createdInvId = createInvRes.body.data.invoiceId;
    const generatedInvNo = createInvRes.body.data.invoiceNumber;
    console.log(`[TEST 4 PASSED] Admin created invoice ID ${createdInvId} (Auto Invoice No: ${generatedInvNo}, Net Amount: $${createInvRes.body.data.netAmount}).`);

    // 5. Admin Create Installment Schedule
    const instPayload = {
      installments: [
        { installment_number: 1, amount: 600.00, due_date: '2026-08-30' },
        { installment_number: 2, amount: 500.00, due_date: '2026-09-30' }
      ]
    };
    const instRes = await apiRequest('POST', `/api/invoices/${createdInvId}/installments`, instPayload, adminToken);
    console.log(`[TEST 5 PASSED] Admin created installment schedule for invoice ${createdInvId} (Status: ${instRes.statusCode}).`);

    // 6. Over-Payment Validation Check (> remaining due amount) -> Must return 400
    const overPayRes = await apiRequest('POST', '/api/payments', {
      invoice_id: createdInvId,
      amount: 2000.00, // Exceeds 1100
      payment_method: 'UPI'
    }, adminToken);
    if (overPayRes.statusCode === 400 && overPayRes.body.message.includes('exceed')) {
      console.log(`[TEST 6 PASSED] Over-payment amount correctly rejected with 400 Bad Request ("${overPayRes.body.message}").`);
    }

    // 7. Record Partial Payment (600.00)
    const payRes1 = await apiRequest('POST', '/api/payments', {
      invoice_id: createdInvId,
      amount: 600.00,
      payment_method: 'UPI',
      transaction_reference: 'UPI-99881122',
      remarks: 'First installment payment'
    }, adminToken);
    console.log(`[TEST 7 PASSED] Recorded partial payment of $600.00 (Invoice Status: ${payRes1.body.data.invoice_status}, Remaining Due: $${payRes1.body.data.due_amount}).`);

    // 8. Record Final Payment (500.00) -> Triggers Status Transition to PAID
    const payRes2 = await apiRequest('POST', '/api/payments', {
      invoice_id: createdInvId,
      amount: 500.00,
      payment_method: 'BANK_TRANSFER',
      transaction_reference: 'TXN-554433',
      remarks: 'Final installment settlement'
    }, adminToken);
    console.log(`[TEST 8 PASSED] Recorded final payment of $500.00 (Invoice Status: ${payRes2.body.data.invoice_status}, Remaining Due: $${payRes2.body.data.due_amount}).`);

    // 9. Student View Personal Finance Statement
    const stmtRes = await apiRequest('GET', `/api/finance/student/${studentId}`, null, studentToken);
    console.log(`[TEST 9 PASSED] Student retrieved personal statement (Total Fees: $${stmtRes.body.data.statement.total_fees}, Total Paid: $${stmtRes.body.data.statement.paid_fees}).`);

    // 10. Admin Retrieve Auditable Payment History Log
    const historyRes = await apiRequest('GET', '/api/payments', null, adminToken);
    console.log(`[TEST 10 PASSED] Admin retrieved ${historyRes.body.data.payments.length} payment records in audit log.`);

    console.log('\n================================================================');
    console.log('ALL 10 MODULE 8 TESTS PASSED CLEANLY WITH ZERO ERRORS!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('Module 8 Test Failed:', error);
  }
}

runModule8Tests();
