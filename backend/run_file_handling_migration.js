const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runFileHandlingMigration() {
  console.log('🔄 Running File Handling Migration & Config Setup...');
  try {
    // 1. Create Upload Directories if they don't exist
    const uploadDirs = [
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'uploads', 'assignments'),
      path.join(__dirname, 'uploads', 'profiles'),
      path.join(__dirname, 'uploads', 'invoices')
    ];

    for (const dir of uploadDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  ✅ Created directory: ${dir}`);
      }
    }

    // 2. Insert/Update platform_config settings
    await pool.query(`
      INSERT INTO platform_config (config_key, config_value)
      VALUES ('MAX_UPLOAD_SIZE_MB', '10')
      ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);
    `);

    await pool.query(`
      INSERT INTO platform_config (config_key, config_value)
      VALUES ('ALLOWED_FILE_FORMATS', 'pdf,jpg,jpeg,png')
      ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);
    `);

    console.log('  ✅ Configured MAX_UPLOAD_SIZE_MB = 10 and ALLOWED_FILE_FORMATS = pdf,jpg,jpeg,png.');
    console.log('🎉 File handling migration completed successfully.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    process.exit(1);
  }
}

runFileHandlingMigration();
