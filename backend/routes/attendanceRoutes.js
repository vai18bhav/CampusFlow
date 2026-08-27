const express = require('express');
const router = express.Router();
const { getBatchAttendance, markAttendance, getStudentAttendanceHistory } = require('../controllers/attendanceController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// ── Batch Attendance Roster ────────────────────────────────────────────────
// SRS: Batch & Attendance Management — Super Admin, Admin, Trainer
// Support Exec and Sales Exec can read for oversight (read-only)
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SUPPORT_EXECUTIVE'), getBatchAttendance);
router.get('/batch', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SUPPORT_EXECUTIVE'), getBatchAttendance);
router.get('/batch/:batchId', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SUPPORT_EXECUTIVE'), getBatchAttendance);

// ── Mark / Update Attendance ──────────────────────────────────────────────
// SRS: Batch & Attendance — Super Admin, Admin, Trainer
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), markAttendance);
router.post('/mark', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), markAttendance);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), markAttendance);

// ── Student Attendance History ────────────────────────────────────────────
// SRS: Own Attendance & Schedule — ALL 6 roles can view their own
// Controller enforces self-access for students; admins can view any student
router.get('/student/:studentId?', getStudentAttendanceHistory);
router.get('/summary/:studentId?', getStudentAttendanceHistory);

module.exports = router;

