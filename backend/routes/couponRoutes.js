const express = require('express');
const router = express.Router();
const {
  createCoupon,
  getCoupons,
  validateCoupon,
  updateCouponStatus,
  deleteCoupon
} = require('../controllers/couponController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateJWT);

// Open validation to all roles (Students can validate, Admins/Sales can validate too)
router.post('/validate', validateCoupon);

// Listing coupons (Super Admin, Admin, Sales Exec)
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), getCoupons);

// Creation, status update, and deletion (Super Admin, Admin, Sales Exec)
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), createCoupon);
router.patch('/:id/status', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), updateCouponStatus);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SALES_EXECUTIVE'), deleteCoupon);

module.exports = router;
