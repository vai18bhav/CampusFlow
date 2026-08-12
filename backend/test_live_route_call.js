const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/notifications/broadcast-notice',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`HTTP Status Code: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error connecting to backend:', e.message);
});

req.write(JSON.stringify({
  title: 'Test Title',
  message: 'Test Content',
  priority: 'GENERAL',
  target_group: 'ALL_STUDENTS'
}));

req.end();
