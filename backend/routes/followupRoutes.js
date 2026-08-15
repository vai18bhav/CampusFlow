const express = require('express');
const router = express.Router();
const { getFollowups, addFollowup, deleteFollowup } = require('../controllers/followupController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/:id/followups', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), getFollowups);
router.post('/:id/followups', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), addFollowup);
router.delete('/followups/:fid', authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteFollowup);

module.exports = router;
