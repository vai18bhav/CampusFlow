const express = require('express');
const router = express.Router();
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  updateStudentStatus,
  deleteStudent
} = require('../controllers/studentController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// GET /api/students — list with filters (Admin, Trainer, Sales Exec can read)
router.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SALES_EXECUTIVE', 'SUPPORT_EXECUTIVE'),
  getStudents
);

// POST /api/students — create student with full admission workflow
router.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  createStudent
);

// GET /api/students/:id
router.get(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SALES_EXECUTIVE', 'SUPPORT_EXECUTIVE'),
  getStudentById
);

// PUT /api/students/:id — update profile
router.put(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateStudent
);

// PATCH /api/students/:id/status — activate/deactivate
router.patch(
  '/:id/status',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  updateStudentStatus
);

// DELETE /api/students/:id — Super Admin only
router.delete(
  '/:id',
  authorizeRoles('SUPER_ADMIN'),
  deleteStudent
);

module.exports = router;
