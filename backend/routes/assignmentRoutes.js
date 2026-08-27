const express = require('express');
const router = express.Router();
const {
  getAssignments,
  getAssignmentById,
  createAssignment,
  submitAssignment,
  getSubmissionsForAssignment,
  evaluateSubmission,
  toggleAssignmentCompletion,
  markStudentAssignmentStatus,
  getTestTemplates,
  createTestTemplate,
  updateTestTemplate,
  deleteTestTemplate,
  reuseTestTemplate
} = require('../controllers/assignmentController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// FR-012 Test Bank Templates (Trainers, Admins, Super Admin)
router.get('/templates', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), getTestTemplates);
router.post('/templates', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), createTestTemplate);
router.put('/templates/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), updateTestTemplate);
router.delete('/templates/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), deleteTestTemplate);
router.post('/templates/:id/reuse', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), reuseTestTemplate);

const { handleFileUpload } = require('../middleware/fileUploadMiddleware');

// Assignment Management (All roles can view, Trainers & Admins create/edit)
router.get('/', getAssignments);
router.get('/:id', getAssignmentById);
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), handleFileUpload('file'), createAssignment);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), handleFileUpload('file'), createAssignment);

// Submissions Roster for a specific assignment (Trainers, Admins)
router.get('/:id/submissions', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), getSubmissionsForAssignment);

// Student Assignment Submission & Toggles
router.post('/:id/submit', authorizeRoles('STUDENT'), handleFileUpload('file'), submitAssignment);
router.post('/submit', authorizeRoles('STUDENT'), handleFileUpload('file'), submitAssignment);
router.patch('/:id/toggle-completion', authorizeRoles('STUDENT'), toggleAssignmentCompletion);

// Manual status marking (Trainer offline tracking)
router.post('/:id/mark-status', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), markStudentAssignmentStatus);

// Review & Evaluate Submission (Trainers, Admins)
router.put('/submissions/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), evaluateSubmission);
router.patch('/submissions/:id/review', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), evaluateSubmission);
router.put('/evaluate/:submission_id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), evaluateSubmission);

module.exports = router;
