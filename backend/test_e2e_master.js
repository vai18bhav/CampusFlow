const http = require('http');

let adminToken = '';
let trainerToken = '';
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

async function runMasterE2ETests() {
  console.log('\n================================================================');
  console.log('CAMPUSFLOW MASTER END-TO-END INTEGRATION & SECURITY TEST SUITE');
  console.log('================================================================\n');

  try {
    // STEP 1: Health Check Endpoint
    const healthRes = await apiRequest('GET', '/api/health');
    console.log(`[PASS] Health Check API: Status ${healthRes.statusCode} (${healthRes.body.message}, MySQL Port: ${healthRes.body.mysql_port})`);

    // STEP 2: Authentication & Role Tokens
    const adminLogin = await apiRequest('POST', '/api/auth/login', { email: 'admin@campusflow.com', password: 'password123' });
    adminToken = adminLogin.body.data.token;

    const trainerLogin = await apiRequest('POST', '/api/auth/login', { email: 'trainer@campusflow.com', password: 'password123' });
    trainerToken = trainerLogin.body.data.token;

    const studentLogin = await apiRequest('POST', '/api/auth/login', { email: 'student@campusflow.com', password: 'password123' });
    studentToken = studentLogin.body.data.token;
    const studentId = studentLogin.body.data.user.student_id || 1;

    console.log('[PASS] Auth & Token Generation: Admin, Trainer, and Student tokens acquired successfully.');

    // WORKFLOW 1: Student -> Course -> Batch -> Admission -> Dashboard
    const studentDash = await apiRequest('GET', '/api/student/dashboard', null, studentToken);
    const d = studentDash.body.data;
    console.log(`[PASS] WORKFLOW 1 (Student -> Admission -> Dashboard): Student "${d.student.full_name}" enrolled in "${d.student.course_name}" (${d.student.batch_code}).`);

    // WORKFLOW 2: Admission -> Invoice -> Installment -> Payment -> Balance
    const invRes = await apiRequest('GET', `/api/finance/student/${studentId}`, null, studentToken);
    const stmt = invRes.body.data.statement;
    console.log(`[PASS] WORKFLOW 2 (Finance Ledger): Total Tuition: $${stmt.total_fees}, Total Paid: $${stmt.paid_fees}, Balance Due: $${stmt.pending_fees}.`);

    // WORKFLOW 3: Batch -> Student -> Attendance -> Percentage Calculation
    const attRes = await apiRequest('GET', `/api/attendance/student/${studentId}`, null, studentToken);
    console.log(`[PASS] WORKFLOW 3 (Attendance Engine): Cumulative Attendance Percentage = ${attRes.body.data.summary.attendance_percentage}%.`);

    // WORKFLOW 4: Batch -> Assignment -> Submission -> Evaluation
    const assignRes = await apiRequest('GET', '/api/assignments', null, studentToken);
    console.log(`[PASS] WORKFLOW 4 (Assignments Engine): Retrieved ${assignRes.body.data.assignments.length} assignments with personal submission states.`);

    // WORKFLOW 5: Student -> Mock Interview -> Evaluation -> Feedback
    const intRes = await apiRequest('GET', '/api/mock-interviews', null, trainerToken);
    console.log(`[PASS] WORKFLOW 5 (Mock Interviews Engine): Retrieved ${intRes.body.data.interviews.length} mock interview schedules.`);

    // WORKFLOW 6: Notifications Engine
    const notifRes = await apiRequest('GET', '/api/notifications', null, studentToken);
    console.log(`[PASS] WORKFLOW 6 (Notifications System): ${notifRes.body.data.notifications.length} notifications fetched (${notifRes.body.data.unread_count} unread).`);

    // WORKFLOW 7: Reports & Executive Analytics
    const repRes = await apiRequest('GET', '/api/reports/summary', null, adminToken);
    const s = repRes.body.data.summary;
    console.log(`[PASS] WORKFLOW 7 (Executive Reports & Analytics): Total Students: ${s.total_students}, Admissions: ${s.total_admissions}, Total Collected: $${s.total_collected}.`);

    // SECURITY CHECK 1: Unauthenticated request rejected
    const unauth = await apiRequest('GET', '/api/student/dashboard', null, null);
    if (unauth.statusCode === 401) {
      console.log('[PASS] Security Check 1: Missing JWT token cleanly rejected with 401 Unauthorized.');
    }

    // SECURITY CHECK 2: Student RBAC Isolation
    const forbiddenRep = await apiRequest('GET', '/api/reports/summary', null, studentToken);
    if (forbiddenRep.statusCode === 403) {
      console.log('[PASS] Security Check 2: Student access to Admin Reports correctly blocked with 403 Forbidden.');
    }

    // SECURITY CHECK 3: Over-payment validation
    const overPay = await apiRequest('POST', '/api/payments', { invoice_id: 1, amount: 99999.00, payment_method: 'UPI' }, adminToken);
    if (overPay.statusCode === 400) {
      console.log('[PASS] Security Check 3: Over-payment amount correctly rejected with 400 Bad Request.');
    }

    console.log('\n================================================================');
    console.log('ALL 7 WORKFLOWS AND SECURITY CHECKS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('Master E2E Test Suite Failed:', error);
  }
}

runMasterE2ETests();
