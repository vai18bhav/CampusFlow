/**
 * Automated Verification Script for Admin Module (SRS Page 5 — FR-001 to FR-006)
 */

const { generateToken } = require('./utils/jwtHelper');
const app = require('./app');
const http = require('http');
const pool = require('./config/db');

function request(server, method, path, token, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5005,
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

async function runAdminTests() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(5005, r));
  console.log('🚀 Admin Module Test Server running on port 5005\n');

  let passed = 0;
  let failed = 0;

  try {
    const [admins] = await pool.query('SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "ADMIN" LIMIT 1');
    const [superAdmins] = await pool.query('SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "SUPER_ADMIN" LIMIT 1');

    const adminId = admins[0]?.id || 2;
    const adminToken = generateToken({ userId: adminId });

    const saId = superAdmins[0]?.id || 1;

    // ── 1. FR-001: User Management Restrictions ────────────────────────────
    console.log('Testing FR-001: User Management & Admin Escalation Guards...');

    // Admin creating Trainer (Allowed)
    const trainerEmail = `admin_created_trn_${Date.now()}@test.com`;
    const createTrn = await request(server, 'POST', '/api/users', adminToken, {
      role_id: 4, // Trainer
      full_name: 'Admin Created Trainer',
      email: trainerEmail,
      password: 'Trainer@2026',
      phone: '+919888877777'
    });
    if (createTrn.status === 201 || createTrn.status === 200) {
      console.log('  ✅ Admin creating Trainer succeeded (200/201)'); passed++;
    } else {
      console.log('  ❌ Admin creating Trainer failed:', createTrn.status); failed++;
    }

    // Admin attempting to create Super Admin (Must be 403)
    const saEmail = `admin_created_sa_${Date.now()}@test.com`;
    const createSa = await request(server, 'POST', '/api/users', adminToken, {
      role_id: 1, // Super Admin
      full_name: 'Forbidden SA',
      email: saEmail,
      password: 'Password123!'
    });
    if (createSa.status === 403) {
      console.log('  ✅ Admin creating Super Admin correctly blocked (403 Forbidden)'); passed++;
    } else {
      console.log('  ❌ Admin creating Super Admin guard failed:', createSa.status); failed++;
    }

    // Admin attempting to create another Admin (Must be 403)
    const adminEmail = `admin_created_adm_${Date.now()}@test.com`;
    const createAdmin = await request(server, 'POST', '/api/users', adminToken, {
      role_id: 2, // Admin
      full_name: 'Forbidden Admin',
      email: adminEmail,
      password: 'Password123!'
    });
    if (createAdmin.status === 403) {
      console.log('  ✅ Admin creating another Admin correctly blocked (403 Forbidden)'); passed++;
    } else {
      console.log('  ❌ Admin creating Admin guard failed:', createAdmin.status); failed++;
    }

    // Admin attempting to edit Super Admin account (Must be 403)
    const editSa = await request(server, 'PUT', `/api/users/${saId}`, adminToken, {
      full_name: 'Hacked Super Admin'
    });
    if (editSa.status === 403) {
      console.log('  ✅ Admin editing Super Admin correctly blocked (403 Forbidden)'); passed++;
    } else {
      console.log('  ❌ Admin editing Super Admin guard failed:', editSa.status); failed++;
    }

    // Admin attempting to deactivate Super Admin account (Must be 403)
    const deactivateSa = await request(server, 'PATCH', `/api/users/${saId}/status`, adminToken, {
      status: 'INACTIVE'
    });
    if (deactivateSa.status === 403) {
      console.log('  ✅ Admin deactivating Super Admin correctly blocked (403 Forbidden)'); passed++;
    } else {
      console.log('  ❌ Admin deactivating Super Admin guard failed:', deactivateSa.status); failed++;
    }

    // ── 2. FR-002: Operational Access & Super Admin Route Blocking ────────
    console.log('\nTesting FR-002: Operational Access & Protection Guards...');

    // Operational route access (Admissions) -> 200 OK
    const admRes = await request(server, 'GET', '/api/admissions', adminToken);
    if (admRes.status === 200) {
      console.log('  ✅ Operational access to Admissions succeeded (200 OK)'); passed++;
    } else {
      console.log('  ❌ Operational access to Admissions failed:', admRes.status); failed++;
    }

    // Admin attempting Super Admin only audit logs -> 403 Forbidden
    const saAudit = await request(server, 'GET', '/api/audit-logs', adminToken);
    if (saAudit.status === 403) {
      console.log('  ✅ Admin accessing Audit Logs correctly blocked (403 Forbidden)'); passed++;
    } else {
      console.log('  ❌ Admin accessing Audit Logs guard failed:', saAudit.status); failed++;
    }

    // Admin attempting Super Admin permission overrides -> 403 Forbidden
    const saOverrides = await request(server, 'GET', '/api/permission-overrides', adminToken);
    if (saOverrides.status === 403) {
      console.log('  ✅ Admin accessing Permission Overrides correctly blocked (403 Forbidden)'); passed++;
    } else {
      console.log('  ❌ Admin accessing Permission Overrides guard failed:', saOverrides.status); failed++;
    }

    // ── 3. FR-003: Batch Management ────────────────────────────────────────
    console.log('\nTesting FR-003: Batch Management...');
    const batchRes = await request(server, 'GET', '/api/batches', adminToken);
    if (batchRes.status === 200 && Array.isArray(batchRes.data?.data?.batches || batchRes.data?.batches)) {
      console.log('  ✅ Batch catalog retrieval succeeded (200 OK)'); passed++;
    } else {
      console.log('  ❌ Batch retrieval failed:', batchRes.status); failed++;
    }

    // ── 4. FR-004: Admin Dashboard KPIs ────────────────────────────────────
    console.log('\nTesting FR-004: Admin Dashboard KPIs...');
    const statsRes = await request(server, 'GET', '/api/reports/dashboard-stats', adminToken);
    const dData = statsRes.data?.data || statsRes.data;
    if (
      statsRes.status === 200 &&
      dData.total_students !== undefined &&
      dData.active_batches !== undefined &&
      dData.pending_admissions !== undefined &&
      dData.overdue_invoices !== undefined &&
      dData.upcoming_mocks !== undefined
    ) {
      console.log('  ✅ Admin Dashboard KPIs verified:');
      console.log(`     - Total Students: ${dData.total_students}`);
      console.log(`     - Active Batches: ${dData.active_batches}`);
      console.log(`     - Pending Admissions: ${dData.pending_admissions}`);
      console.log(`     - Overdue Invoices: ${dData.overdue_invoices}`);
      console.log(`     - Upcoming Mocks: ${dData.upcoming_mocks}`);
      passed++;
    } else {
      console.log('  ❌ Admin Dashboard KPI response missing fields:', dData); failed++;
    }

    // ── 5. FR-005: Notification Management ─────────────────────────────────
    console.log('\nTesting FR-005: Notification Management...');
    const notifRes = await request(server, 'POST', '/api/notifications/broadcast-notice', adminToken, {
      title: 'Admin Test Announcement',
      message: 'Operational test notice broadcasted by Admin',
      priority: 'HIGH',
      target_group: 'ALL_STUDENTS'
    });
    if (notifRes.status === 201 || notifRes.status === 200) {
      console.log('  ✅ Notification broadcast succeeded'); passed++;
    } else {
      console.log('  ❌ Notification broadcast failed:', notifRes.status); failed++;
    }

    // ── 6. FR-006: Operational Reports Access ──────────────────────────────
    console.log('\nTesting FR-006: Reports Access...');
    const reportRes = await request(server, 'GET', '/api/reports/summary', adminToken);
    if (reportRes.status === 200) {
      console.log('  ✅ Executive report summary retrieved (200 OK)'); passed++;
    } else {
      console.log('  ❌ Report summary failed:', reportRes.status); failed++;
    }

    console.log('\n==========================================');
    console.log(`Admin Module Test Summary: ${passed} passed, ${failed} failed`);
    console.log('==========================================\n');
  } catch (err) {
    console.error('❌ Test Error:', err.message);
  } finally {
    server.close(() => process.exit(failed > 0 ? 1 : 0));
  }
}

runAdminTests();
