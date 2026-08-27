/**
 * CampusFlow Migration Script
 * Adds columns and tables for Add Student / Admission workflow
 * Run: node run_migration.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Pass@123',
  database: process.env.DB_NAME || 'campusflow_db'
};

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbConfig.database, table, column]
  );
  return rows[0].cnt > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [dbConfig.database, table]
  );
  return rows[0].cnt > 0;
}

async function fkExists(conn, table, constraintName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [dbConfig.database, table, constraintName]
  );
  return rows[0].cnt > 0;
}

async function run() {
  const conn = await mysql.createConnection(dbConfig);
  console.log('✅ Connected to MySQL');

  try {
    // 1. coupons.currency
    if (!await columnExists(conn, 'coupons', 'currency')) {
      await conn.query("ALTER TABLE coupons ADD COLUMN currency VARCHAR(10) DEFAULT 'ANY' AFTER valid_until");
      console.log('  + Added coupons.currency');
    } else { console.log('  ✓ coupons.currency already exists'); }

    // 2. coupons.min_order_value
    if (!await columnExists(conn, 'coupons', 'min_order_value')) {
      await conn.query("ALTER TABLE coupons ADD COLUMN min_order_value DECIMAL(10,2) DEFAULT 0.00 AFTER currency");
      console.log('  + Added coupons.min_order_value');
    } else { console.log('  ✓ coupons.min_order_value already exists'); }

    // 3. students.mock_interview_credits
    if (!await columnExists(conn, 'students', 'mock_interview_credits')) {
      await conn.query("ALTER TABLE students ADD COLUMN mock_interview_credits INT DEFAULT 0 AFTER address");
      console.log('  + Added students.mock_interview_credits');
    } else { console.log('  ✓ students.mock_interview_credits already exists'); }

    // 4. students.mock_credit_expiry
    if (!await columnExists(conn, 'students', 'mock_credit_expiry')) {
      await conn.query("ALTER TABLE students ADD COLUMN mock_credit_expiry DATE DEFAULT NULL AFTER mock_interview_credits");
      console.log('  + Added students.mock_credit_expiry');
    } else { console.log('  ✓ students.mock_credit_expiry already exists'); }

    // 5. Create admission_links table
    if (!await tableExists(conn, 'admission_links')) {
      await conn.query(`
        CREATE TABLE admission_links (
          id INT AUTO_INCREMENT PRIMARY KEY,
          token VARCHAR(120) NOT NULL UNIQUE,
          sales_exec_id INT,
          course_id INT,
          currency ENUM('INR','USD','ANY') DEFAULT 'ANY',
          status ENUM('ACTIVE','EXPIRED','USED') DEFAULT 'ACTIVE',
          expires_at DATETIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (sales_exec_id) REFERENCES sales_executives(id) ON DELETE SET NULL,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('  + Created admission_links table');
    } else { console.log('  ✓ admission_links table already exists'); }

    // 6. Extend admissions.status enum
    await conn.query(`
      ALTER TABLE admissions
      MODIFY COLUMN status ENUM(
        'PENDING','CONFIRMED','CANCELLED','COMPLETED',
        'SENT','OPENED','IN_PROGRESS','SUBMITTED','APPROVED','REJECTED'
      ) DEFAULT 'PENDING'
    `);
    console.log('  ✓ Updated admissions.status enum');

    // 7. admissions.admission_link_id
    if (!await columnExists(conn, 'admissions', 'admission_link_id')) {
      await conn.query("ALTER TABLE admissions ADD COLUMN admission_link_id INT DEFAULT NULL AFTER lead_id");
      console.log('  + Added admissions.admission_link_id');
    } else { console.log('  ✓ admissions.admission_link_id already exists'); }

    // 8. admissions.currency
    if (!await columnExists(conn, 'admissions', 'currency')) {
      await conn.query("ALTER TABLE admissions ADD COLUMN currency ENUM('INR','USD','ANY') DEFAULT 'ANY' AFTER status");
      console.log('  + Added admissions.currency');
    } else { console.log('  ✓ admissions.currency already exists'); }

    // 9. admissions.coupon_code
    if (!await columnExists(conn, 'admissions', 'coupon_code')) {
      await conn.query("ALTER TABLE admissions ADD COLUMN coupon_code VARCHAR(50) DEFAULT NULL AFTER currency");
      console.log('  + Added admissions.coupon_code');
    } else { console.log('  ✓ admissions.coupon_code already exists'); }

    // 10. Add FK for admission_link_id
    if (!await fkExists(conn, 'admissions', 'fk_admission_link')) {
      try {
        await conn.query(`
          ALTER TABLE admissions
          ADD CONSTRAINT fk_admission_link
          FOREIGN KEY (admission_link_id) REFERENCES admission_links(id) ON DELETE SET NULL
        `);
        console.log('  + Added FK fk_admission_link');
      } catch (fkErr) {
        console.log('  ⚠ FK already exists or skipped:', fkErr.message);
      }
    } else { console.log('  ✓ fk_admission_link already exists'); }

    // 11. invoices.net_amount
    if (!await columnExists(conn, 'invoices', 'net_amount')) {
      await conn.query("ALTER TABLE invoices ADD COLUMN net_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER tax_amount");
      console.log('  + Added invoices.net_amount');
    } else { console.log('  ✓ invoices.net_amount already exists'); }

    // 12. invoices.invoice_date
    if (!await columnExists(conn, 'invoices', 'invoice_date')) {
      await conn.query("ALTER TABLE invoices ADD COLUMN invoice_date DATE DEFAULT NULL AFTER paid_amount");
      console.log('  + Added invoices.invoice_date');
    } else { console.log('  ✓ invoices.invoice_date already exists'); }

    console.log('\n🎉 Migration completed successfully!');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
