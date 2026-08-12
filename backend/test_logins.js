const http = require('http');

const accounts = [
  { role: 'Super Admin', email: 'superadmin@campusflow.com' },
  { role: 'Admin', email: 'admin@campusflow.com' },
  { role: 'Sales Executive', email: 'sales@campusflow.com' },
  { role: 'Trainer', email: 'trainer@campusflow.com' },
  { role: 'Support Executive', email: 'support@campusflow.com' },
  { role: 'Student', email: 'student@campusflow.com' }
];

async function testAllLogins() {
  console.log('\n==================================================');
  console.log('TESTING CAMPUSFLOW LOGIN FORM & AUTHENTICATION API');
  console.log('==================================================\n');

  for (const acc of accounts) {
    try {
      const res = await loginRequest(acc.email, 'password123');
      if (res.success) {
        console.log(`[LOGIN SUCCESS] ${acc.role.padEnd(18)} | Email: ${acc.email.padEnd(26)} | JWT Token: Valid (Length: ${res.data.token.length})`);
      } else {
        console.log(`[LOGIN FAILED] ${acc.role}: ${res.message}`);
      }
    } catch (err) {
      console.error(`[LOGIN ERROR] ${acc.role}:`, err.message);
    }
  }
  console.log('\n==================================================\n');
}

function loginRequest(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password });
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

testAllLogins();
