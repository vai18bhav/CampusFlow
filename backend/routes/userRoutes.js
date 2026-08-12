const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  getStudents,
  getTrainers,
  updateUser,
  updateUserStatus,
  getPendingApprovals,
  approveUser,
  rejectUser,
  deleteUser,
  getRoles
} = require('../controllers/userController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

router.get('/roles', getRoles);
router.get('/pending-approvals', authorizeRoles('SUPER_ADMIN', 'ADMIN'), getPendingApprovals);
router.put('/:id/approve', authorizeRoles('SUPER_ADMIN', 'ADMIN'), approveUser);
router.put('/:id/reject', authorizeRoles('SUPER_ADMIN', 'ADMIN'), rejectUser);

router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN'), getAllUsers);
// Allow SUPER_ADMIN, ADMIN, TRAINER, and SALES_EXECUTIVE to create/register users/students
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'SALES_EXECUTIVE'), createUser);
router.get('/students', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE', 'TRAINER', 'SUPPORT_EXECUTIVE'), getStudents);
router.get('/trainers', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'STUDENT', 'TRAINER', 'SALES_EXECUTIVE', 'SUPPORT_EXECUTIVE'), getTrainers);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateUser);
router.patch('/:id/status', authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateUserStatus);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteUser);

module.exports = router;
