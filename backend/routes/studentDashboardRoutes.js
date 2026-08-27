const express = require('express');
const router = express.Router();
const { getStudentDashboard } = require('../controllers/studentDashboardController');
const {
  getStudentProfile,
  updateStudentProfile,
  updateStudentPassword,
  getStudentAttendance,
  getStudentBatch,
  getStudentAssignments,
  updateAssignmentCompletion,
  getStudentMocks,
  createMockRequest,
  getMockFeedback,
  getStudentMockCredits,
  getStudentInvoices,
  getStudentInvoiceById,
  downloadStudentInvoicePdf,
  getStudentNotifications,
  markNotificationRead
} = require('../controllers/studentPortalController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);
router.use(authorizeRoles('STUDENT', 'SUPER_ADMIN', 'ADMIN'));

// Dashboard
router.get('/dashboard', getStudentDashboard);
router.get('/', getStudentDashboard);

// Profile & Security
router.get('/profile', getStudentProfile);
router.put('/profile', updateStudentProfile);
router.put('/password', updateStudentPassword);

// Academic & Attendance
router.get('/attendance', getStudentAttendance);
router.get('/batch', getStudentBatch);

// Assignments
router.get('/assignments', getStudentAssignments);
router.put('/assignments/:id/completion', updateAssignmentCompletion);

// Mock Interviews & Credits
router.get('/mocks', getStudentMocks);
router.post('/mocks', createMockRequest);
router.get('/mocks/:id/feedback', getMockFeedback);
router.get('/mock-credits', getStudentMockCredits);

// Finance & Invoices
router.get('/invoices', getStudentInvoices);
router.get('/invoices/:id', getStudentInvoiceById);
router.get('/invoices/:id/download', downloadStudentInvoicePdf);

// Notifications
router.get('/notifications', getStudentNotifications);
router.put('/notifications/:id/read', markNotificationRead);

module.exports = router;
