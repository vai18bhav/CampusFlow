/**
 * RBAC Verification Script
 * Validates permission matrix for all 6 roles according to SRS Page 3.
 */

const jwt = require('jsonwebtoken');
const app = require('./app');
const http = require('http');

const JWT_SECRET = process.env.JWT_SECRET || 'campusflow_secure_secret';

function makeToken(roleName, roleId, extra = {}) {
  return jwt.sign(
    {
      id: 999,
      email: `${roleName.toLowerCase()}@test.com`,
      full_name: `Test ${roleName}`,
      role_name: roleName,
      role_id: roleId,
      ...extra
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const tokens = {
  SUPER_ADMIN: makeToken('SUPER_ADMIN', 1),
  ADMIN: makeToken('ADMIN', 2),
  SALES_EXECUTIVE: makeToken('SALES_EXECUTIVE', 3, { sales_exec_id: 1 }),
  TRAINER: makeToken('TRAINER', 4, { trainer_id: 1 }),
  SUPPORT_EXECUTIVE: makeToken('SUPPORT_EXECUTIVE', 5, { support_exec_id: 1 }),
  STUDENT: makeToken('STUDENT', 6, { student_id: 1 }),
};

function testEndpoint(server, method, path, token, body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, 'http://localhost:5002');
    const options = {
      hostname: 'localhost',
      port: 5002,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(5002, r));
  console.log('🧪 RBAC Test Server running on port 5002\n');

  const matrix = [
    // 1. User Management (Super Admin, Admin)
    { name: 'GET /api/users (User Management)', method: 'GET', path: '/api/users', allowed: ['SUPER_ADMIN', 'ADMIN'] },

    // 2. Create User / Staff (Super Admin, Admin)
    { name: 'POST /api/users (Create User)', method: 'POST', path: '/api/users', body: { full_name: 'T', email: 't@t.com', role_id: 3, password: '1' }, allowed: ['SUPER_ADMIN', 'ADMIN'] },

    // 3. Admin creating Super Admin (Blocked even for Admin)
    { name: 'POST /api/users (Admin creating Super Admin)', method: 'POST', path: '/api/users', body: { full_name: 'T', email: 'sa@t.com', role_id: 1, password: '1' }, allowed: ['SUPER_ADMIN'] },

    // 4. Coupon Listing (Super Admin, Admin, Sales Executive)
    { name: 'GET /api/coupons', method: 'GET', path: '/api/coupons', allowed: ['SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'] },

    // 5. Admission Creation (Super Admin, Admin, Sales Executive)
    { name: 'GET /api/admission-links', method: 'GET', path: '/api/admission-links', allowed: ['SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'] },

    // 6. Create Batch (Super Admin, Admin)
    { name: 'POST /api/batches', method: 'POST', path: '/api/batches', body: {}, allowed: ['SUPER_ADMIN', 'ADMIN'] },

    // 7. Mark Attendance (Super Admin, Admin, Trainer)
    { name: 'POST /api/attendance', method: 'POST', path: '/api/attendance', body: {}, allowed: ['SUPER_ADMIN', 'ADMIN', 'TRAINER'] },

    // 8. Schedule Mock Interview (All 6 roles)
    { name: 'POST /api/mock-interviews/request', method: 'POST', path: '/api/mock-interviews/request', body: {}, allowed: ['SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE', 'TRAINER', 'SUPPORT_EXECUTIVE', 'STUDENT'] },

    // 9. Mock Review / Accept / Reject (Super Admin, Admin, Trainer, Support Exec)
    { name: 'PATCH /api/mock-interviews/1/review', method: 'PATCH', path: '/api/mock-interviews/1/review', body: {}, allowed: ['SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SUPPORT_EXECUTIVE'] },

    // 10. Mock Delegate (Super Admin, Admin, Trainer)
    { name: 'POST /api/mock-interviews/1/delegate', method: 'POST', path: '/api/mock-interviews/1/delegate', body: {}, allowed: ['SUPER_ADMIN', 'ADMIN', 'TRAINER'] },

    // 11. Mock Feedback / Evaluate (Super Admin, Admin, Trainer, Support Exec)
    { name: 'PATCH /api/mock-interviews/1/evaluate', method: 'PATCH', path: '/api/mock-interviews/1/evaluate', body: {}, allowed: ['SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SUPPORT_EXECUTIVE'] },

    // 12. Create Assignment (Super Admin, Admin, Trainer)
    { name: 'POST /api/assignments', method: 'POST', path: '/api/assignments', body: {}, allowed: ['SUPER_ADMIN', 'ADMIN', 'TRAINER'] },

    // 13. Reports (Super Admin, Admin, Sales Exec)
    { name: 'GET /api/reports/finance', method: 'GET', path: '/api/reports/finance', allowed: ['SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'] },
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const item of matrix) {
    console.log(`\n📌 Testing: ${item.name}`);
    for (const [roleName, token] of Object.entries(tokens)) {
      const res = await testEndpoint(server, item.method, item.path, token, item.body);
      const isAllowedRole = item.allowed.includes(roleName);
      const isForbiddenStatus = res.status === 403;

      if (isAllowedRole && isForbiddenStatus) {
        console.log(`  ❌ ${roleName}: Expected Access, got 403 Forbidden`);
        failedCount++;
      } else if (!isAllowedRole && !isForbiddenStatus && res.status !== 401) {
        console.log(`  ❌ ${roleName}: Expected 403 Forbidden, got ${res.status}`);
        failedCount++;
      } else {
        console.log(`  ✅ ${roleName}: ${res.status} (${isAllowedRole ? 'Allowed' : '403 Forbidden'})`);
        passedCount++;
      }
    }
  }

  console.log(`\n==========================================`);
  console.log(`Summary: ${passedCount} tests passed, ${failedCount} failed.`);
  console.log(`==========================================\n`);

  server.close(() => process.exit(failedCount > 0 ? 1 : 0));
}

runTests();
