const fs = require('fs');
const path = require('path');

// Resolve node_modules from backend directory
const backendPath = path.join(__dirname, '../backend');
const mysql = require(path.join(backendPath, 'node_modules/mysql2/promise'));
const bcrypt = require(path.join(backendPath, 'node_modules/bcryptjs'));
const dotenv = require(path.join(backendPath, 'node_modules/dotenv'));

dotenv.config({ path: path.join(backendPath, '.env') });

const dbPort = parseInt(process.env.DB_PORT || '3307', 10);

async function initDatabase() {
  console.log(`Starting CampusFlow Database Initialization on PORT ${dbPort}...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: dbPort,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log(`Connected to MySQL Server on Port ${dbPort}. Executing schema.sql...`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('Schema executed successfully. Database `campusflow_db` and 21 tables created.');

    const defaultPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    console.log('Executing seed.sql with updated bcrypt password hashes...');
    const seedPath = path.join(__dirname, 'seed.sql');
    let seedSql = fs.readFileSync(seedPath, 'utf8');

    seedSql = seedSql.replace(/\$2b\$10\$epAlZ\/5fR8Lq3K0oW0e8OuR\.1Fm1m6q1Q5G8v7g\.H7J1K2L3M4N5O/g, passwordHash);

    await connection.query(seedSql);
    console.log('Database seeded successfully with initial accounts!');
    console.log(`
==================================================
CAMPUSFLOW DATABASE INITIALIZATION COMPLETE!
==================================================
MySQL Port: 3307
Database: campusflow_db
Default Accounts (Password for all: password123):
- Super Admin: superadmin@campusflow.com
- Admin: admin@campusflow.com
- Sales Executive: sales@campusflow.com
- Trainer: trainer@campusflow.com
- Support Executive: support@campusflow.com
- Student: student@campusflow.com
==================================================
    `);
  } catch (error) {
    console.error(`Database initialization failed on Port ${dbPort}:`, error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
