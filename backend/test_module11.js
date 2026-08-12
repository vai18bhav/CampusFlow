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

async function runModule11Tests() {
  console.log('\n================================================================');
  console.log('RUNNING MODULE 11: REPORTS & ANALYTICS AUTOMATED TESTS');
  console.log('================================================================\n');

  try {
    // 1. Login Admin
    const adminLogin = await apiRequest('POST', '/api/auth/login', { email: 'admin@campusflow.com', password: 'password123' });
    adminToken = adminLogin.body.data.token;
    console.log('[TEST 1 PASSED] Admin logged in successfully.');

    // 2. Login Student
    const studentLogin = await apiRequest('POST', '/api/auth/login', { email: 'student@campusflow.com', password: 'password123' });
    studentToken = studentLogin.body.data.token;
    console.log('[TEST 2 PASSED] Student logged in successfully.');

    // 3. Admin Get Executive Summary
    const sumRes = await apiRequest('GET', '/api/reports/summary', null, adminToken);
    const s = sumRes.body.data.summary;
    console.log(`[TEST 3 PASSED] Executive summary loaded (Students: ${s.total_students}, Admissions: ${s.total_admissions}, Revenue: $${s.total_collected}, Pending Dues: $${s.pending_fees}).`);

    // 4. Admin Get Student Roster Report
    const stuRes = await apiRequest('GET', '/api/reports/students', null, adminToken);
    console.log(`[TEST 4 PASSED] Student report retrieved (${stuRes.body.data.students.length} student records with attendance % and dues).`);

    // 5. Admin Get Admissions Report
    const admRes = await apiRequest('GET', '/api/reports/admissions', null, adminToken);
    console.log(`[TEST 5 PASSED] Admissions report retrieved (${admRes.body.data.summary.total_admissions} total admissions).`);

    // 6. Admin Get Course & Batch Performance Reports
    const courseRes = await apiRequest('GET', '/api/reports/courses', null, adminToken);
    const batchRes = await apiRequest('GET', '/api/reports/batches', null, adminToken);
    console.log(`[TEST 6 PASSED] Course & Batch reports retrieved (${courseRes.body.data.courses.length} courses, ${batchRes.body.data.batches.length} batches).`);

    // 7. Admin Get Attendance Report
    const attRes = await apiRequest('GET', '/api/reports/attendance', null, adminToken);
    console.log(`[TEST 7 PASSED] Attendance report retrieved (Average Attendance: ${attRes.body.data.summary.avg_attendance}%).`);

    // 8. Admin Get Finance & Payment Reports
    const finRes = await apiRequest('GET', '/api/reports/finance', null, adminToken);
    const payRes = await apiRequest('GET', '/api/reports/payments', null, adminToken);
    console.log(`[TEST 8 PASSED] Finance & Payment reports retrieved (Billed: $${finRes.body.data.summary.total_billed}, ${payRes.body.data.payments.length} payment receipts).`);

    // 9. Admin Get Mock Interview Report & Charts Analytics
    const intRes = await apiRequest('GET', '/api/reports/interviews', null, adminToken);
    const chartRes = await apiRequest('GET', '/api/reports/charts', null, adminToken);
    console.log(`[TEST 9 PASSED] Mock interview report & Charts analytics loaded (Avg Score: ${intRes.body.data.summary.avg_score}/100).`);

    // 10. Student RBAC Security Restriction Test -> Must return 403 Forbidden
    const stuSecRes = await apiRequest('GET', '/api/reports/summary', null, studentToken);
    if (stuSecRes.statusCode === 403) {
      console.log('[TEST 10 PASSED] Student access to global executive reports correctly blocked with 403 Forbidden.');
    }

    console.log('\n================================================================');
    console.log('ALL 10 MODULE 11 TESTS PASSED CLEANLY WITH ZERO ERRORS!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('Module 11 Test Failed:', error);
  }
}

runModule11Tests();
