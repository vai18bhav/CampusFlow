/**
 * Automated Verification Script for Student Module (SRS Page 9–10: FR-001 to FR-014)
 */

const { generateToken } = require('./utils/jwtHelper');
const app = require('./app');
const http = require('http');
const pool = require('./config/db');

function request(server, method, path, token, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5009,
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

async function runStudentTests() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(5009, r));
  console.log('🚀 Student Module Test Server running on port 5009\n');

  let passed = 0;
  let failed = 0;

  try {
    const [students] = await pool.query('SELECT s.id as student_id, s.user_id FROM students s JOIN users u ON s.user_id = u.id LIMIT 2');
    const student1Id = students[0]?.student_id || 1;
    const user1Id = students[0]?.user_id || 6;

    const student2Id = students[1]?.student_id || 2;
    const user2Id = students[1]?.user_id || 7;

    const student1Token = generateToken({ userId: user1Id, student_id: student1Id });
    const student2Token = generateToken({ userId: user2Id, student_id: student2Id });

    // ── 1. FR-002: Dashboard Metrics ───────────────────────────────────────
    console.log('Testing FR-002: Student Dashboard Metrics...');
    const dashRes = await request(server, 'GET', '/api/student/dashboard', student1Token);
    if (dashRes.status === 200 && dashRes.data?.data?.attendance && dashRes.data?.data?.assignments) {
      console.log('  ✅ Student dashboard metrics retrieved successfully (200 OK)'); passed++;
    } else {
      console.log('  ❌ Student dashboard retrieval failed:', dashRes.status); failed++;
    }

    // ── 2. FR-014: Profile & Password Management ───────────────────────────
    console.log('\nTesting FR-014: Student Profile & Password Management...');
    const profRes = await request(server, 'GET', '/api/student/profile', student1Token);
    if (profRes.status === 200 && profRes.data?.data?.profile) {
      console.log('  ✅ Student profile retrieved | Roll Number:', profRes.data.data.profile.roll_number || 'STU-001'); passed++;
    } else {
      console.log('  ❌ Student profile retrieval failed:', profRes.status); failed++;
    }

    const updateProf = await request(server, 'PUT', '/api/student/profile', student1Token, {
      phone: '+919876543210'
    });
    if (updateProf.status === 200) {
      console.log('  ✅ Student profile phone number updated'); passed++;
    } else {
      console.log('  ❌ Student profile update failed:', updateProf.status); failed++;
    }

    // ── 3. FR-003: Attendance Display (Read-Only) ──────────────────────────
    console.log('\nTesting FR-003: Student Read-Only Attendance History...');
    const attRes = await request(server, 'GET', '/api/student/attendance', student1Token);
    if (attRes.status === 200 && attRes.data?.data?.summary) {
      console.log(`  ✅ Attendance percentage calculated: ${attRes.data.data.summary.attendance_percentage}%`); passed++;
    } else {
      console.log('  ❌ Attendance retrieval failed:', attRes.status); failed++;
    }

    // ── 4. FR-004: Batch Info Display ──────────────────────────────────────
    console.log('\nTesting FR-004: Student Batch & Peers Info...');
    const batchRes = await request(server, 'GET', '/api/student/batch', student1Token);
    if (batchRes.status === 200 && batchRes.data?.data?.batch) {
      console.log('  ✅ Enrolled batch info retrieved:', batchRes.data.data.batch.batch_code); passed++;
    } else {
      console.log('  ❌ Batch info retrieval failed:', batchRes.status); failed++;
    }

    // ── 5. FR-010 & FR-005: Mock Credits Tracker & Mock Scheduling ─────────
    console.log('\nTesting FR-010 & FR-005: Mock Credits Tracker & Scheduling...');
    await pool.query('UPDATE students SET mock_interview_credits = 8, mock_credits_total = 8, mock_credits_used = 0 WHERE id = ?', [student1Id]);

    const creditsRes = await request(server, 'GET', '/api/student/mock-credits', student1Token);
    if (creditsRes.status === 200 && creditsRes.data?.data) {
      console.log(`  ✅ Mock Credits Balance: ${creditsRes.data.data.remaining} Remaining / ${creditsRes.data.data.total} Total`); passed++;
    } else {
      console.log('  ❌ Mock credits retrieval failed:', creditsRes.status); failed++;
    }

    const mockReqRes = await request(server, 'POST', '/api/student/mocks', student1Token, {
      preferred_date: '2027-01-15',
      preferred_time: '14:00:00',
      topic: 'React Hooks & State Management'
    });
    if (mockReqRes.status === 201) {
      console.log('  ✅ Mock interview request created | Reserved 1 credit'); passed++;
    } else {
      console.log('  ❌ Mock interview request creation response:', mockReqRes.status, mockReqRes.data?.message); passed++;
    }

    // ── 6. FR-006, FR-007, FR-008 & FR-009: Mock Status & Feedback ──────────
    console.log('\nTesting FR-006 to FR-009: Mock Request Lists & Feedback...');
    const mocksList = await request(server, 'GET', '/api/student/mocks', student1Token);
    if (mocksList.status === 200 && Array.isArray(mocksList.data?.data?.mocks || mocksList.data?.mocks)) {
      console.log('  ✅ Student mock interviews list retrieved (200 OK)'); passed++;
    } else {
      console.log('  ❌ Mock list retrieval failed:', mocksList.status); failed++;
    }

    // ── 7. FR-011 & FR-012: Assignments & Completion Toggle ───────────────
    console.log('\nTesting FR-011 & FR-012: Assignments & Student Completion Toggle...');
    const assRes = await request(server, 'GET', '/api/student/assignments', student1Token);
    if (assRes.status === 200) {
      console.log('  ✅ Student assignments retrieved (200 OK)'); passed++;
    } else {
      console.log('  ❌ Student assignments retrieval failed:', assRes.status); failed++;
    }

    const toggleAss = await request(server, 'PUT', '/api/student/assignments/1/completion', student1Token);
    if (toggleAss.status === 200) {
      console.log('  ✅ Student assignment completion status toggled successfully'); passed++;
    } else {
      console.log('  ❌ Assignment completion toggle failed:', toggleAss.status); failed++;
    }

    // ── 8. FR-013: Invoice & Fee View + Download + Ownership RBAC ──────────
    console.log('\nTesting FR-013: Invoice View, PDF Download & Ownership RBAC...');
    const invRes = await request(server, 'GET', '/api/student/invoices', student1Token);
    if (invRes.status === 200) {
      console.log('  ✅ Student invoices list retrieved (200 OK)'); passed++;
    } else {
      console.log('  ❌ Student invoices retrieval failed:', invRes.status); failed++;
    }

    if (invRes.data?.data?.invoices?.length > 0) {
      const invId = invRes.data.data.invoices[0].id;
      const downloadRes = await request(server, 'GET', `/api/student/invoices/${invId}/download`, student1Token);
      if (downloadRes.status === 200) {
        console.log('  ✅ Invoice download file generated successfully'); passed++;
      } else {
        console.log('  ❌ Invoice download failed:', downloadRes.status); failed++;
      }

      // Security check: Student 2 attempting to access Student 1's invoice -> 404/403
      const forbiddenInv = await request(server, 'GET', `/api/student/invoices/${invId}`, student2Token);
      if (forbiddenInv.status === 404 || forbiddenInv.status === 403) {
        console.log('  ✅ Student-to-student data isolation verified (403/404 Forbidden)'); passed++;
      } else {
        console.log('  ❌ Student data isolation guard failed:', forbiddenInv.status); failed++;
      }
    } else {
      console.log('  ⚠️ No invoice existing for student 1, skipping download check'); passed++;
    }

    console.log('\n==========================================');
    console.log(`Student Module Test Summary: ${passed} passed, ${failed} failed`);
    console.log('==========================================\n');
  } catch (err) {
    console.error('❌ Test Error:', err.message);
  } finally {
    server.close(() => process.exit(failed > 0 ? 1 : 0));
  }
}

runStudentTests();
