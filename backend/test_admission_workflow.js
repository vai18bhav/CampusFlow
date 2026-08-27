/**
 * Test Admission Registration Workflow End-to-End
 */

const mysql = require('mysql2/promise');
const { generateToken } = require('./utils/jwtHelper');
const app = require('./app');
const http = require('http');
const pool = require('./config/db');

function request(server, method, path, token, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5003,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runE2E() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(5003, r));
  console.log('🚀 E2E Admission Workflow Test Server running on port 5003\n');

  try {
    // Get existing Super Admin and Sales Exec IDs from DB
    const [salesUsers] = await pool.query('SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "SALES_EXECUTIVE" LIMIT 1');
    const [adminUsers] = await pool.query('SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "SUPER_ADMIN" LIMIT 1');

    const salesUserId = salesUsers[0]?.id || 1;
    const adminUserId = adminUsers[0]?.id || 1;

    const salesToken = generateToken({ userId: salesUserId });
    const adminToken = generateToken({ userId: adminUserId });

    // 1. Sales Executive generates Admission Link
    console.log('Step 1: Sales Executive generates Admission Link...');
    const linkRes = await request(server, 'POST', '/api/admission-links', salesToken, {
      course_id: 1,
      currency: 'INR',
      expires_in_days: 30
    });
    console.log('  Status:', linkRes.status, '| Token:', linkRes.data?.data?.token);
    const token = linkRes.data?.data?.token;
    if (!token) throw new Error(`Failed to generate link token: ${JSON.stringify(linkRes.data)}`);

    // 2. Student opens link
    console.log('\nStep 2: Prospective student opens public link...');
    const infoRes = await request(server, 'GET', `/api/admission-links/${token}`, null);
    console.log('  Status:', infoRes.status, '| Course:', infoRes.data?.data?.link?.course_name);

    // 3. Student validates coupon
    console.log('\nStep 3: Student validates coupon code...');
    const couponRes = await request(server, 'POST', '/api/coupons/validate', null, {
      code: 'WELCOME10',
      amount: 50000,
      currency: 'INR'
    });
    console.log('  Status:', couponRes.status, '| Discount:', couponRes.data?.data?.discount_amount || 'None/Invalid');

    // 4. Student submits admission form
    const studentEmail = `e2e_student_${Date.now()}@test.com`;
    console.log('\nStep 4: Student submits admission form...');
    const submitRes = await request(server, 'POST', `/api/admission-links/${token}/submit`, null, {
      full_name: 'E2E Test Student',
      email: studentEmail,
      phone: '+919999888777',
      dob: '2000-01-15',
      gender: 'MALE',
      address: '123 Test Street',
      course_id: 1,
      currency: 'INR',
      message: 'Excited to join!'
    });
    console.log('  Status:', submitRes.status, '| Msg:', submitRes.data?.message);
    const admissionNumber = submitRes.data?.data?.admissionNumber;

    // 5. Admin retrieves pending admissions
    console.log('\nStep 5: Admin retrieves pending admissions list...');
    const pendingRes = await request(server, 'GET', '/api/admissions?status=SUBMITTED', adminToken);
    console.log('  Status:', pendingRes.status, '| Total Pending:', pendingRes.data?.data?.admissions?.length || 0);
    const pendingTarget = pendingRes.data?.data?.admissions?.find(a => a.admission_number === admissionNumber);
    const admissionId = pendingTarget?.id;

    if (!admissionId) throw new Error(`Submitted admission ${admissionNumber} not found in pending list`);

    // 6. Admin approves admission application
    console.log(`\nStep 6: Admin approves admission ID ${admissionId}...`);
    const approveRes = await request(server, 'PATCH', `/api/admissions/${admissionId}/approve`, adminToken, {
      batch_id: 1,
      new_password: 'StudentPass123!',
      installment_count: 2,
      mock_interview_credits: 5,
      mock_credit_expiry: '2026-12-31'
    });
    console.log('  Status:', approveRes.status, '| Net Payable:', approveRes.data?.data?.netPayable, '| Invoice:', approveRes.data?.data?.invoiceNumber);

    // 7. Approved student logs in
    console.log('\nStep 7: Student logs in with approved credentials...');
    const loginRes = await request(server, 'POST', '/api/auth/login', null, {
      email: studentEmail,
      password: 'StudentPass123!'
    });
    console.log('  Status:', loginRes.status, '| Role:', loginRes.data?.data?.user?.role_name);
    const studentAuthToken = loginRes.data?.data?.token;
    if (!studentAuthToken) throw new Error('Student login failed after approval');

    // 8. Student accesses their dashboard
    console.log('\nStep 8: Student fetches their personal dashboard metrics...');
    const dashRes = await request(server, 'GET', '/api/student/dashboard', studentAuthToken);
    console.log('  Status:', dashRes.status);
    console.log('  Student Roll No:', dashRes.data?.data?.student?.student_code);
    console.log('  Course:', dashRes.data?.data?.student?.course_name);
    console.log('  Batch:', dashRes.data?.data?.student?.batch_name);
    console.log('  Trainer:', dashRes.data?.data?.student?.trainer_name || 'Assigned');
    console.log('  Mock Credits:', dashRes.data?.data?.student?.mock_interview_credits);
    console.log('  Finance Status:', dashRes.data?.data?.finance?.status);

    console.log('\n🎉 ALL E2E STEPS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ E2E Test Error:', err.message);
  } finally {
    server.close(() => process.exit(0));
  }
}

runE2E();
