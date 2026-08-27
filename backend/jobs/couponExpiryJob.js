const pool = require('../config/db');
const { sendNotification } = require('../services/notificationService');

/**
 * Checks for sales coupons expiring in 3 days.
 * Notifies the owning Sales Executive (In-App + Email).
 */
const checkExpiringCoupons = async () => {
  try {
    const [coupons] = await pool.query(
      `SELECT c.id, c.code, c.valid_until
       FROM coupons c
       WHERE c.is_active = 1
         AND c.valid_until >= CURRENT_DATE()
         AND c.valid_until <= DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY)`
    );

    // Get all Sales Executive users
    const [salesUsers] = await pool.query(
      `SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'SALES_EXECUTIVE'`
    );

    for (const c of coupons) {
      for (const sUser of salesUsers) {
        await sendNotification({
          userId: sUser.id,
          title: `Coupon Expiring Soon: ${c.code}`,
          message: `Sales coupon ${c.code} is set to expire on ${c.valid_until}.`,
          type: 'COUPON',
          templateCode: 'COUPON_EXPIRING_3DAYS',
          variables: { coupon_code: c.code, expiry_date: c.valid_until },
          referenceType: 'coupon',
          referenceId: c.id,
          sendInApp: true,
          sendEmail: true,
          preventDuplicates: true
        });
      }
    }
  } catch (error) {
    console.error('Coupon Expiry Job Error:', error.message);
  }
};

module.exports = { checkExpiringCoupons };
