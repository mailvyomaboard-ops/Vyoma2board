const fs = require('fs');
const http = require('http');

const code = fs.readFileSync('C:/Users/Krrish/OneDrive/Desktop/3rd year/ml/assignment 1/type_analysis.c', 'utf8');

const postData = JSON.stringify({
  code: code,
  language: 'c',
  files: [
    {
      name: 'Pokemon.csv',
      url: '/uploads/1785572811588-14342942-Pokemon.csv'
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/run-code',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
