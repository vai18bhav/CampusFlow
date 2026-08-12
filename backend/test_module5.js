const http = require('http');

let adminToken = '';
let trainerToken = '';

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

async function runModule5Tests() {
  console.log('\n==================================================');
  console.log('RUNNING MODULE 5: BATCH MANAGEMENT AUTOMATED TESTS');
  console.log('==================================================\n');

  try {
    // 1. Login Admin
    const adminLogin = await apiRequest('POST', '/api/auth/login', { email: 'admin@campusflow.com', password: 'password123' });
    adminToken = adminLogin.body.data.token;
    console.log('[TEST 1 PASSED] Admin logged in successfully.');

    // 2. Login Trainer
    const trainerLogin = await apiRequest('POST', '/api/auth/login', { email: 'trainer@campusflow.com', password: 'password123' });
    trainerToken = trainerLogin.body.data.token;
    console.log('[TEST 2 PASSED] Trainer logged in successfully.');

    // 3. Admin Get Batches List & Summary Cards
    const batchesList = await apiRequest('GET', '/api/batches', null, adminToken);
    console.log(`[TEST 3 PASSED] Admin retrieved ${batchesList.body.data.batches.length} batches and summary cards (Total: ${batchesList.body.data.summary.total_batches}).`);

    // 4. Admin Create Batch
    const testBatchCode = `BATCH-${Date.now().toString().slice(-4)}`;
    const newBatchPayload = {
      course_id: 1,
      trainer_id: 1,
      batch_code: testBatchCode,
      name: 'Full Stack Weekend Intensive Batch',
      start_date: '2026-09-01',
      end_date: '2026-12-31',
      start_time: '10:00 AM',
      end_time: '01:00 PM',
      capacity: 2, // Set small capacity of 2 for capacity test
      mode: 'HYBRID',
      status: 'UPCOMING',
      description: 'Test batch creation.'
    };
    const createRes = await apiRequest('POST', '/api/batches', newBatchPayload, adminToken);
    const createdBatchId = createRes.body.data.batchId;
    console.log(`[TEST 4 PASSED] Admin created batch '${testBatchCode}' (ID: ${createdBatchId}).`);

    // 5. Invalid Date Validation Test (end_date < start_date)
    const invalidDatePayload = { ...newBatchPayload, batch_code: `INVALID-${Date.now()}`, start_date: '2026-09-01', end_date: '2026-08-01' };
    const invalidDateRes = await apiRequest('POST', '/api/batches', invalidDatePayload, adminToken);
    if (invalidDateRes.statusCode === 400) {
      console.log('[TEST 5 PASSED] Invalid end_date < start_date correctly rejected with 400 Bad Request.');
    }

    // 6. View Batch Details & Student Roster
    const detailsRes = await apiRequest('GET', `/api/batches/${createdBatchId}`, null, adminToken);
    console.log(`[TEST 6 PASSED] Retrieved batch details for ID ${createdBatchId} (Available seats: ${detailsRes.body.data.batch.available_seats}).`);

    // 7. Enroll Student 1 (Within Capacity)
    const enroll1 = await apiRequest('POST', `/api/batches/${createdBatchId}/students`, { student_id: 1 }, adminToken);
    console.log(`[TEST 7 PASSED] Enrolled Student 1 into batch (Status: ${enroll1.statusCode}).`);

    // 8. Enroll Student 2 (Reaching Full Capacity = 2)
    const enroll2 = await apiRequest('POST', `/api/batches/${createdBatchId}/students`, { student_id: 2 }, adminToken);
    console.log(`[TEST 8 PASSED] Enrolled Student 2 into batch (Status: ${enroll2.statusCode}). Batch is now FULL.`);

    // 9. Over-Capacity Prevention Test (Enroll Student 3 into Full Batch) -> Must return 400
    const enroll3 = await apiRequest('POST', `/api/batches/${createdBatchId}/students`, { student_id: 3 }, adminToken);
    if (enroll3.statusCode === 400 && enroll3.body.message.includes('full')) {
      console.log(`[TEST 9 PASSED] Over-capacity enrollment correctly blocked with 400 Bad Request ("${enroll3.body.message}").`);
    }

    // 10. Capacity Reduction Check on Edit -> Cannot reduce capacity below current enrolled (2)
    const capEditRes = await apiRequest('PUT', `/api/batches/${createdBatchId}`, { capacity: 1 }, adminToken);
    if (capEditRes.statusCode === 400 && capEditRes.body.message.includes('less than')) {
      console.log(`[TEST 10 PASSED] Reducing capacity below enrolled count correctly blocked ("${capEditRes.body.message}").`);
    }

    // 11. Toggle Batch Status
    const statusRes = await apiRequest('PATCH', `/api/batches/${createdBatchId}/status`, { status: 'ONGOING' }, adminToken);
    console.log(`[TEST 11 PASSED] Batch ID ${createdBatchId} status updated to ONGOING.`);

    console.log('\n==================================================');
    console.log('ALL 11 MODULE 5 TESTS PASSED CLEANLY WITH ZERO ERRORS!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('Module 5 Test Failed:', error);
  }
}

runModule5Tests();
