const express = require('express');
const router = express.Router();
const { getEnrollmentRequests, createEnrollmentRequest, approveEnrollment, rejectEnrollment } = require('../controllers/enrollmentController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// Students: view own requests & submit new request
router.get('/', getEnrollmentRequests);
router.post('/', authorizeRoles('STUDENT'), createEnrollmentRequest);

// Admin / Super Admin: approve or reject
router.patch('/:id/approve', authorizeRoles('SUPER_ADMIN', 'ADMIN'), approveEnrollment);
router.patch('/:id/reject', authorizeRoles('SUPER_ADMIN', 'ADMIN'), rejectEnrollment);

module.exports = router;
