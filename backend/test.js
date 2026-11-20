const http = require('http');

const data = JSON.stringify({
  code: '#include <stdio.h>\nint main() { printf("Hello from test!"); return 0; }',
  language: 'c'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/run-code',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let responseData = '';
  res.on('data', d => {
    responseData += d;
  });
  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', error => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
