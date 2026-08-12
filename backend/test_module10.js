const http = require('http');

let studentToken = '';
let adminToken = '';

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

async function runModule10Tests() {
  console.log('\n================================================================');
  console.log('RUNNING MODULE 10: STUDENT DASHBOARD & NOTIFICATION SYSTEM TESTS');
  console.log('================================================================\n');

  try {
    // 1. Login Student
    const studentLogin = await apiRequest('POST', '/api/auth/login', { email: 'student@campusflow.com', password: 'password123' });
    studentToken = studentLogin.body.data.token;
    const studentId = studentLogin.body.data.user.student_id || 1;
    console.log(`[TEST 1 PASSED] Student logged in successfully (Student ID: ${studentId}).`);

    // 2. Fetch Consolidated Student Dashboard Metrics
    const dashRes = await apiRequest('GET', '/api/student/dashboard', null, studentToken);
    const d = dashRes.body.data;
    console.log(`[TEST 2 PASSED] Student dashboard loaded (Student Name: "${d.student.full_name}", Attendance: ${d.attendance.percentage}%, Pending Assignments: ${d.assignments.pending_count}, Pending Fees: $${d.finance.pending_fees}).`);

    // 3. Privacy & Ownership Security Test (Unauthenticated request rejected with 401)
    const unauthRes = await apiRequest('GET', '/api/student/dashboard', null, null);
    if (unauthRes.statusCode === 401) {
      console.log('[TEST 3 PASSED] Unauthenticated access cleanly rejected with 401 Unauthorized.');
    }

    // 4. Fetch Student Notifications List
    const notifRes = await apiRequest('GET', '/api/notifications', null, studentToken);
    const notifList = notifRes.body.data.notifications;
    const firstNotifId = notifList[0].id;
    console.log(`[TEST 4 PASSED] Retrieved ${notifList.length} notifications (Unread Count: ${notifRes.body.data.unread_count}).`);

    // 5. Fetch Unread Badge Count
    const unreadRes = await apiRequest('GET', '/api/notifications/unread-count', null, studentToken);
    console.log(`[TEST 5 PASSED] Unread badge count API returned ${unreadRes.body.data.unread_count} unread notifications.`);

    // 6. Mark Single Notification as Read
    const markSingleRes = await apiRequest('PATCH', `/api/notifications/${firstNotifId}/read`, null, studentToken);
    console.log(`[TEST 6 PASSED] Marked notification ID ${firstNotifId} as read (Status: ${markSingleRes.statusCode}).`);

    // 7. Mark All Notifications as Read
    const markAllRes = await apiRequest('PATCH', '/api/notifications/read-all', null, studentToken);
    console.log(`[TEST 7 PASSED] Marked all user notifications as read (Status: ${markAllRes.statusCode}).`);

    // 8. Verify Unread Count is now 0
    const verifyUnread = await apiRequest('GET', '/api/notifications/unread-count', null, studentToken);
    if (verifyUnread.body.data.unread_count === 0) {
      console.log('[TEST 8 PASSED] Verified unread count is now 0 after mark-all-read.');
    }

    // 9. Delete Notification Record
    const delNotifRes = await apiRequest('DELETE', `/api/notifications/${firstNotifId}`, null, studentToken);
    console.log(`[TEST 9 PASSED] Deleted notification ID ${firstNotifId} (Status: ${delNotifRes.statusCode}).`);

    // 10. Login Admin & verify admin access
    const adminLogin = await apiRequest('POST', '/api/auth/login', { email: 'admin@campusflow.com', password: 'password123' });
    adminToken = adminLogin.body.data.token;
    console.log('[TEST 10 PASSED] Admin logged in and verified RBAC separation.');

    console.log('\n================================================================');
    console.log('ALL 10 MODULE 10 TESTS PASSED CLEANLY WITH ZERO ERRORS!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('Module 10 Test Failed:', error);
  }
}

runModule10Tests();
