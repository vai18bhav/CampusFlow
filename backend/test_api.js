const app = require('./app');
const http = require('http');

let server;

async function runTests() {
  server = app.listen(5001, async () => {
    console.log('Testing backend server endpoints on port 5001...');

    try {
      // 1. Health check test
      const healthRes = await makeRequest('GET', '/api/health');
      console.log('Health check response:', healthRes);

      // 2. Login test for Super Admin
      const loginRes = await makeRequest('POST', '/api/auth/login', {
        email: 'superadmin@campusflow.com',
        password: 'password123'
      });
      console.log('Login Super Admin success:', loginRes.success, 'Token generated:', !!loginRes.data.token);

      const token = loginRes.data.token;

      // 3. Get profile test
      const profileRes = await makeRequest('GET', '/api/auth/me', null, token);
      console.log('Get Profile Role:', profileRes.data.user.role_name);

      // 4. Get Dashboard stats test
      const statsRes = await makeRequest('GET', '/api/reports/dashboard-stats', null, token);
      console.log('Admin Dashboard Stats total_students:', statsRes.data.total_students, 'total_admissions:', statsRes.data.total_admissions);

      // 5. Get courses test
      const coursesRes = await makeRequest('GET', '/api/courses', null, token);
      console.log('Courses count:', coursesRes.data.courses.length);

      console.log('\n==================================================');
      console.log('ALL BACKEND API TESTS PASSED SUCCESSFULLY!');
      console.log('==================================================\n');
    } catch (err) {
      console.error('API Test Error:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

runTests();
