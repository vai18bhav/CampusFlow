const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;
const DB_PORT = process.env.DB_PORT || 3307;

app.listen(PORT, () => {
  console.log(`
==================================================
CAMPUSFLOW BACKEND SERVER STARTED
==================================================
API Base URL : http://localhost:${PORT}/api
Health Check : http://localhost:${PORT}/api/health
MySQL Port   : ${DB_PORT} (Database: campusflow_db)
Environment  : ${process.env.NODE_ENV || 'development'}
==================================================
  `);
});
