const express = require('express');
const router = express.Router();
const { getAuditLogs, getActionTypes } = require('../controllers/auditController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);
router.use(authorizeRoles('SUPER_ADMIN')); // Super Admin only (FR-004)

router.get('/', getAuditLogs);
router.get('/actions', getActionTypes);

module.exports = router;
