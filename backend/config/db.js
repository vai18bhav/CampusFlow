const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbPort = parseInt(process.env.DB_PORT || '3307', 10);

if (dbPort !== 3307) {
  console.error(`[CRITICAL CONFIGURATION ERROR] MySQL Port is set to ${dbPort}. CampusFlow STRICTLY requires PORT 3307.`);
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: dbPort,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Pass@123',
  database: process.env.DB_NAME || 'campusflow_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  multipleStatements: true
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[DATABASE CONNECTED] Successfully connected to MySQL server on host '${process.env.DB_HOST || 'localhost'}', port ${dbPort}, database '${process.env.DB_NAME || 'campusflow_db'}'.`);
    connection.release();
  } catch (error) {
    console.error(`[DATABASE CONNECTION ERROR] Failed to connect to MySQL on PORT ${dbPort}:`, error.message);
    console.error(`Verify MySQL service is active on PORT 3307 and database '${process.env.DB_NAME || 'campusflow_db'}' exists.`);
  }
})();

module.exports = pool;
