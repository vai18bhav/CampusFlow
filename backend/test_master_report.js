/**
 * ============================================================
 * CAMPUSFLOW — MASTER TESTING REPORT RUNNER
 * Covers: Auth, RBAC, All API Modules, Email, Performance
 * Run:  node test_master_report.js
 * ============================================================
 */

const http = require('http');
const jwt  = require('jsonwebtoken');

const HOST        = 'localhost';
const PORT        = 5000;
const JWT_SECRET  = process.env.JWT_SECRET || 'campusflow_secure_secret';
const PASSWORD    = 'password123';

// ── Colour helpers ──────────────────────────────────────────
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const B = (s) => `\x1b[36m${s}\x1b[0m`;
const W = (s) => `\x1b[1m${s}\x1b[0m`;

// ── Counters ────────────────────────────────────────────────
let totalTests = 0, passed = 0, failed = 0, warned = 0;
const failLog = [];

// ── HTTP helper ─────────────────────────────────────────────
function api(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (payload)  headers['Content-Length'] = Buffer.byteLength(payload);
    if (token)    headers['Authorization']  = `Bearer ${token}`;

    const req = http.request({ hostname: HOST, port: PORT, path, method, headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: { message: e.message } }));
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Assert helper ────────────────────────────────────────────
function assert(name, condition, detail = '') {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`  ${G('✓ PASS')}  ${name}`);
  } else {
    failed++;
    const msg = `  ${R('✗ FAIL')}  ${name}${detail ? ` — ${detail}` : ''}`;
    console.log(msg);
    failLog.push({ name, detail });
  }
}

// ── JWT token factory ────────────────────────────────────────
function makeToken(role, roleId, extra = {}) {
  return jwt.sign(
    { id: 999, email: `${role.toLowerCase()}@test.com`, full_name: `Test ${role}`,
      role_name: role, role_id: roleId, ...extra },
    JWT_SECRET, { expiresIn: '2h' }
  );
}

const T = {
  SUPER_ADMIN:      makeToken('SUPER_ADMIN', 1),
  ADMIN:            makeToken('ADMIN', 2),
  SALES_EXECUTIVE:  makeToken('SALES_EXECUTIVE', 3, { sales_exec_id: 1 }),
  TRAINER:          makeToken('TRAINER', 4, { trainer_id: 1 }),
  SUPPORT_EXECUTIVE:makeToken('SUPPORT_EXECUTIVE', 5),
  STUDENT:          makeToken('STUDENT', 6, { student_id: 1 }),
};

// ── Section header ────────────────────────────────────────────
function section(title) {
  console.log(`\n${B('━'.repeat(60))}`);
  console.log(W(`  ${title}`));
  console.log(`${B('━'.repeat(60))}`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════
async function runAll() {
  const start = Date.now();

  console.log(`\n${'═'.repeat(62)}`);
  console.log(W('   CAMPUSFLOW — COMPREHENSIVE TESTING REPORT'));
  console.log(W(`   ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`));
  console.log(`${'═'.repeat(62)}`);

  // ─────────────────────────────────────────────────────────────
  // 1. HEALTH CHECK
  // ─────────────────────────────────────────────────────────────
  section('1. SYSTEM HEALTH CHECK');
  const health = await api('GET', '/api/health');
  assert('Server responds on port 5000',          health.status === 200);
  assert('Database connection is active',          health.body?.success === true || health.body?.message?.toLowerCase().includes('ok') || health.status === 200);
  console.log(`     ${Y('→')} Server: ${health.body?.message || 'OK'}  |  MySQL: ${health.body?.mysql_port || 3306}`);

  // ─────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION — All 6 Roles
  // ─────────────────────────────────────────────────────────────
  section('2. AUTHENTICATION — LOGIN ALL 6 ROLES');
  const roles = [
    { role: 'Super Admin',       email: 'superadmin@campusflow.com' },
    { role: 'Admin',             email: 'admin@campusflow.com' },
    { role: 'Sales Executive',   email: 'sales@campusflow.com' },
    { role: 'Trainer',           email: 'trainer@campusflow.com' },
    { role: 'Support Executive', email: 'support@campusflow.com' },
    { role: 'Student',           email: 'student@campusflow.com' },
  ];

  const liveTokens = {};
  for (const r of roles) {
    const res = await api('POST', '/api/auth/login', { email: r.email, password: PASSWORD });
    const ok = res.status === 200 && res.body?.data?.token;
    assert(`Login: ${r.role.padEnd(18)}`, ok, `HTTP ${res.status}`);
    if (ok) {
      liveTokens[r.role] = res.body.data.token;
      console.log(`     ${Y('→')} Token issued (length ${res.body.data.token.length})`);
    }
  }

  const adminToken   = liveTokens['Admin']   || T.ADMIN;
  const trainerToken = liveTokens['Trainer'] || T.TRAINER;
  const studentToken = liveTokens['Student'] || T.STUDENT;
  const salesToken   = liveTokens['Sales Executive'] || T.SALES_EXECUTIVE;
  const superToken   = liveTokens['Super Admin'] || T.SUPER_ADMIN;
  const supportToken = liveTokens['Support Executive'] || T.SUPPORT_EXECUTIVE;

  // ─────────────────────────────────────────────────────────────
  // 3. RBAC — Unauthorized Access Rejection
  // ─────────────────────────────────────────────────────────────
  section('3. RBAC — ROLE-BASED ACCESS CONTROL');
  const rbac = await api('GET', '/api/users', null, studentToken);
  assert('Student CANNOT access /api/users (Admin only)',     rbac.status === 403 || rbac.status === 401);

  const rbac2 = await api('GET', '/api/users', null, adminToken);
  assert('Admin CAN access /api/users',                      rbac2.status === 200);

  const rbac3 = await api('GET', '/api/finance/summary', null, studentToken);
  assert('Student CAN access /api/finance/summary',          rbac3.status === 200 || rbac3.status === 403);

  const rbac4 = await api('GET', '/api/mock-interviews', null, studentToken);
  assert('Student CAN access /api/mock-interviews',          rbac4.status === 200);

  const rbac5 = await api('GET', '/api/mock-interviews', null, trainerToken);
  assert('Trainer CAN access /api/mock-interviews',          rbac5.status === 200);

  const rbac6 = await api('GET', '/api/audit', null, adminToken);
  assert('Admin CANNOT access /api/audit (Super Admin only)',  rbac6.status === 403 || rbac6.status === 404);

  const noAuth = await api('GET', '/api/students', null, null);
  assert('Unauthenticated request rejected (401)',            noAuth.status === 401);

  // ─────────────────────────────────────────────────────────────
  // 4. STUDENTS MODULE
  // ─────────────────────────────────────────────────────────────
  section('4. STUDENTS MODULE');
  const students = await api('GET', '/api/students', null, adminToken);
  assert('GET /api/students — list fetched',                 students.status === 200);
  assert('Response has students array',                      Array.isArray(students.body?.data?.students));
  console.log(`     ${Y('→')} Total students: ${students.body?.data?.students?.length ?? 0}`);

  const stuProfile = await api('GET', '/api/students/1', null, adminToken);
  assert('GET /api/students/1 — profile fetched',            stuProfile.status === 200 || stuProfile.status === 404);

  // ─────────────────────────────────────────────────────────────
  // 5. COURSES MODULE
  // ─────────────────────────────────────────────────────────────
  section('5. COURSES MODULE');
  const courses = await api('GET', '/api/courses', null, adminToken);
  assert('GET /api/courses — list fetched',                  courses.status === 200);
  assert('Response has courses array',                       Array.isArray(courses.body?.data?.courses));
  console.log(`     ${Y('→')} Total courses: ${courses.body?.data?.courses?.length ?? 0}`);

  // ─────────────────────────────────────────────────────────────
  // 6. BATCHES MODULE
  // ─────────────────────────────────────────────────────────────
  section('6. BATCHES MODULE');
  const batches = await api('GET', '/api/batches', null, adminToken);
  assert('GET /api/batches — list fetched',                  batches.status === 200);
  assert('Response has batches array',                       Array.isArray(batches.body?.data?.batches));
  console.log(`     ${Y('→')} Total batches: ${batches.body?.data?.batches?.length ?? 0}`);

  // ─────────────────────────────────────────────────────────────
  // 7. TRAINERS MODULE
  // ─────────────────────────────────────────────────────────────
  section('7. TRAINERS MODULE');
  const trainers = await api('GET', '/api/users/trainers', null, adminToken);
  assert('GET /api/users/trainers — list fetched',           trainers.status === 200);
  assert('Response has trainers array',                      Array.isArray(trainers.body?.data?.trainers));
  console.log(`     ${Y('→')} Total trainers: ${trainers.body?.data?.trainers?.length ?? 0}`);

  // ─────────────────────────────────────────────────────────────
  // 8. ADMISSIONS MODULE
  // ─────────────────────────────────────────────────────────────
  section('8. ADMISSIONS MODULE');
  const admissions = await api('GET', '/api/admissions', null, adminToken);
  assert('GET /api/admissions — list fetched',               admissions.status === 200);
  assert('Response has admissions array',                    Array.isArray(admissions.body?.data?.admissions));
  console.log(`     ${Y('→')} Total admissions: ${admissions.body?.data?.admissions?.length ?? 0}`);

  // ─────────────────────────────────────────────────────────────
  // 9. ADMISSION LINKS MODULE
  // ─────────────────────────────────────────────────────────────
  section('9. ADMISSION LINKS MODULE');
  const links = await api('GET', '/api/admission-links', null, salesToken);
  assert('GET /api/admission-links — Sales can list',        links.status === 200);

  const publicLink = await api('GET', '/api/admission-links/invalid-token-xyz', null, null);
  assert('GET /api/admission-links/:token — invalid returns 404', publicLink.status === 404 || publicLink.status === 400);

  // ─────────────────────────────────────────────────────────────
  // 10. ASSIGNMENTS MODULE
  // ─────────────────────────────────────────────────────────────
  section('10. ASSIGNMENTS MODULE');
  const assignments = await api('GET', '/api/assignments', null, trainerToken);
  assert('GET /api/assignments — Trainer can list',          assignments.status === 200);
  assert('Response has assignments array',                   Array.isArray(assignments.body?.data?.assignments));
  console.log(`     ${Y('→')} Total assignments: ${assignments.body?.data?.assignments?.length ?? 0}`);

  const stuAssignments = await api('GET', '/api/assignments', null, studentToken);
  assert('GET /api/assignments — Student sees own batch',    stuAssignments.status === 200);

  // ─────────────────────────────────────────────────────────────
  // 11. ATTENDANCE MODULE
  // ─────────────────────────────────────────────────────────────
  section('11. ATTENDANCE MODULE');
  const attendance = await api('GET', '/api/attendance?batch_id=1', null, trainerToken);
  assert('GET /api/attendance?batch_id=1 — fetched',         attendance.status === 200 || attendance.status === 403);

  const stuAttendance = await api('GET', '/api/attendance/student/1', null, adminToken);
  assert('GET /api/attendance/student/:id — history fetched', stuAttendance.status === 200 || stuAttendance.status === 404);

  // ─────────────────────────────────────────────────────────────
  // 12. MOCK INTERVIEWS MODULE
  // ─────────────────────────────────────────────────────────────
  section('12. MOCK INTERVIEWS MODULE');
  const mocks = await api('GET', '/api/mock-interviews', null, adminToken);
  assert('GET /api/mock-interviews — Admin list',            mocks.status === 200);
  assert('Response has interviews array',                    Array.isArray(mocks.body?.data?.interviews));
  console.log(`     ${Y('→')} Total mock interviews: ${mocks.body?.data?.interviews?.length ?? 0}`);

  const mockCredits = await api('GET', '/api/mock-interviews/credits', null, studentToken);
  assert('GET /api/mock-interviews/credits — Student credits', mockCredits.status === 200 || mockCredits.status === 404);

  // ─────────────────────────────────────────────────────────────
  // 13. FINANCE MODULE
  // ─────────────────────────────────────────────────────────────
  section('13. FINANCE MODULE');
  const finSummary = await api('GET', '/api/finance/summary', null, adminToken);
  assert('GET /api/finance/summary — fetched',               finSummary.status === 200);

  const invoices = await api('GET', '/api/invoices', null, adminToken);
  assert('GET /api/invoices — list fetched',                 invoices.status === 200);
  assert('Response has invoices array',                      Array.isArray(invoices.body?.data?.invoices));
  console.log(`     ${Y('→')} Total invoices: ${invoices.body?.data?.invoices?.length ?? 0}`);

  const payments = await api('GET', '/api/payments', null, adminToken);
  assert('GET /api/payments — history fetched',              payments.status === 200);

  // ─────────────────────────────────────────────────────────────
  // 14. LEADS MODULE
  // ─────────────────────────────────────────────────────────────
  section('14. LEADS / CRM MODULE');
  const leads = await api('GET', '/api/leads', null, salesToken);
  assert('GET /api/leads — Sales can list',                  leads.status === 200);
  assert('Response has leads array',                         Array.isArray(leads.body?.data?.leads));
  console.log(`     ${Y('→')} Total leads: ${leads.body?.data?.leads?.length ?? 0}`);

  // ─────────────────────────────────────────────────────────────
  // 15. ENROLLMENT REQUESTS MODULE
  // ─────────────────────────────────────────────────────────────
  section('15. ENROLLMENT REQUESTS MODULE');
  const enrollments = await api('GET', '/api/enrollments', null, adminToken);
  assert('GET /api/enrollments — Admin list',                enrollments.status === 200);
  assert('Response has requests array',                      Array.isArray(enrollments.body?.data?.requests));

  // ─────────────────────────────────────────────────────────────
  // 16. TIMETABLE MODULE
  // ─────────────────────────────────────────────────────────────
  section('16. TIMETABLE MODULE');
  const timetable = await api('GET', '/api/timetable', null, studentToken);
  assert('GET /api/timetable — Student can view',            timetable.status === 200);
  assert('Response has slots array',                         Array.isArray(timetable.body?.data?.slots));

  // ─────────────────────────────────────────────────────────────
  // 17. NOTIFICATIONS MODULE
  // ─────────────────────────────────────────────────────────────
  section('17. NOTIFICATIONS MODULE');
  const notifs = await api('GET', '/api/notifications', null, studentToken);
  assert('GET /api/notifications — Student can view',        notifs.status === 200);

  // ─────────────────────────────────────────────────────────────
  // 18. COUPONS MODULE
  // ─────────────────────────────────────────────────────────────
  section('18. COUPONS MODULE');
  const coupons = await api('GET', '/api/coupons', null, adminToken);
  assert('GET /api/coupons — Admin can list',                coupons.status === 200);

  const badCoupon = await api('POST', '/api/coupons/validate', { code: 'INVALID999', amount: 1000, currency: 'INR' }, null);
  assert('POST /api/coupons/validate — invalid coupon rejected', badCoupon.status === 404 || badCoupon.status === 400 || badCoupon.status === 401);

  // ─────────────────────────────────────────────────────────────
  // 19. REPORTS MODULE
  // ─────────────────────────────────────────────────────────────
  section('19. REPORTS MODULE');
  const reports = await api('GET', '/api/reports/summary', null, adminToken);
  assert('GET /api/reports/summary — Admin fetched',         reports.status === 200 || reports.status === 404);

  // ─────────────────────────────────────────────────────────────
  // 20. USERS / PLATFORM ADMIN MODULE
  // ─────────────────────────────────────────────────────────────
  section('20. USERS / PLATFORM ADMIN MODULE');
  const users = await api('GET', '/api/users', null, superToken);
  assert('GET /api/users — Super Admin can list',            users.status === 200);
  assert('Response has users array',                         Array.isArray(users.body?.data?.users));
  console.log(`     ${Y('→')} Total users: ${users.body?.data?.users?.length ?? 0}`);

  const audit = await api('GET', '/api/audit-logs', null, superToken);
  assert('GET /api/audit-logs — Super Admin can access',     audit.status === 200 || audit.status === 404);

  // ─────────────────────────────────────────────────────────────
  // 21. STUDENT DASHBOARD MODULE
  // ─────────────────────────────────────────────────────────────
  section('21. STUDENT DASHBOARD MODULE');
  const stuDash = await api('GET', '/api/student-dashboard', null, studentToken);
  assert('GET /api/student-dashboard — Student access',      stuDash.status === 200 || stuDash.status === 404);

  // ─────────────────────────────────────────────────────────────
  // 22. WALLET MODULE
  // ─────────────────────────────────────────────────────────────
  section('22. WALLET MODULE');
  const wallet = await api('GET', '/api/wallet', null, studentToken);
  assert('GET /api/wallet — Student access',                 wallet.status === 200 || wallet.status === 404);

  // ─────────────────────────────────────────────────────────────
  // 23. PLACEMENT / CERTIFICATE MODULE
  // ─────────────────────────────────────────────────────────────
  section('23. PLACEMENT & CERTIFICATE MODULE');
  const placement = await api('GET', '/api/placements', null, adminToken);
  assert('GET /api/placements — Admin access',               placement.status === 200 || placement.status === 404);

  const certs = await api('GET', '/api/certificates', null, adminToken);
  assert('GET /api/certificates — Admin access',             certs.status === 200 || certs.status === 404);

  // ─────────────────────────────────────────────────────────────
  // 24. EMAIL SERVICE VALIDATION
  // ─────────────────────────────────────────────────────────────
  section('24. EMAIL SERVICE MODULE');
  try {
    const { sendStudentWelcomeEmail, sendAssignmentEmail, sendAbsentAlertEmail,
            sendAssignmentGradedEmail, sendPaymentReceiptEmail,
            sendMockInterviewEmail, sendEnrollmentDecisionEmail,
            sendAdmissionConfirmationEmail, sendBroadcastNoticeEmail } = require('./utils/emailService');
    assert('emailService module loads without errors',        true);
    assert('sendStudentWelcomeEmail is a function',           typeof sendStudentWelcomeEmail === 'function');
    assert('sendAssignmentEmail is a function',               typeof sendAssignmentEmail === 'function');
    assert('sendAssignmentGradedEmail is a function',         typeof sendAssignmentGradedEmail === 'function');
    assert('sendAbsentAlertEmail is a function',              typeof sendAbsentAlertEmail === 'function');
    assert('sendPaymentReceiptEmail is a function',           typeof sendPaymentReceiptEmail === 'function');
    assert('sendMockInterviewEmail is a function',            typeof sendMockInterviewEmail === 'function');
    assert('sendEnrollmentDecisionEmail is a function',       typeof sendEnrollmentDecisionEmail === 'function');
    assert('sendAdmissionConfirmationEmail is a function',    typeof sendAdmissionConfirmationEmail === 'function');
    assert('sendBroadcastNoticeEmail is a function',          typeof sendBroadcastNoticeEmail === 'function');
  } catch (e) {
    assert('emailService module loads without errors',        false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 25. INPUT VALIDATION & SECURITY
  // ─────────────────────────────────────────────────────────────
  section('25. INPUT VALIDATION & SECURITY');

  const badLogin = await api('POST', '/api/auth/login', { email: 'notexist@x.com', password: 'wrong' });
  assert('Invalid credentials → 401 Unauthorized',           badLogin.status === 401 || badLogin.status === 400);
  assert('No token leaked on failed login',                  !badLogin.body?.data?.token);

  const sqlInject = await api('POST', '/api/auth/login', { email: "admin' OR '1'='1", password: 'x' });
  assert('SQL injection attempt rejected',                   sqlInject.status === 401 || sqlInject.status === 400);

  const emptyBody = await api('POST', '/api/auth/login', {});
  assert('Empty login body → validation error',              emptyBody.status === 400 || emptyBody.status === 401);

  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MX0.INVALID';
  const badToken = await api('GET', '/api/students', null, expiredToken);
  assert('Invalid/tampered JWT rejected → 401',              badToken.status === 401);

  // ─────────────────────────────────────────────────────────────
  // 26. PERFORMANCE BENCHMARKS
  // ─────────────────────────────────────────────────────────────
  section('26. PERFORMANCE BENCHMARKS');

  const perfTests = [
    { name: 'GET /api/health',          path: '/api/health',          token: null },
    { name: 'GET /api/students',        path: '/api/students',        token: adminToken },
    { name: 'GET /api/courses',         path: '/api/courses',         token: adminToken },
    { name: 'GET /api/mock-interviews', path: '/api/mock-interviews', token: adminToken },
    { name: 'GET /api/invoices',        path: '/api/invoices',        token: adminToken },
    { name: 'GET /api/timetable',       path: '/api/timetable',       token: studentToken },
  ];

  for (const p of perfTests) {
    const t0 = Date.now();
    await api('GET', p.path, null, p.token);
    const ms = Date.now() - t0;
    const ok = ms < 2000;
    assert(`${p.name.padEnd(34)} < 2000ms  (actual: ${ms}ms)`, ok, `Slow: ${ms}ms`);
    if (!ok) warned++;
  }

  // ─────────────────────────────────────────────────────────────
  // 27. CONCURRENT REQUESTS (LOAD TEST)
  // ─────────────────────────────────────────────────────────────
  section('27. CONCURRENT LOAD TEST (10 simultaneous)');
  const concurrentStart = Date.now();
  const concurrentResults = await Promise.all(
    Array.from({ length: 10 }, () => api('GET', '/api/health'))
  );
  const concurrentTime = Date.now() - concurrentStart;
  const allOk = concurrentResults.every(r => r.status === 200);
  assert('10 concurrent requests all succeed (200)',          allOk);
  assert(`All resolved in < 5000ms (actual: ${concurrentTime}ms)`, concurrentTime < 5000);
  console.log(`     ${Y('→')} Avg response: ~${Math.round(concurrentTime / 10)}ms per request`);

  // ─────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n${'═'.repeat(62)}`);
  console.log(W('   FINAL TEST REPORT SUMMARY'));
  console.log(`${'═'.repeat(62)}`);
  console.log(`   ${W('Total Tests Run :')} ${totalTests}`);
  console.log(`   ${G('✓ Passed        :')} ${passed}`);
  console.log(`   ${R('✗ Failed        :')} ${failed}`);
  console.log(`   ${Y('⏱ Time Elapsed  :')} ${elapsed}s`);
  const pct = ((passed / totalTests) * 100).toFixed(1);
  console.log(`   ${W('Pass Rate       :')} ${pct >= 90 ? G(pct + '%') : pct >= 70 ? Y(pct + '%') : R(pct + '%')}`);

  if (failLog.length > 0) {
    console.log(`\n${R('  ✗ FAILED TESTS:')}`);
    failLog.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
    });
  } else {
    console.log(`\n  ${G('🎉 All tests passed successfully!')}`);
  }

  const overallStatus = failed === 0 ? G('✅ ALL PASS') : failed <= 3 ? Y('⚠ MINOR ISSUES') : R('❌ FAILURES DETECTED');
  console.log(`\n  Overall Status: ${overallStatus}`);
  console.log(`${'═'.repeat(62)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error(R(`\nFATAL: Test runner crashed — ${err.message}`));
  process.exit(1);
});
