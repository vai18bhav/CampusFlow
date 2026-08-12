const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getExecutiveSummary,
  getStudentReport,
  getAdmissionReport,
  getCourseReport,
  getBatchReport,
  getAttendanceReport,
  getFinanceReport,
  getPaymentReport,
  getMockInterviewReport,
  getUserReport,
  getChartsData
} = require('../controllers/reportController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// Dashboard legacy metrics
router.get('/dashboard-stats', getDashboardStats);

// Global RBAC restriction: Students cannot access global management reports
const restrictStudent = authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE', 'TRAINER', 'SUPPORT_EXECUTIVE');

router.get('/summary', restrictStudent, getExecutiveSummary);
router.get('/students', restrictStudent, getStudentReport);
router.get('/admissions', restrictStudent, getAdmissionReport);
router.get('/courses', restrictStudent, getCourseReport);
router.get('/batches', restrictStudent, getBatchReport);
router.get('/attendance', restrictStudent, getAttendanceReport);
router.get('/finance', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), getFinanceReport);
router.get('/payments', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), getPaymentReport);
router.get('/interviews', restrictStudent, getMockInterviewReport);
router.get('/users', authorizeRoles('SUPER_ADMIN', 'ADMIN'), getUserReport);
router.get('/charts', restrictStudent, getChartsData);

module.exports = router;
