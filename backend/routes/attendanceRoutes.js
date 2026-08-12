const express = require('express');
const router = express.Router();
const { getBatchAttendance, markAttendance, getStudentAttendanceHistory } = require('../controllers/attendanceController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// Batch Attendance Roster (Admin, Trainer)
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), getBatchAttendance);
router.get('/batch', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), getBatchAttendance);
router.get('/batch/:batchId', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), getBatchAttendance);

// Mark / Update Attendance (Admin, Trainer)
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), markAttendance);
router.post('/mark', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), markAttendance);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), markAttendance);

// Student Attendance History & Percentage (Students, Trainers, Admins)
router.get('/student/:studentId?', getStudentAttendanceHistory);
router.get('/summary/:studentId?', getStudentAttendanceHistory);

module.exports = router;
