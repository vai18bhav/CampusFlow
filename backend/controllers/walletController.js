const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const WELCOME_COINS = 10000;

/**
 * Initialize wallet for a new student with 10,000 welcome coins
 * Called internally from userController on student creation
 */
const initStudentWallet = async (connection, studentId, createdByUserId = null) => {
  // Create wallet with 10,000 coins
  await connection.query(
    'INSERT INTO student_wallet (student_id, coins_balance, total_earned, total_spent) VALUES (?, ?, ?, 0)',
    [studentId, WELCOME_COINS, WELCOME_COINS]
  );
  // Log the welcome credit transaction
  await connection.query(
    `INSERT INTO coin_transactions (student_id, type, coins, balance_after, reason, reference_type, created_by)
     VALUES (?, 'CREDIT', ?, ?, ?, 'WELCOME_BONUS', ?)`,
    [studentId, WELCOME_COINS, WELCOME_COINS, '🎁 Welcome Bonus — 10,000 coins credited on registration', createdByUserId]
  );
};

/**
 * Deduct coins for course enrollment — returns { success, newBalance } or throws
 */
const deductCoinsForEnrollment = async (connection, studentId, courseId, courseName, coinsToDeduct, enrollmentReqId, adminUserId) => {
  const [walletRows] = await connection.query('SELECT * FROM student_wallet WHERE student_id = ? FOR UPDATE', [studentId]);
  if (!walletRows.length) throw new Error('Student wallet not found');

  const wallet = walletRows[0];
  if (wallet.coins_balance < coinsToDeduct) {
    throw new Error(`Insufficient coins. Available: ${wallet.coins_balance} 🪙, Required: ${coinsToDeduct} 🪙`);
  }

  const newBalance = wallet.coins_balance - coinsToDeduct;
  await connection.query(
    'UPDATE student_wallet SET coins_balance = ?, total_spent = total_spent + ? WHERE student_id = ?',
    [newBalance, coinsToDeduct, studentId]
  );
  await connection.query(
    `INSERT INTO coin_transactions (student_id, type, coins, balance_after, reason, reference_type, reference_id, created_by)
     VALUES (?, 'DEBIT', ?, ?, ?, 'ENROLLMENT', ?, ?)`,
    [studentId, coinsToDeduct, newBalance, `📚 Course Enrollment: ${courseName}`, enrollmentReqId, adminUserId]
  );
  return newBalance;
};

/**
 * GET /api/wallet — Student's own wallet balance & transaction history
 */
const getMyWallet = async (req, res) => {
  try {
    const [students] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!students.length) return errorResponse(res, 403, 'Only students can view wallet');
    const studentId = students[0].id;

    const [wallets] = await pool.query('SELECT * FROM student_wallet WHERE student_id = ?', [studentId]);
    const wallet = wallets[0] || { coins_balance: 0, total_earned: 0, total_spent: 0 };

    const [transactions] = await pool.query(
      'SELECT * FROM coin_transactions WHERE student_id = ? ORDER BY created_at DESC LIMIT 50',
      [studentId]
    );

    return successResponse(res, 200, 'Wallet fetched', { wallet, transactions });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch wallet', error.message);
  }
};

/**
 * GET /api/wallet/student/:studentId — Admin views a specific student's wallet
 */
const getStudentWallet = async (req, res) => {
  try {
    const { studentId } = req.params;
    const [wallets] = await pool.query('SELECT * FROM student_wallet WHERE student_id = ?', [studentId]);
    const wallet = wallets[0] || { coins_balance: 0, total_earned: 0, total_spent: 0 };

    const [transactions] = await pool.query(
      'SELECT * FROM coin_transactions WHERE student_id = ? ORDER BY created_at DESC LIMIT 100',
      [studentId]
    );

    return successResponse(res, 200, 'Student wallet fetched', { wallet, transactions });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch wallet', error.message);
  }
};

/**
 * POST /api/wallet/credit — Admin manually adds coins to student wallet
 */
const creditCoins = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { student_id, coins, reason } = req.body;
    if (!student_id || !coins || coins <= 0) return errorResponse(res, 400, 'student_id and positive coins amount are required');

    const [wallets] = await conn.query('SELECT * FROM student_wallet WHERE student_id = ? FOR UPDATE', [student_id]);
    if (!wallets.length) {
      // Initialize wallet if missing
      await initStudentWallet(conn, student_id, req.user.id);
      const [freshWallet] = await conn.query('SELECT * FROM student_wallet WHERE student_id = ?', [student_id]);
      const newBalance = freshWallet[0].coins_balance + coins;
      await conn.query('UPDATE student_wallet SET coins_balance = ?, total_earned = total_earned + ? WHERE student_id = ?', [newBalance, coins, student_id]);
      await conn.query(
        "INSERT INTO coin_transactions (student_id, type, coins, balance_after, reason, reference_type, created_by) VALUES (?, 'CREDIT', ?, ?, ?, 'MANUAL_CREDIT', ?)",
        [student_id, coins, newBalance, reason || 'Admin credited coins', req.user.id]
      );
    } else {
      const newBalance = wallets[0].coins_balance + coins;
      await conn.query('UPDATE student_wallet SET coins_balance = ?, total_earned = total_earned + ? WHERE student_id = ?', [newBalance, coins, student_id]);
      await conn.query(
        "INSERT INTO coin_transactions (student_id, type, coins, balance_after, reason, reference_type, created_by) VALUES (?, 'CREDIT', ?, ?, ?, 'MANUAL_CREDIT', ?)",
        [student_id, coins, newBalance, reason || 'Admin credited coins', req.user.id]
      );
    }

    await conn.commit();
    return successResponse(res, 200, `${coins} coins credited successfully!`);
  } catch (error) {
    await conn.rollback();
    return errorResponse(res, 500, 'Failed to credit coins', error.message);
  } finally {
    conn.release();
  }
};

/**
 * GET /api/wallet/all — Admin sees all student wallets summary
 */
const getAllWallets = async (req, res) => {
  try {
    const [wallets] = await pool.query(
      `SELECT sw.*, u.full_name AS student_name, u.email AS student_email, s.roll_number
       FROM student_wallet sw
       JOIN students s ON sw.student_id = s.id
       JOIN users u ON s.user_id = u.id
       ORDER BY sw.coins_balance DESC`
    );
    return successResponse(res, 200, 'All wallets fetched', { wallets });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch wallets', error.message);
  }
};

module.exports = { initStudentWallet, deductCoinsForEnrollment, getMyWallet, getStudentWallet, creditCoins, getAllWallets };
