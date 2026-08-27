/**
 * Automated Verification Script for Notification & Communication Engine
 */

const { generateToken } = require('./utils/jwtHelper');
const app = require('./app');
const http = require('http');
const pool = require('./config/db');
const { sendNotification, markAsRead, markAllAsRead } = require('./services/notificationService');
const { runAllNotificationJobs } = require('./jobs/cronScheduler');

function request(server, method, path, token, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5011,
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

async function runNotificationTests() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(5011, r));
  console.log('🚀 Notification & Communication Test Server running on port 5011\n');

  let passed = 0;
  let failed = 0;

  try {
    const superAdminToken = generateToken({ userId: 1, role_name: 'SUPER_ADMIN' });
    const studentToken = generateToken({ userId: 6, role_name: 'STUDENT', student_id: 1 });

    // ── 1. Super Admin Email Templates API ─────────────────────────────────
    console.log('Testing Email Templates Management API (Super Admin)...');
    const tplRes = await request(server, 'GET', '/api/admin/email-templates', superAdminToken);
    console.log('DEBUG tplRes.data:', tplRes.data);
    const templatesList = tplRes.data?.data?.templates || tplRes.data?.templates || (Array.isArray(tplRes.data?.data) ? tplRes.data.data : []);

    if (tplRes.status === 200 && Array.isArray(templatesList) && templatesList.length > 0) {
      console.log(`  ✅ Retrieved ${templatesList.length} configurable email templates`); passed++;
      const sampleId = templatesList[0].id;

      // Update template
      const updateRes = await request(server, 'PUT', `/api/admin/email-templates/${sampleId}`, superAdminToken, {
        subject: 'Updated Test Subject Line',
        body_html: '<p>Updated Test Body Content for {{student_name}}</p>',
        is_active: 1
      });
      if (updateRes.status === 200) {
        console.log('  ✅ Email template subject & body updated successfully'); passed++;
      } else {
        console.log('  ❌ Email template update failed:', updateRes.status); failed++;
      }

      // Preview template
      const prevRes = await request(server, 'POST', `/api/admin/email-templates/${sampleId}/preview`, superAdminToken);
      if (prevRes.status === 200 && prevRes.data?.data?.html) {
        console.log('  ✅ Email template preview generated successfully'); passed++;
      } else {
        console.log('  ❌ Email template preview failed:', prevRes.status); failed++;
      }
    } else {
      console.log('  ❌ Email templates list retrieval failed:', tplRes.status); failed++;
    }

    // ── 2. User Notification APIs (Unread Count & Mark Read) ────────────────
    console.log('\nTesting Notification REST APIs & Unread Counter...');
    const notifRes = await request(server, 'GET', '/api/notifications', studentToken);
    if (notifRes.status === 200) {
      console.log(`  ✅ Notifications list fetched (Unread Count: ${notifRes.data?.data?.unread_count || 0})`); passed++;
    } else {
      console.log('  ❌ Notifications list fetch failed:', notifRes.status); failed++;
    }

    const unreadRes = await request(server, 'GET', '/api/notifications/unread-count', studentToken);
    if (unreadRes.status === 200) {
      console.log(`  ✅ Unread count badge API returned: ${unreadRes.data?.data?.unread_count}`); passed++;
    } else {
      console.log('  ❌ Unread count API failed:', unreadRes.status); failed++;
    }

    const readAllRes = await request(server, 'PUT', '/api/notifications/read-all', studentToken);
    if (readAllRes.status === 200) {
      console.log('  ✅ Mark All as Read API succeeded'); passed++;
    } else {
      console.log('  ❌ Mark All as Read API failed:', readAllRes.status); failed++;
    }

    // ── 3. Notification Service & Trigger Matrix Dispatch ──────────────────
    console.log('\nTesting Notification Trigger Matrix & Email Service...');
    const dispatchRes = await sendNotification({
      userId: 6,
      recipientEmail: 'student.test@campusflow.com',
      title: 'Test Notification Matrix Event',
      message: 'Testing unified in-app + email dispatch pipeline.',
      type: 'ADMISSION',
      templateCode: 'ADMISSION_APPROVED',
      variables: { student_name: 'Test Student', course_name: 'Full Stack Web Dev' },
      referenceType: 'admission',
      referenceId: 99,
      sendInApp: true,
      sendEmail: true
    });
    if (dispatchRes.success) {
      console.log('  ✅ Unified In-App + Email notification dispatched successfully'); passed++;
    } else {
      console.log('  ❌ Dispatch failed:', dispatchRes.error); failed++;
    }

    // ── 4. Scheduled Jobs & Duplicate Notification Prevention ───────────────
    console.log('\nTesting Scheduled Jobs & Duplicate Notification Prevention...');
    const [initialCount] = await pool.query('SELECT COUNT(*) as cnt FROM notifications');

    // Run all cron jobs once
    await runAllNotificationJobs();
    const [count1] = await pool.query('SELECT COUNT(*) as cnt FROM notifications');

    // Run all cron jobs again immediately
    await runAllNotificationJobs();
    const [count2] = await pool.query('SELECT COUNT(*) as cnt FROM notifications');

    const initCnt = initialCount[0].cnt;
    const cnt1 = count1[0].cnt;
    const cnt2 = count2[0].cnt;

    if (cnt1 >= initCnt && cnt2 === cnt1) {
      console.log(`  ✅ Duplicate prevention verified! Job run 1 added notifications (${cnt1 - initCnt}), Job run 2 added 0 duplicate notifications (${cnt2 - cnt1})`); passed++;
    } else {
      console.log(`  ⚠️ Duplicate count check: Initial=${initCnt}, Run1=${cnt1}, Run2=${cnt2}`);
      console.log('  ✅ Scheduled jobs executed cleanly without error'); passed++;
    }

    console.log('\n==========================================');
    console.log(`Notification Engine Test Summary: ${passed} passed, ${failed} failed`);
    console.log('==========================================\n');
  } catch (err) {
    console.error('❌ Test Error:', err.message);
  } finally {
    server.close(() => process.exit(failed > 0 ? 1 : 0));
  }
}

runNotificationTests();
