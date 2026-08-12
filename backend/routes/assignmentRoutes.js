const express = require('express');
const router = express.Router();
const {
  getAssignments,
  getAssignmentById,
  createAssignment,
  submitAssignment,
  getSubmissionsForAssignment,
  evaluateSubmission
} = require('../controllers/assignmentController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// Assignment Management (All roles can view, Trainers & Admins create/edit)
router.get('/', getAssignments);
router.get('/:id', getAssignmentById);
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), createAssignment);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), createAssignment);

// Submissions Roster for a specific assignment (Trainers, Admins)
router.get('/:id/submissions', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), getSubmissionsForAssignment);

// Student Assignment Submission
router.post('/:id/submit', authorizeRoles('STUDENT'), submitAssignment);
router.post('/submit', authorizeRoles('STUDENT'), submitAssignment);

// Review & Evaluate Submission (Trainers, Admins)
router.put('/submissions/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), evaluateSubmission);
router.patch('/submissions/:id/review', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), evaluateSubmission);
router.put('/evaluate/:submission_id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), evaluateSubmission);

module.exports = router;
