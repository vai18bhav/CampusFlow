const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3307', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || 'Pass@123';
const dbName = process.env.DB_NAME || 'campusflow_db';

// Support SSL connection for Cloud MySQL (Aiven, TiDB, Clever Cloud, Railway, AWS RDS, etc.)
const isRemoteHost = dbHost !== 'localhost' && dbHost !== '127.0.0.1';
const useSSL = process.env.DB_SSL === 'true' || (process.env.NODE_ENV === 'production' && isRemoteHost);

const poolConfig = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  multipleStatements: true,
  connectTimeout: 20000 // 20s timeout for remote cloud hosts
};

if (useSSL) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = mysql.createPool(poolConfig);

// Test database connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[DATABASE CONNECTED] Successfully connected to MySQL server on host '${dbHost}:${dbPort}', database '${dbName}' (SSL: ${useSSL ? 'Enabled' : 'Disabled'}).`);
    connection.release();
  } catch (error) {
    console.error(`[DATABASE CONNECTION ERROR] Failed to connect to MySQL on '${dbHost}:${dbPort}':`, error.message);
    if (dbHost === 'localhost' || dbHost === '127.0.0.1') {
      console.error(`💡 If running locally, ensure MySQL is running on PORT ${dbPort}. If deploying on Render/Cloud, set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD environment variables in Render dashboard.`);
    } else {
      console.error(`💡 Remote connection failed. Verify your Cloud MySQL host, port, credentials, and IP whitelist.`);
    }
  }
})();

module.exports = pool;
