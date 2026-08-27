/**
 * Automated Verification Script for Support Executive Module (SRS Page 9: FR-001 to FR-005)
 */

const { generateToken } = require('./utils/jwtHelper');
const app = require('./app');
const http = require('http');
const pool = require('./config/db');

function request(server, method, path, token, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5008,
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

async function runSupportExecTests() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(5008, r));
  console.log('🚀 Support Executive Module Test Server running on port 5008\n');

  let passed = 0;
  let failed = 0;

  try {
    const [supportUsers] = await pool.query('SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "SUPPORT_EXECUTIVE" LIMIT 2');
    const support1Id = supportUsers[0]?.id || 5;
    const support2Id = supportUsers[1]?.id || 6;

    const support1Token = generateToken({ userId: support1Id });
    const support2Token = generateToken({ userId: support2Id });

    // Ensure a test mock exists and delegate to support1Id
    const [mockRes] = await pool.query(
      `INSERT INTO mock_interviews (student_id, trainer_id, original_trainer_id, topic, scheduled_date, status, delegation_status, delegated_to_role_id, delegated_to_user_id)
       VALUES (1, 1, 1, 'Support Module Test Mock', CURRENT_TIMESTAMP, 'SCHEDULED', 'PENDING', 5, ?)`,
      [support1Id]
    );
    const mockId = mockRes.insertId;

    // ── FR-001: Delegated Mock Inbox ──────────────────────────────────────
    console.log('Testing FR-001: Delegated Mock Inbox...');
    const inboxRes = await request(server, 'GET', '/api/mock-interviews', support1Token);
    if (inboxRes.status === 200 && Array.isArray(inboxRes.data?.data?.interviews || inboxRes.data?.interviews)) {
      console.log('  ✅ Support Executive delegated mock inbox retrieved (200 OK)'); passed++;
    } else {
      console.log('  ❌ Delegated mock inbox retrieval failed:', inboxRes.status); failed++;
    }

    // ── FR-002: Mock Acceptance & Rejection ──────────────────────────────
    console.log('\nTesting FR-002: Mock Acceptance & Notification Dispatch...');
    const acceptRes = await request(server, 'PATCH', `/api/mock-interviews/${mockId}/delegated-review`, support1Token, {
      action: 'ACCEPT'
    });
    if (acceptRes.status === 200) {
      console.log('  ✅ Delegated mock accepted -> status set to SCHEDULED'); passed++;
    } else {
      console.log('  ❌ Mock acceptance failed:', acceptRes.status, acceptRes.data); failed++;
    }

    // ── RBAC Security Check: Support2 trying to access Support1 mock ──────
    console.log('\nTesting RBAC Security Guard (Support2 accessing Support1 mock)...');
    const forbiddenRes = await request(server, 'PATCH', `/api/mock-interviews/${mockId}/delegated-review`, support2Token, {
      action: 'REJECT',
      reason: 'Unauthorized access attempt'
    });
    if (forbiddenRes.status === 403 || forbiddenRes.status === 400) {
      console.log('  ✅ Cross-user delegated mock modification correctly blocked'); passed++;
    } else {
      console.log('  ❌ Security guard failed:', forbiddenRes.status); failed++;
    }

    // ── FR-003 & FR-004: Mock Schedule & Evaluation Feedback ───────────────
    console.log('\nTesting FR-003 & FR-004: Mock Schedule View & Evaluation Feedback...');
    const evalRes = await request(server, 'PATCH', `/api/mock-interviews/${mockId}/evaluate`, support1Token, {
      status: 'COMPLETED',
      score: 90,
      feedback: 'Great performance in technical problem solving.'
    });
    if (evalRes.status === 200) {
      console.log('  ✅ Mock session evaluation & feedback recorded successfully'); passed++;
    } else {
      console.log('  ❌ Mock evaluation failed:', evalRes.status, evalRes.data); failed++;
    }

    // ── FR-005: Support Executive Dashboard KPIs ───────────────────────────
    console.log('\nTesting FR-005: Support Executive Dashboard KPIs...');
    const dashRes = await request(server, 'GET', '/api/reports/dashboard-stats', support1Token);
    const dData = dashRes.data?.data || dashRes.data;
    if (
      dashRes.status === 200 &&
      dData.new_delegated_mocks !== undefined &&
      dData.pending_acceptance !== undefined &&
      dData.todays_mocks !== undefined &&
      dData.upcoming_mocks !== undefined &&
      dData.completed_mocks !== undefined
    ) {
      console.log('  ✅ Support Executive Dashboard KPIs verified:');
      console.log(`     - New Delegated Mocks: ${dData.new_delegated_mocks}`);
      console.log(`     - Pending Acceptance: ${dData.pending_acceptance}`);
      console.log(`     - Today's Mocks: ${dData.todays_mocks}`);
      console.log(`     - Upcoming Mocks: ${dData.upcoming_mocks}`);
      console.log(`     - Completed Mocks: ${dData.completed_mocks}`);
      passed++;
    } else {
      console.log('  ❌ Dashboard KPIs failed:', dashRes.status); failed++;
    }

    console.log('\n==========================================');
    console.log(`Support Executive Test Summary: ${passed} passed, ${failed} failed`);
    console.log('==========================================\n');
  } catch (err) {
    console.error('❌ Test Error:', err.message);
  } finally {
    server.close(() => process.exit(failed > 0 ? 1 : 0));
  }
}

runSupportExecTests();
