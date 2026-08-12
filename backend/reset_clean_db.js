const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Pass@123',
  database: process.env.DB_NAME || 'campusflow_db'
};

async function resetCleanDb() {
  console.log('Wiping all dummy test data from CampusFlow database...');
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToTruncate = [
      'audit_logs',
      'notifications',
      'coupons',
      'payments',
      'installments',
      'invoices',
      'mock_interviews',
      'assignment_submissions',
      'assignments',
      'attendance',
      'admissions',
      'inquiries',
      'leads',
      'batch_students',
      'batches',
      'courses',
      'support_executives',
      'sales_executives',
      'trainers',
      'students'
    ];

    for (let table of tablesToTruncate) {
      await connection.query(`TRUNCATE TABLE ${table}`);
      console.log(`✓ Cleared table: ${table}`);
    }

    // Keep basic system accounts (ids 1 to 6) or keep default role structure
    await connection.query('DELETE FROM users WHERE id > 6');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n========================================================');
    console.log('DATABASE SUCCESSFULLY CLEARED! ALL DUMMY DATA REMOVED.');
    console.log('========================================================\n');
  } catch (err) {
    console.error('Error clearing database:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

resetCleanDb();
