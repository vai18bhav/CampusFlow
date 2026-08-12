const express = require('express');
const router = express.Router();
const { getStudentDashboard } = require('../controllers/studentDashboardController');
const { authenticateJWT } = require('../middleware/authMiddleware');

router.use(authenticateJWT);

router.get('/dashboard', getStudentDashboard);

module.exports = router;
