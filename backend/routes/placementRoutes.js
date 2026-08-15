const express = require('express');
const router = express.Router();
const { getPlacements, addPlacement, updatePlacement, deletePlacement } = require('../controllers/placementController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), getPlacements);
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN'), addPlacement);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), updatePlacement);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), deletePlacement);

module.exports = router;
