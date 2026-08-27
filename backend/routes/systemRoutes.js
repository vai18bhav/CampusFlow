const express = require('express');
const router = express.Router();
const { getPlatformConfig, updatePlatformConfig } = require('../controllers/systemController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Get configuration (all authenticated users or public read)
router.get('/', getPlatformConfig);

// Update configuration — Super Admin only (FR-003)
router.put('/', authenticateJWT, authorizeRoles('SUPER_ADMIN'), updatePlatformConfig);

module.exports = router;
