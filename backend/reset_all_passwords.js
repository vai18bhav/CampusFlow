const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function resetAllPasswords() {
  console.log('🔄 Hashing and updating all user account passwords to "password123"...');
  try {
    const newPasswordHash = await bcrypt.hash('password123', 10);
    const [result] = await pool.query('UPDATE users SET password_hash = ?', [newPasswordHash]);
    console.log(`✅ Successfully updated ${result.affectedRows} user accounts in 'campusflow_db' database.`);
    console.log('🔑 New Password for ALL users: password123\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Password Reset Error:', error.message);
    process.exit(1);
  }
}

resetAllPasswords();
