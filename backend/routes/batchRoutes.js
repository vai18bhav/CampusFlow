const express = require('express');
const router = express.Router();
const {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  toggleBatchStatus,
  addStudentToBatch
} = require('../controllers/batchController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/', getBatches);
router.get('/:id', getBatchById);

router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN'), createBatch);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER'), updateBatch);
router.patch('/:id/status', authorizeRoles('SUPER_ADMIN', 'ADMIN'), toggleBatchStatus);
router.post('/:id/students', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), addStudentToBatch);

module.exports = router;
