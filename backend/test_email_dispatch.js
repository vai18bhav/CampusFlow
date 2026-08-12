const { sendStudentWelcomeEmail, sendAssignmentEmail } = require('./utils/emailService');

async function testGmailDispatch() {
  console.log('Testing Live Gmail SMTP Dispatch via campusflow18@gmail.com...\n');

  await sendStudentWelcomeEmail({
    toEmail: 'campusflow18@gmail.com',
    studentName: 'CampusFlow Admin Test',
    rollNumber: 'STU-2026-LIVE-001',
    password: 'password123'
  });

  console.log('\nTest completed. Please check your campusflow18@gmail.com inbox!');
}

testGmailDispatch();
