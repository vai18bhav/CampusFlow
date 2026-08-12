const express = require('express');
const router = express.Router();
const { login, logout, forgotPassword, registerStudent, getProfile, changePassword } = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/register-student', registerStudent);
router.post('/register', registerStudent);

router.get('/me', authenticateJWT, getProfile);
router.put('/change-password', authenticateJWT, changePassword);

module.exports = router;
