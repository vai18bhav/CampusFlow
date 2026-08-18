const express = require('express');
const router = express.Router();
const { getTimetable, addSlot, updateSlot, deleteSlot } = require('../controllers/timetableController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/', getTimetable);
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), addSlot);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), updateSlot);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), deleteSlot);

module.exports = router;
