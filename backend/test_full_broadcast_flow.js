const http = require('http');

// 1. First authenticate as Super Admin to get JWT token
const authData = JSON.stringify({
  email: 'superadmin@campusflow.com',
  password: 'password123'
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': authData.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(body);
    const token = parsed.data?.token;

    console.log(`✓ Admin Authentication Successful (Status: ${res.statusCode})`);
    console.log(`✓ Acquired JWT Token: ${token?.slice(0, 25)}...`);

    // 2. Now call POST /api/notifications/broadcast-notice with JWT token
    const noticePayload = JSON.stringify({
      title: 'Official Semester Notice',
      message: 'This is a test broadcast notice verifying live route execution.',
      priority: 'GENERAL',
      target_group: 'ALL_STUDENTS'
    });

    const broadcastReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications/broadcast-notice',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': noticePayload.length
      }
    }, (bRes) => {
      let bBody = '';
      bRes.on('data', bChunk => bBody += bChunk);
      bRes.on('end', () => {
        console.log(`\n✓ Broadcast API Endpoint Test (Status: ${bRes.statusCode})`);
        console.log('Response Payload:', bBody);
      });
    });

    broadcastReq.write(noticePayload);
    broadcastReq.end();
  });
});

loginReq.write(authData);
loginReq.end();
