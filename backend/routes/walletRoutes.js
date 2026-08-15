const express = require('express');
const router = express.Router();
const { getMyWallet, getStudentWallet, creditCoins, getAllWallets } = require('../controllers/walletController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// Student: view own wallet & transactions
router.get('/my', authorizeRoles('STUDENT'), getMyWallet);

// Admin: view all wallets, view specific student wallet, credit coins
router.get('/all', authorizeRoles('SUPER_ADMIN', 'ADMIN'), getAllWallets);
router.get('/student/:studentId', authorizeRoles('SUPER_ADMIN', 'ADMIN'), getStudentWallet);
router.post('/credit', authorizeRoles('SUPER_ADMIN', 'ADMIN'), creditCoins);

module.exports = router;
