const express = require('express');
const router = express.Router();
const { exportData } = require('../controllers/exportController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);
router.use(authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE', 'TRAINER', 'SUPPORT_EXECUTIVE'));

router.get('/:type', exportData);

module.exports = router;
