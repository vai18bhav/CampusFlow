const mysql = require('mysql2/promise');

const users = ['root', 'admin', 'campusflow', 'user', 'dev', 'student'];
const passwords = ['', 'root', '123456', 'password', 'admin', 'campusflow', 'Campusflow@123', 'root123', '1234', '12345'];

async function testUsers() {
  for (const user of users) {
    for (const pwd of passwords) {
      try {
        const conn = await mysql.createConnection({
          host: 'localhost',
          port: 3307,
          user: user,
          password: pwd
        });
        console.log(`\n==================================================`);
        console.log(`CONNECTED SUCCESS! User: '${user}', Password: '${pwd}' on Port 3307`);
        console.log(`==================================================\n`);
        await conn.end();
        return;
      } catch (err) {
        // ignore
      }
    }
  }
  console.log('No user/password combination succeeded.');
}

testUsers();
