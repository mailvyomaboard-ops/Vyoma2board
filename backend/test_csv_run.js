// Quick test to verify the run-code endpoint with CSV piping
// Run with: node test_csv_run.js  (after starting the backend server)

import http from 'http';
import fs from 'fs';

const code = fs.readFileSync('uploads/1785572823813-360864519-type_analysis.c', 'utf8');

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

console.log('Sending code with Pokemon.csv attached...');
console.log(`Code length: ${code.length} characters`);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\n=== RESULT ===');
      console.log('Success:', result.success);
      if (result.output) {
        console.log('\n--- OUTPUT ---');
        console.log(result.output);
      }
      if (result.errorOutput) {
        console.log('\n--- STDERR ---');
        console.log(result.errorOutput);
      }
      if (result.compileError) {
        console.log('\n--- COMPILE ERROR ---');
        console.log(result.compileError);
      }
      if (result.error) {
        console.log('\n--- ERROR ---');
        console.log(result.error);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Failed to connect: ${e.message}`);
  console.error('Make sure the backend is running: cd backend && npm start');
});

req.write(postData);
req.end();
