const express = require('express');
const router = express.Router();
const { getMockInterviews, scheduleMockInterview, evaluateMockInterview } = require('../controllers/interviewController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/', getMockInterviews);
router.post('/schedule', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), scheduleMockInterview);
router.put('/:id/evaluate', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), evaluateMockInterview);

module.exports = router;
