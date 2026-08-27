const express = require('express');
const router = express.Router();
const { exportData } = require('../controllers/exportController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);
router.use(authorizeRoles('SUPER_ADMIN')); // Super Admin only (FR-006)

router.get('/:type', exportData);

module.exports = router;
