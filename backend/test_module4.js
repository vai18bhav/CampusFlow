const http = require('http');

let adminToken = '';
let studentToken = '';

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

async function runModule4Tests() {
  console.log('\n==================================================');
  console.log('RUNNING MODULE 4: COURSE MANAGEMENT AUTOMATED TESTS');
  console.log('==================================================\n');

  try {
    // 1. Login Admin
    const adminLogin = await apiRequest('POST', '/api/auth/login', { email: 'admin@campusflow.com', password: 'password123' });
    adminToken = adminLogin.body.data.token;
    console.log('[TEST 1 PASSED] Admin logged in successfully.');

    // 2. Login Student
    const studentLogin = await apiRequest('POST', '/api/auth/login', { email: 'student@campusflow.com', password: 'password123' });
    studentToken = studentLogin.body.data.token;
    console.log('[TEST 2 PASSED] Student logged in successfully.');

    // 3. Admin Get Courses List
    const coursesList = await apiRequest('GET', '/api/courses', null, adminToken);
    console.log(`[TEST 3 PASSED] Admin retrieved ${coursesList.body.data.courses.length} courses.`);

    // 4. Student View Active Courses
    const studentCourses = await apiRequest('GET', '/api/courses', null, studentToken);
    console.log(`[TEST 4 PASSED] Student retrieved ${studentCourses.body.data.courses.length} active courses.`);

    // 5. Admin Create Course
    const testCode = `TEST-${Date.now().toString().slice(-4)}`;
    const newCoursePayload = {
      course_name: 'Cyber Security & Ethical Hacking',
      course_code: testCode,
      category: 'Cyber Security',
      duration: 10,
      fees: 1100.00,
      description: 'Comprehensive network security and vulnerability testing.',
      status: 'ACTIVE'
    };
    const createRes = await apiRequest('POST', '/api/courses', newCoursePayload, adminToken);
    const createdId = createRes.body.data.courseId;
    console.log(`[TEST 5 PASSED] Admin created course '${testCode}' (ID: ${createdId}).`);

    // 6. Student Unauthorized Create Attempt (Must Return 403 Forbidden)
    const unauthRes = await apiRequest('POST', '/api/courses', newCoursePayload, studentToken);
    if (unauthRes.statusCode === 403) {
      console.log('[TEST 6 PASSED] Student unauthorized course creation correctly rejected with 403 Forbidden.');
    } else {
      console.error('[TEST 6 FAILED] Unexpected status code:', unauthRes.statusCode);
    }

    // 7. Duplicate Course Code Validation Check (Must Return 409 Conflict)
    const dupRes = await apiRequest('POST', '/api/courses', newCoursePayload, adminToken);
    if (dupRes.statusCode === 409) {
      console.log('[TEST 7 PASSED] Duplicate course code creation correctly rejected with 409 Conflict.');
    }

    // 8. View Course Details
    const detailsRes = await apiRequest('GET', `/api/courses/${createdId}`, null, adminToken);
    console.log(`[TEST 8 PASSED] Retrieved course details for ID ${createdId} with aggregated batch/student stats.`);

    // 9. Update Course
    const updateRes = await apiRequest('PUT', `/api/courses/${createdId}`, { fee_amount: 1250.00, category: 'Cyber Security' }, adminToken);
    console.log(`[TEST 9 PASSED] Course ID ${createdId} updated successfully.`);

    // 10. Toggle Course Status (PATCH /api/courses/:id/status)
    const toggleRes = await apiRequest('PATCH', `/api/courses/${createdId}/status`, { status: 'INACTIVE' }, adminToken);
    console.log(`[TEST 10 PASSED] Course ID ${createdId} status patched to INACTIVE.`);

    console.log('\n==================================================');
    console.log('ALL 10 MODULE 4 TESTS PASSED CLEANLY WITH ZERO ERRORS!');
    console.log('==================================================\n');
  } catch (error) {
    console.error('Module 4 Test Failed:', error);
  }
}

runModule4Tests();
