const express = require('express');
const router = express.Router();
const {
  getPermissionOverrides,
  createPermissionOverride,
  revokePermissionOverride
} = require('../controllers/overrideController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);
router.use(authorizeRoles('SUPER_ADMIN')); // Super Admin only (FR-007)

router.get('/', getPermissionOverrides);
router.post('/', createPermissionOverride);
router.delete('/:id', revokePermissionOverride);

module.exports = router;
