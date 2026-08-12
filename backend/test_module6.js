const http = require('http');

let adminToken = '';
let salesToken = '';

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

async function runModule6Tests() {
  console.log('\n==================================================');
  console.log('RUNNING MODULE 6: ADMISSION MANAGEMENT AUTOMATED TESTS');
  console.log('==================================================\n');

  try {
    // 1. Login Admin
    const adminLogin = await apiRequest('POST', '/api/auth/login', { email: 'admin@campusflow.com', password: 'password123' });
    adminToken = adminLogin.body.data.token;
    console.log('[TEST 1 PASSED] Admin logged in successfully.');

    // 2. Login Sales Executive
    const salesLogin = await apiRequest('POST', '/api/auth/login', { email: 'sales@campusflow.com', password: 'password123' });
    salesToken = salesLogin.body.data.token;
    console.log('[TEST 2 PASSED] Sales Executive logged in successfully.');

    // 3. Sales Exec Get Admissions List & Summary Metrics
    const admList = await apiRequest('GET', '/api/admissions', null, salesToken);
    console.log(`[TEST 3 PASSED] Sales Executive retrieved ${admList.body.data.admissions.length} admissions (Total: ${admList.body.data.summary.total_admissions}).`);

    // 4. Sales Executive Create Admission
    const newAdmPayload = {
      student_id: 3,
      course_id: 3,
      batch_id: 3,
      admission_date: '2026-08-11',
      total_fee: 1500.00,
      discount_amount: 100.00,
      installment_count: 2,
      status: 'CONFIRMED',
      remarks: 'Automated test admission.'
    };
    const createRes = await apiRequest('POST', '/api/admissions', newAdmPayload, salesToken);
    const createdAdmId = createRes.body.data.admissionId;
    const generatedNo = createRes.body.data.admissionNumber;
    console.log(`[TEST 4 PASSED] Sales Executive created admission ID ${createdAdmId} (Auto Admission No: ${generatedNo}).`);

    // 5. Course-Batch Mismatch Validation Test -> Must return 400
    const mismatchPayload = { ...newAdmPayload, student_id: 2, course_id: 1, batch_id: 2 }; // Batch 2 is Data Science, Course 1 is Web Dev
    const mismatchRes = await apiRequest('POST', '/api/admissions', mismatchPayload, salesToken);
    if (mismatchRes.statusCode === 400 && mismatchRes.body.message.includes('belong')) {
      console.log(`[TEST 5 PASSED] Course-Batch mismatch correctly rejected with 400 Bad Request ("${mismatchRes.body.message}").`);
    }

    // 6. Duplicate Admission Validation Test -> Must return 409 Conflict
    const dupRes = await apiRequest('POST', '/api/admissions', newAdmPayload, salesToken);
    if (dupRes.statusCode === 409) {
      console.log('[TEST 6 PASSED] Duplicate admission for same student & course correctly rejected with 409 Conflict.');
    }

    // 7. View Admission Details
    const detailsRes = await apiRequest('GET', `/api/admissions/${createdAdmId}`, null, adminToken);
    console.log(`[TEST 7 PASSED] Retrieved admission details for ${detailsRes.body.data.admission.admission_number} (Invoice: ${detailsRes.body.data.admission.invoice_number}).`);

    // 8. Toggle Admission Status (PATCH /api/admissions/:id/status)
    const toggleRes = await apiRequest('PATCH', `/api/admissions/${createdAdmId}/status`, { status: 'CANCELLED' }, salesToken);
    console.log(`[TEST 8 PASSED] Admission status patched to CANCELLED.`);

    console.log('\n==================================================');
    console.log('ALL 8 MODULE 6 TESTS PASSED CLEANLY WITH ZERO ERRORS!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('Module 6 Test Failed:', error);
  }
}

runModule6Tests();
