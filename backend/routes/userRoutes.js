const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  getStudents,
  getTrainers,
  updateUser,
  updateUserStatus,
  resetUserPassword,
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
// Only SUPER_ADMIN and ADMIN can create new user accounts (SRS Page 3 - User Management)
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN'), createUser);
router.get('/students', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE', 'TRAINER', 'SUPPORT_EXECUTIVE'), getStudents);
router.get('/trainers', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'STUDENT', 'TRAINER', 'SALES_EXECUTIVE', 'SUPPORT_EXECUTIVE'), getTrainers);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateUser);
router.patch('/:id/status', authorizeRoles('SUPER_ADMIN', 'ADMIN'), updateUserStatus);
router.patch('/:id/reset-password', authorizeRoles('SUPER_ADMIN', 'ADMIN'), resetUserPassword);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), deleteUser);

module.exports = router;
