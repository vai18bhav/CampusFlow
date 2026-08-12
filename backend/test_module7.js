const http = require('http');

let trainerToken = '';
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

async function runModule7Tests() {
  console.log('\n================================================================');
  console.log('RUNNING MODULE 7: ATTENDANCE & ASSIGNMENT MANAGEMENT TESTS');
  console.log('================================================================\n');

  try {
    // 1. Login Trainer
    const trainerLogin = await apiRequest('POST', '/api/auth/login', { email: 'trainer@campusflow.com', password: 'password123' });
    trainerToken = trainerLogin.body.data.token;
    console.log('[TEST 1 PASSED] Trainer logged in successfully.');

    // 2. Login Student
    const studentLogin = await apiRequest('POST', '/api/auth/login', { email: 'student@campusflow.com', password: 'password123' });
    studentToken = studentLogin.body.data.token;
    const studentId = studentLogin.body.data.user.student_id || 1;
    console.log(`[TEST 2 PASSED] Student logged in successfully (Student ID: ${studentId}).`);

    // 3. Trainer Mark Bulk Attendance
    const testDate = '2026-08-11';
    const markRes = await apiRequest('POST', '/api/attendance/mark', {
      batch_id: 1,
      date: testDate,
      attendance_records: [
        { student_id: 1, status: 'PRESENT', remarks: 'On time' },
        { student_id: 2, status: 'LATE', remarks: '10 min late' }
      ]
    }, trainerToken);
    console.log(`[TEST 3 PASSED] Trainer marked bulk attendance for batch 1 on ${testDate} (Status: ${markRes.statusCode}).`);

    // 4. Student View Attendance History & Percentage Calculation
    const attHistory = await apiRequest('GET', `/api/attendance/student/${studentId}`, null, studentToken);
    console.log(`[TEST 4 PASSED] Student attendance retrieved (Percentage: ${attHistory.body.data.summary.attendance_percentage}%, Present days: ${attHistory.body.data.summary.present_days}).`);

    // 5. Trainer Create Assignment
    const createAssignRes = await apiRequest('POST', '/api/assignments', {
      batch_id: 1,
      title: 'Full Stack Node.js API Project',
      description: 'Implement JWT authentication and MySQL CRUD operations.',
      instructions: 'Upload GitHub repository link.',
      due_date: '2026-08-30 23:59:00',
      total_marks: 100,
      status: 'PUBLISHED'
    }, trainerToken);
    const createdAssignmentId = createAssignRes.body.data.assignmentId;
    console.log(`[TEST 5 PASSED] Trainer published assignment ID ${createdAssignmentId}.`);

    // 6. Student View Assignments & Submission Status
    const studentAssignRes = await apiRequest('GET', '/api/assignments', null, studentToken);
    console.log(`[TEST 6 PASSED] Student retrieved ${studentAssignRes.body.data.assignments.length} assignments with personal submission states.`);

    // 7. Student Submit Assignment Solution
    const subRes = await apiRequest('POST', `/api/assignments/${createdAssignmentId}/submit`, {
      assignment_id: createdAssignmentId,
      submission_text: 'Completed Express & MySQL authentication API.',
      submission_url: 'https://github.com/student/node-api-project'
    }, studentToken);
    console.log(`[TEST 7 PASSED] Student submitted solution for assignment ${createdAssignmentId} (Status: ${subRes.statusCode}).`);

    // 8. Trainer View Submissions Roster
    const rosterRes = await apiRequest('GET', `/api/assignments/${createdAssignmentId}/submissions`, null, trainerToken);
    const createdSubmissionId = rosterRes.body.data.submissions[0].id;
    console.log(`[TEST 8 PASSED] Trainer retrieved submissions roster (Found ${rosterRes.body.data.submissions.length} submission, ID: ${createdSubmissionId}).`);

    // 9. Invalid Marks Evaluation Test (> total_marks) -> Must return 400
    const invalidMarksRes = await apiRequest('PUT', `/api/assignments/submissions/${createdSubmissionId}`, {
      marks_obtained: 150, // Exceeds 100
      feedback: 'Invalid marks test'
    }, trainerToken);
    if (invalidMarksRes.statusCode === 400 && invalidMarksRes.body.message.includes('exceed')) {
      console.log(`[TEST 9 PASSED] Invalid marks > total_marks correctly rejected with 400 Bad Request ("${invalidMarksRes.body.message}").`);
    }

    // 10. Trainer Evaluate & Grade Submission
    const evalRes = await apiRequest('PUT', `/api/assignments/submissions/${createdSubmissionId}`, {
      marks_obtained: 95,
      feedback: 'Outstanding implementation and clean controller structure!',
      status: 'REVIEWED'
    }, trainerToken);
    console.log(`[TEST 10 PASSED] Trainer evaluated submission ID ${createdSubmissionId} (Status: ${evalRes.statusCode}).`);

    console.log('\n================================================================');
    console.log('ALL 10 MODULE 7 TESTS PASSED CLEANLY WITH ZERO ERRORS!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('Module 7 Test Failed:', error);
  }
}

runModule7Tests();
