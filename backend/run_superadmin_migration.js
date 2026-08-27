/**
 * Super Admin Module Database Migration
 * Creates platform_config and permission_overrides tables
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

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [dbConfig.database, table]
  );
  return rows[0].cnt > 0;
}

async function run() {
  const conn = await mysql.createConnection(dbConfig);
  console.log('✅ Connected to MySQL for Super Admin Migration');

  try {
    // 1. Create platform_config table
    if (!await tableExists(conn, 'platform_config')) {
      await conn.query(`
        CREATE TABLE platform_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_key VARCHAR(100) NOT NULL UNIQUE,
          config_value LONGTEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('  + Created platform_config table');

      // Seed initial default configurations
      const initialConfigs = [
        ['app_name', 'CampusFlow'],
        ['app_subtitle', 'Enterprise Training & Admissions Portal'],
        ['app_logo_url', '/logo.png'],
        ['default_currency', 'INR'],
        ['course_categories', JSON.stringify(['Full Stack Development', 'Data Science & AI', 'Cloud & DevOps', 'Cyber Security', 'UI/UX Design'])],
        ['batch_categories', JSON.stringify(['Regular Morning', 'Regular Evening', 'Weekend Fast-Track', 'Corporate Batch'])],
        ['system_defaults', JSON.stringify({ default_page_size: 20, enable_welcome_email: true, auto_assign_batch: true })],
        ['email_templates', JSON.stringify({
          welcome_subject: 'Welcome to CampusFlow - Account Activated',
          admission_subject: 'CampusFlow - Admission Confirmation',
          payment_subject: 'CampusFlow - Payment Receipt'
        })]
      ];

      for (const [key, val] of initialConfigs) {
        await conn.query(
          'INSERT INTO platform_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)',
          [key, val]
        );
      }
      console.log('  + Seeded default platform configurations');
    } else {
      console.log('  ✓ platform_config table already exists');
    }

    // 2. Create permission_overrides table
    if (!await tableExists(conn, 'permission_overrides')) {
      await conn.query(`
        CREATE TABLE permission_overrides (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          permission VARCHAR(100) NOT NULL,
          action ENUM('GRANT', 'RESTRICT') NOT NULL DEFAULT 'GRANT',
          expires_at DATETIME NOT NULL,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('  + Created permission_overrides table');
    } else {
      console.log('  ✓ permission_overrides table already exists');
    }

    console.log('\n🎉 Super Admin Migration completed successfully!');
  } catch (err) {
    console.error('\n❌ Super Admin Migration failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
