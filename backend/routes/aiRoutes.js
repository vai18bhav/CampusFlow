const express = require('express');
const router = express.Router();
const { askAITutor } = require('../controllers/aiController');
const { authenticateJWT } = require('../middleware/authMiddleware');

router.use(authenticateJWT);

router.post('/ask', askAITutor);

module.exports = router;
