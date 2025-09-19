#!/usr/bin/env node

// Simple CORS test script
const https = require('https');
const http = require('http');

const testCors = (url, description) => {
  console.log(`\n🧪 Testing ${description}: ${url}`);
  
  const client = url.startsWith('https') ? https : http;
  
  const options = {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization, Content-Type'
    }
  };

  const req = client.request(url, options, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    console.log(`📋 CORS Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'Not set'}`);
    console.log(`   Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'Not set'}`);
    console.log(`   Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers'] || 'Not set'}`);
    console.log(`   Access-Control-Allow-Credentials: ${res.headers['access-control-allow-credentials'] || 'Not set'}`);
  });

  req.on('error', (err) => {
    console.log(`❌ Error: ${err.message}`);
  });

  req.end();
};

// Test local server
testCors('http://localhost:3000/api/auth/verify', 'Local Server');

// Test production server
testCors('https://api.ionize13.com/api/auth/verify', 'Production Server');

console.log('\n🔍 CORS Test Complete!');
console.log('If you see proper CORS headers above, the server is configured correctly.');
