const express = require('express');
const router = express.Router();
const {
  getAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  toggleAdmissionStatus
} = require('../controllers/admissionController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/', getAdmissions);
router.get('/:id', getAdmissionById);

router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), createAdmission);
router.post('/register', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), createAdmission);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), updateAdmission);
router.patch('/:id/status', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), toggleAdmissionStatus);

module.exports = router;
