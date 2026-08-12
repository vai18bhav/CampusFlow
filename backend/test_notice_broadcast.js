const pool = require('./config/db');
const { sendBroadcastNoticeEmail } = require('./utils/emailService');

async function testNoticeBroadcast() {
  console.log('Testing Admin Notice Broadcast System & Gmail Dispatch...\n');

  await sendBroadcastNoticeEmail({
    toEmail: 'campusflow18@gmail.com',
    recipientName: 'CampusFlow Student Member',
    noticeTitle: 'End Semester Exam Schedule & Project Submission Deadline',
    priority: 'URGENT',
    content: 'All students are hereby notified that the final semester practical project submissions are due by Aug 28, 2026. Please verify your lab attendance registers.',
    senderName: 'Super Admin Office'
  });

  console.log('\nBroadcast email test completed cleanly! Check your campusflow18@gmail.com inbox!');
}

testNoticeBroadcast();
