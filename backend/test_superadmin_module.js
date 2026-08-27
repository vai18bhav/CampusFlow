/**
 * Automated Verification Script for Super Admin Module (FR-001 to FR-007)
 */

const { generateToken } = require('./utils/jwtHelper');
const app = require('./app');
const http = require('http');
const pool = require('./config/db');

function request(server, method, path, token, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5004,
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

async function runSuperAdminTests() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(5004, r));
  console.log('🚀 Super Admin Module Test Server running on port 5004\n');

  let passed = 0;
  let failed = 0;

  try {
    const [superAdmins] = await pool.query('SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "SUPER_ADMIN" LIMIT 1');
    const [trainers] = await pool.query('SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "TRAINER" LIMIT 1');

    const saId = superAdmins[0]?.id || 1;
    const saToken = generateToken({ userId: saId });
    const trainerId = trainers[0]?.id || 2;
    const trainerToken = generateToken({ userId: trainerId });

    // ── Test FR-001: User Management & Password Reset ─────────────────────
    console.log('Testing FR-001: User Management & Password Reset...');
    const testEmail = `sa_test_user_${Date.now()}@test.com`;
    const createRes = await request(server, 'POST', '/api/users', saToken, {
      role_id: 3, // Sales Executive
      full_name: 'SuperAdmin Test User',
      email: testEmail,
      password: 'password123',
      phone: '+919999000111'
    });
    if (createRes.status === 201 || createRes.status === 200) {
      console.log('  ✅ User creation succeeded'); passed++;
    } else {
      console.log('  ❌ User creation failed:', createRes.status, createRes.data); failed++;
    }

    const newUserId = createRes.data?.data?.id || createRes.data?.id;

    // Filter users
    const filterRes = await request(server, 'GET', `/api/users?search=${encodeURIComponent('SuperAdmin Test User')}`, saToken);
    if (filterRes.status === 200 && filterRes.data?.data?.users?.length > 0) {
      console.log('  ✅ User filter and search succeeded'); passed++;
    } else {
      console.log('  ❌ User filter failed'); failed++;
    }

    // Password Reset (FR-001)
    if (newUserId) {
      const resetRes = await request(server, 'PATCH', `/api/users/${newUserId}/reset-password`, saToken, {
        new_password: 'NewSecurePassword123!'
      });
      if (resetRes.status === 200) {
        console.log('  ✅ Super Admin password reset succeeded'); passed++;
      } else {
        console.log('  ❌ Password reset failed:', resetRes.status); failed++;
      }
    }

    // ── Test FR-003: Platform Configuration ───────────────────────────────
    console.log('\nTesting FR-003: Platform Configuration...');
    const configGet = await request(server, 'GET', '/api/config', saToken);
    if (configGet.status === 200 && configGet.data?.data?.config?.app_name) {
      console.log('  ✅ Platform config GET succeeded | App:', configGet.data.data.config.app_name); passed++;
    } else {
      console.log('  ❌ Config GET failed'); failed++;
    }

    const configPut = await request(server, 'PUT', '/api/config', saToken, {
      settings: {
        app_name: 'CampusFlow Enterprise',
        default_currency: 'INR'
      }
    });
    if (configPut.status === 200) {
      console.log('  ✅ Platform config PUT update succeeded'); passed++;
    } else {
      console.log('  ❌ Config PUT update failed:', configPut.status); failed++;
    }

    // ── Test FR-004: Audit Log Access ─────────────────────────────────────
    console.log('\nTesting FR-004: Audit Log Access...');
    const auditRes = await request(server, 'GET', '/api/audit-logs', saToken);
    if (auditRes.status === 200 && Array.isArray(auditRes.data?.data?.logs)) {
      console.log('  ✅ Audit logs GET succeeded | Total records:', auditRes.data.data.pagination.total); passed++;
    } else {
      console.log('  ❌ Audit logs GET failed'); failed++;
    }

    // Non-Super Admin blocked from audit logs (403)
    const auditForbidden = await request(server, 'GET', '/api/audit-logs', trainerToken);
    if (auditForbidden.status === 403) {
      console.log('  ✅ Non-Super Admin correctly returned 403 Forbidden for Audit Logs'); passed++;
    } else {
      console.log('  ❌ Non-Super Admin audit log protection failed:', auditForbidden.status); failed++;
    }

    // ── Test FR-005: Reports & Multi-currency ─────────────────────────────
    console.log('\nTesting FR-005: Report Generation (Multi-currency)...');
    const reportRes = await request(server, 'GET', '/api/reports/finance', saToken);
    if (reportRes.status === 200) {
      console.log('  ✅ Finance revenue report fetched'); passed++;
    } else {
      console.log('  ❌ Revenue report failed'); failed++;
    }

    // ── Test FR-006: Data Export ──────────────────────────────────────────
    console.log('\nTesting FR-006: Data Export...');
    const exportCsv = await request(server, 'GET', '/api/export/students?format=csv', saToken);
    if (exportCsv.status === 200 && typeof exportCsv.raw === 'string' && exportCsv.raw.includes('roll_number')) {
      console.log('  ✅ CSV data export succeeded'); passed++;
    } else {
      console.log('  ❌ CSV data export failed'); failed++;
    }

    // ── Test FR-007: Role-Based Access Override ───────────────────────────
    console.log('\nTesting FR-007: Permission Override Mechanism...');
    // Trainer attempting to access /api/coupons (normally forbidden -> 403)
    const couponBefore = await request(server, 'GET', '/api/coupons', trainerToken);
    console.log('  Trainer initial coupon access status:', couponBefore.status, '(Expected 403)');

    // Super Admin grants temporary GRANT override for /api/coupons to Trainer
    const expDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future
    const overrideRes = await request(server, 'POST', '/api/permission-overrides', saToken, {
      user_id: trainerId,
      permission: 'coupons',
      action: 'GRANT',
      expires_at: expDate.toISOString()
    });
    console.log('  Override create status:', overrideRes.status);
    const overrideId = overrideRes.data?.data?.id;

    // Trainer re-attempts access (should now succeed via temporary GRANT override)
    const couponAfter = await request(server, 'GET', '/api/coupons', trainerToken);
    if (couponAfter.status === 200) {
      console.log('  ✅ Temporary GRANT permission override active & verified (200 OK)'); passed++;
    } else {
      console.log('  ❌ Permission override check failed:', couponAfter.status); failed++;
    }

    // Revoke override
    if (overrideId) {
      const revokeRes = await request(server, 'DELETE', `/api/permission-overrides/${overrideId}`, saToken);
      if (revokeRes.status === 200) {
        console.log('  ✅ Override revoked successfully'); passed++;
      } else {
        console.log('  ❌ Override revocation failed:', revokeRes.status); failed++;
      }
    }

    console.log('\n==========================================');
    console.log(`Super Admin Test Summary: ${passed} passed, ${failed} failed`);
    console.log('==========================================\n');
  } catch (err) {
    console.error('❌ Test Error:', err.message);
  } finally {
    server.close(() => process.exit(failed > 0 ? 1 : 0));
  }
}

runSuperAdminTests();
