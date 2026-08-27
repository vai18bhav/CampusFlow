const pool = require('./config/db');

async function runTrainerMigration() {
  try {
    console.log('Running Trainer Module Schema Extension...');

    // 1. Create test_templates table for FR-012 Predefined Test Bank
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trainer_id INT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        attachment_url VARCHAR(255) NULL,
        is_mandatory TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Created/verified "test_templates" table');

    console.log('🎉 Trainer Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
    process.exit(1);
  }
}

runTrainerMigration();
