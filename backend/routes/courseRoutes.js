const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  toggleCourseStatus,
  deleteCourse
} = require('../controllers/courseController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// All Course routes require valid JWT Authentication
router.use(authenticateJWT);

// Read Access: All authenticated roles can view courses and course details
router.get('/', getCourses);
router.get('/:id', getCourseById);

// Write / Modify Access: Restricted strictly to SUPER_ADMIN and ADMIN roles
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN'), createCourse);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateCourse);
router.patch('/:id/status', authorizeRoles('SUPER_ADMIN', 'ADMIN'), toggleCourseStatus);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteCourse);

module.exports = router;
