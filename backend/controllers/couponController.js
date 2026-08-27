const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * POST /api/coupons
 * Create a new coupon. Available to Super Admin, Admin, and Sales Executive.
 */
const createCoupon = async (req, res) => {
  try {
    const { code, discount_type, discount_value, valid_until, max_uses, currency, min_order_value } = req.body;

    if (!code || !discount_value) {
      return errorResponse(res, 400, 'Coupon code and discount value are required.');
    }

    const uppercaseCode = code.trim().toUpperCase();

    // Check if code already exists
    const [existing] = await pool.query('SELECT id FROM coupons WHERE code = ?', [uppercaseCode]);
    if (existing.length > 0) {
      return errorResponse(res, 409, 'Coupon code already exists.');
    }

    const type = discount_type || 'PERCENTAGE';
    const val = parseFloat(discount_value);
    const date = valid_until || null;
    const max = parseInt(max_uses) || 100;
    const curr = currency || 'ANY';
    const minVal = parseFloat(min_order_value || 0);

    const [result] = await pool.query(
      'INSERT INTO coupons (code, discount_type, discount_value, valid_until, max_uses, currency, min_order_value, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
      [uppercaseCode, type, val, date, max, curr, minVal]
    );

    return successResponse(res, 201, 'Coupon created successfully.', {
      id: result.insertId,
      code: uppercaseCode,
      discount_type: type,
      discount_value: val,
      valid_until: date,
      max_uses: max,
      currency: curr,
      min_order_value: minVal
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to create coupon', error.message);
  }
};

/**
 * GET /api/coupons
 * List all coupons.
 */
const getCoupons = async (req, res) => {
  try {
    const [coupons] = await pool.query('SELECT * FROM coupons ORDER BY id DESC');
    return successResponse(res, 200, 'Coupons retrieved successfully', { coupons });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch coupons', error.message);
  }
};

/**
 * POST /api/coupons/validate
 * Validate a coupon code.
 */
const validateCoupon = async (req, res) => {
  try {
    const { code, amount, currency } = req.body;

    if (!code) {
      return errorResponse(res, 400, 'Coupon code is required.');
    }

    const uppercaseCode = code.trim().toUpperCase();
    const [coupons] = await pool.query('SELECT * FROM coupons WHERE code = ?', [uppercaseCode]);

    if (coupons.length === 0) {
      return errorResponse(res, 404, 'Coupon code does not exist.');
    }

    const coupon = coupons[0];

    if (!coupon.is_active) {
      return errorResponse(res, 400, 'Coupon is currently inactive.');
    }

    // Check expiry
    if (coupon.valid_until) {
      const expiryDate = new Date(coupon.valid_until);
      // Set to end of the day
      expiryDate.setHours(23, 59, 59, 999);
      if (new Date() > expiryDate) {
        return errorResponse(res, 400, 'Coupon has expired.');
      }
    }

    // Check usage count
    if (coupon.current_uses >= coupon.max_uses) {
      return errorResponse(res, 400, 'Coupon redemption limit has been reached.');
    }

    // Check currency applicability
    if (coupon.currency && coupon.currency !== 'ANY' && currency && coupon.currency.toUpperCase() !== currency.toUpperCase()) {
      return errorResponse(res, 400, `Coupon is only applicable for ${coupon.currency} transactions.`);
    }

    // Check minimum order value
    const orderAmt = parseFloat(amount || 0);
    const minVal = parseFloat(coupon.min_order_value || 0);
    if (orderAmt < minVal) {
      return errorResponse(res, 400, `Minimum course fee threshold of ${minVal} required to apply this coupon.`);
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'PERCENTAGE') {
      discountAmount = orderAmt * (parseFloat(coupon.discount_value) / 100);
    } else {
      discountAmount = parseFloat(coupon.discount_value);
    }

    // Discount cannot exceed original amount
    discountAmount = Math.min(discountAmount, orderAmt);

    return successResponse(res, 200, 'Coupon is valid.', {
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: parseFloat(discountAmount.toFixed(2)),
      final_amount: parseFloat((orderAmt - discountAmount).toFixed(2))
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to validate coupon', error.message);
  }
};

/**
 * PATCH /api/coupons/:id/status
 * Toggle coupon status (ACTIVE/INACTIVE)
 */
const updateCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const [existing] = await pool.query('SELECT id FROM coupons WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 404, 'Coupon not found');
    }

    await pool.query('UPDATE coupons SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
    return successResponse(res, 200, `Coupon status updated to ${is_active ? 'ACTIVE' : 'INACTIVE'}`);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update coupon status', error.message);
  }
};

/**
 * DELETE /api/coupons/:id
 * Delete coupon
 */
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM coupons WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return errorResponse(res, 404, 'Coupon not found');
    }
    return successResponse(res, 200, 'Coupon deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete coupon', error.message);
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  validateCoupon,
  updateCouponStatus,
  deleteCoupon
};
