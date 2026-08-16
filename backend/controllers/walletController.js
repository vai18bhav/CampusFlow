const pool = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const WELCOME_COINS = 10000;

/**
 * Initialize wallet for a student with 10,000 welcome coins.
 * Safe to call multiple times — uses INSERT IGNORE to avoid duplicates.
 * Called internally from userController AND as a fallback during enrollment.
 */
const initStudentWallet = async (connection, studentId, createdByUserId = null) => {
  const conn = connection || pool;

  // INSERT IGNORE so it's safe to call even if wallet already exists
  const [result] = await conn.query(
    'INSERT IGNORE INTO student_wallet (student_id, coins_balance, total_earned, total_spent) VALUES (?, ?, ?, 0)',
    [studentId, WELCOME_COINS, WELCOME_COINS]
  );

  // Only log the credit transaction if a new row was actually inserted
  if (result.affectedRows > 0) {
    await conn.query(
      `INSERT INTO coin_transactions (student_id, type, coins, balance_after, reason, reference_type, created_by)
       VALUES (?, 'CREDIT', ?, ?, '🎁 Welcome Bonus — 10,000 coins credited on registration', 'WELCOME_BONUS', ?)`,
      [studentId, WELCOME_COINS, WELCOME_COINS, createdByUserId]
    );
    return true; // wallet was newly created
  }
  return false; // wallet already existed
};

/**
 * Deduct coins from student wallet for course enrollment.
 * If wallet doesn't exist yet (old student), auto-initialize with 10,000 coins first.
 * Returns new balance after deduction.
 */
const deductCoinsForEnrollment = async (connection, studentId, courseId, courseName, coinsToDeduct, enrollmentReqId, adminUserId) => {
  // Try to find wallet — if missing, auto-initialize with 10,000 welcome coins
  const [walletCheck] = await connection.query('SELECT id FROM student_wallet WHERE student_id = ?', [studentId]);
  if (!walletCheck.length) {
    // Give welcome coins retroactively for this student
    await initStudentWallet(connection, studentId, adminUserId);
  }

  // Now lock and read the wallet for the transaction
  const [walletRows] = await connection.query(
    'SELECT * FROM student_wallet WHERE student_id = ? FOR UPDATE',
    [studentId]
  );
  if (!walletRows.length) throw new Error('Wallet initialization failed');

  const wallet = walletRows[0];
  if (wallet.coins_balance < coinsToDeduct) {
    throw new Error(
      `Insufficient coins! Student has ${wallet.coins_balance.toLocaleString()} 🪙 but ${coinsToDeduct.toLocaleString()} 🪙 are needed for this course.`
    );
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
 * Admin: credit extra coins to a student manually (scholarship, bonus, etc.)
 */
const creditCoinsManually = async (connection, studentId, coins, reason, adminUserId) => {
  const conn = connection || pool;
  // Ensure wallet exists
  await initStudentWallet(conn, studentId, adminUserId);

  const [walletRows] = await conn.query(
    'SELECT * FROM student_wallet WHERE student_id = ? FOR UPDATE',
    [studentId]
  );
  const newBalance = walletRows[0].coins_balance + coins;
  await conn.query(
    'UPDATE student_wallet SET coins_balance = ?, total_earned = total_earned + ? WHERE student_id = ?',
    [newBalance, coins, studentId]
  );
  await conn.query(
    `INSERT INTO coin_transactions (student_id, type, coins, balance_after, reason, reference_type, created_by)
     VALUES (?, 'CREDIT', ?, ?, ?, 'MANUAL_CREDIT', ?)`,
    [studentId, coins, newBalance, reason || '💳 Admin credited coins', adminUserId]
  );
  return newBalance;
};

/* ─────────── HTTP Handlers ─────────── */

/**
 * GET /api/wallet/my — Student's own wallet + transactions
 */
const getMyWallet = async (req, res) => {
  try {
    const [students] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!students.length) return errorResponse(res, 403, 'Only students can view wallet');
    const studentId = students[0].id;

    // Auto-init wallet if the student was created before the wallet system
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await initStudentWallet(conn, studentId, null);
      await conn.commit();
    } catch (e) { await conn.rollback(); } finally { conn.release(); }

    const [wallets] = await pool.query('SELECT * FROM student_wallet WHERE student_id = ?', [studentId]);
    const wallet = wallets[0] || { coins_balance: WELCOME_COINS, total_earned: WELCOME_COINS, total_spent: 0 };

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
    await initStudentWallet(null, studentId, null); // ensure wallet exists

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
 * POST /api/wallet/credit — Admin manually credits coins to a student
 */
const creditCoins = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { student_id, coins, reason } = req.body;
    if (!student_id || !coins || coins <= 0) return errorResponse(res, 400, 'student_id and positive coins amount are required');

    const newBalance = await creditCoinsManually(conn, student_id, parseInt(coins), reason, req.user.id);
    await conn.commit();
    return successResponse(res, 200, `🪙 ${coins} coins credited successfully! New balance: ${newBalance.toLocaleString()}`, { new_balance: newBalance });
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

module.exports = {
  initStudentWallet,
  deductCoinsForEnrollment,
  creditCoinsManually,
  getMyWallet,
  getStudentWallet,
  creditCoins,
  getAllWallets
};
