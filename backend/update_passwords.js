/**
 * Update Default Demo Passwords Script
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Pass@123',
  database: process.env.DB_NAME || 'campusflow_db'
};

const newPasswords = {
  'superadmin@campusflow.com': 'SuperAdmin@2026',
  'admin@campusflow.com': 'Admin@2026',
  'sales@campusflow.com': 'SalesExec@2026',
  'trainer@campusflow.com': 'Trainer@2026',
  'support@campusflow.com': 'SupportExec@2026',
  'student@campusflow.com': 'Student@2026',
  'janesmith@campusflow.com': 'Student@2026',
  'michael@campusflow.com': 'Student@2026'
};

async function updatePasswords() {
  const conn = await mysql.createConnection(dbConfig);
  console.log('✅ Connected to MySQL to update user passwords');

  try {
    for (const [email, plainPw] of Object.entries(newPasswords)) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(plainPw, salt);

      const [result] = await conn.query(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [hash, email]
      );

      if (result.affectedRows > 0) {
        console.log(`  ✓ Updated password for ${email} -> '${plainPw}'`);
      } else {
        console.log(`  - User ${email} not found in database`);
      }
    }

    // Update any remaining active users to 'CampusFlow@2026' if not listed
    const saltDefault = await bcrypt.genSalt(10);
    const defaultHash = await bcrypt.hash('CampusFlow@2026', saltDefault);
    const [others] = await conn.query(
      'UPDATE users SET password_hash = ? WHERE email NOT IN (?)',
      [defaultHash, Object.keys(newPasswords)]
    );
    if (others.affectedRows > 0) {
      console.log(`  ✓ Updated ${others.affectedRows} other user accounts to 'CampusFlow@2026'`);
    }

    console.log('\n🎉 Password updates completed successfully!');
  } catch (err) {
    console.error('❌ Failed to update passwords:', err.message);
  } finally {
    await conn.end();
  }
}

updatePasswords();
