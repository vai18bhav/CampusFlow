const { checkExpiringCoupons } = require('./couponExpiryJob');
const { checkInstalments } = require('./instalmentReminderJob');
const { checkUpcomingMocks } = require('./mockReminderJob');
const { checkMockCredits } = require('./mockCreditExpiryJob');
const { checkAssignmentDeadlines } = require('./assignmentReminderJob');

/**
 * Executes all scheduled notification jobs.
 */
const runAllNotificationJobs = async () => {
  console.log('⏱️ [CRON SCHEDULER] Running background notification jobs...');
  try {
    await checkExpiringCoupons();
    await checkInstalments();
    await checkUpcomingMocks();
    await checkMockCredits();
    await checkAssignmentDeadlines();
    console.log('✅ [CRON SCHEDULER] Background notification jobs completed cleanly.');
  } catch (error) {
    console.error('❌ [CRON SCHEDULER] Scheduler execution failed:', error.message);
  }
};

/**
 * Initializes background interval scheduler (runs every 15 minutes by default).
 */
const initCronScheduler = (intervalMinutes = 15) => {
  console.log(`🚀 [CRON SCHEDULER] Initializing Notification Cron Scheduler (Interval: ${intervalMinutes}m)`);
  // Run once on startup
  runAllNotificationJobs();
  // Schedule recurring interval
  setInterval(runAllNotificationJobs, intervalMinutes * 60 * 1000);
};

module.exports = {
  runAllNotificationJobs,
  initCronScheduler
};
