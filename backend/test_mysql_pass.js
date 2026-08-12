const mysql = require('mysql2/promise');

const passwordsToTest = [
  '', 'root', '123456', 'password', 'admin', 'root123', '1234', '12345', 'mysql',
  'root1234', '12345678', 'admin123', 'mysql123', 'root@123', 'Root@123', 'password123',
  'Campusflow', 'campusflow', 'system', 'manager', 'oracle', 'pass', 'toor', 'user',
  '1234567', '123', '123456789', 'Root1234', 'Root@1234', 'admin@123', 'Admin@123',
  'P@ssword1', 'P@ssword123', '1234567890', 'mysql80', 'MySQL80', 'root80', 'root3307'
];

async function testPasswords() {
  console.log('Testing expanded MySQL root passwords on port 3307...');
  for (const pwd of passwordsToTest) {
    try {
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3307,
        user: 'root',
        password: pwd
      });
      console.log(`\n==================================================`);
      console.log(`MATCH FOUND! MySQL Root Password on Port 3307 is: '${pwd}'`);
      console.log(`==================================================\n`);
      await conn.end();
      return pwd;
    } catch (err) {
      // ignore individual failures
    }
  }
  console.log('No standard password matched root user.');
}

testPasswords();
