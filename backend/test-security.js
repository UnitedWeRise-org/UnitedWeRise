#!/usr/bin/env node

/**
 * Security Testing Script for United We Rise API
 * Run this script to test various security measures
 */

const API_BASE = 'http://localhost:3001/api';

// Test rate limiting
async function testRateLimit() {
  console.log('\n🔒 Testing Rate Limiting...');
  
  const promises = [];
  for (let i = 0; i < 7; i++) {
    promises.push(
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      }).then(res => ({
        status: res.status,
        attempt: i + 1
      }))
    );
  }
  
  const results = await Promise.all(promises);
  results.forEach(result => {
    console.log(`Attempt ${result.attempt}: ${result.status} ${result.status === 429 ? '(RATE LIMITED ✅)' : ''}`);
  });
}

// Test input validation
async function testInputValidation() {
  console.log('\n🛡️ Testing Input Validation...');
  
  const testCases = [
    {
      name: 'Invalid Email',
      endpoint: '/auth/register',
      data: { email: 'invalid-email', username: 'test', password: 'Test123!' }
    },
    {
      name: 'Weak Password',
      endpoint: '/auth/register',
      data: { email: 'test@test.com', username: 'test', password: '123' }
    },
    {
      name: 'XSS in Username',
      endpoint: '/auth/register',
      data: { email: 'test@test.com', username: '<script>alert("xss")</script>', password: 'Test123!' }
    },
    {
      name: 'SQL Injection in Email',
      endpoint: '/auth/login',
      data: { email: "'; DROP TABLE users; --", password: 'test' }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      const response = await fetch(`${API_BASE}${testCase.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.data)
      });
      
      const result = await response.json();
      console.log(`${testCase.name}: ${response.status} ${response.status === 400 ? '(VALIDATION BLOCKED ✅)' : '(⚠️ POTENTIAL ISSUE)'}`);
      
      if (response.status === 400 && result.details) {
        console.log(`  Error: ${result.details[0]?.msg || result.error}`);
      }
    } catch (error) {
      console.log(`${testCase.name}: ERROR - ${error.message}`);
    }
  }
}

// Test CORS
async function testCORS() {
  console.log('\n🌐 Testing CORS...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://malicious-site.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    console.log(`CORS Origin Header: ${corsHeader || 'Not Set'}`);
    console.log(`Status: ${response.status} ${corsHeader === 'http://malicious-site.com' ? '(⚠️ ALLOWS ALL ORIGINS)' : '(CORS RESTRICTED ✅)'}`);
  } catch (error) {
    console.log(`CORS Test: ERROR - ${error.message}`);
  }
}

// Test security headers
async function testSecurityHeaders() {
  console.log('\n🔐 Testing Security Headers...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });
    
    const headers = {
      'X-Frame-Options': response.headers.get('x-frame-options'),
      'X-Content-Type-Options': response.headers.get('x-content-type-options'),
      'X-XSS-Protection': response.headers.get('x-xss-protection'),
      'Strict-Transport-Security': response.headers.get('strict-transport-security'),
      'Content-Security-Policy': response.headers.get('content-security-policy')
    };
    
    Object.entries(headers).forEach(([name, value]) => {
      console.log(`${name}: ${value ? '✅ Set' : '⚠️ Missing'}`);
    });
  } catch (error) {
    console.log(`Security Headers Test: ERROR - ${error.message}`);
  }
}

// Test authentication
async function testAuthentication() {
  console.log('\n🔑 Testing Authentication...');
  
  // Test without token
  try {
    const response = await fetch(`${API_BASE}/users/profile`);
    console.log(`No Token: ${response.status} ${response.status === 401 ? '(AUTH REQUIRED ✅)' : '(⚠️ NO AUTH REQUIRED)'}`);
  } catch (error) {
    console.log(`Auth Test: ERROR - ${error.message}`);
  }
  
  // Test with invalid token
  try {
    const response = await fetch(`${API_BASE}/users/profile`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    console.log(`Invalid Token: ${response.status} ${response.status === 401 ? '(INVALID TOKEN REJECTED ✅)' : '(⚠️ ACCEPTS INVALID TOKEN)'}`);
  } catch (error) {
    console.log(`Invalid Token Test: ERROR - ${error.message}`);
  }
}

// Main test runner
async function runSecurityTests() {
  console.log('🚀 Starting Security Tests for United We Rise API');
  console.log('================================================');
  
  try {
    await testRateLimit();
    await testInputValidation();
    await testCORS();
    await testSecurityHeaders();
    await testAuthentication();
    
    console.log('\n✅ Security testing completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Review any ⚠️ warnings above');
    console.log('2. Ensure rate limiting is working (should see 429 status codes)');
    console.log('3. Verify validation is blocking malicious input');
    console.log('4. Check that CORS is properly restricted');
    console.log('5. Confirm all security headers are present');
    
  } catch (error) {
    console.error('Security test failed:', error);
  }
}

// Usage instructions
if (process.argv[2] === '--help') {
  console.log(`
Security Testing Script Usage:

Prerequisites:
1. Start your API server: npm run dev
2. Ensure server is running on http://localhost:3001

Run Tests:
node test-security.js

What This Tests:
- Rate limiting on authentication endpoints
- Input validation and sanitization
- CORS policy enforcement
- Security headers presence
- Authentication middleware

Expected Results:
- Rate limiting should kick in after 5 login attempts
- Invalid input should return 400 status codes
- CORS should reject unauthorized origins
- Security headers should be present
- Unauthenticated requests should return 401
  `);
  process.exit(0);
}

// Run tests if server is available
fetch(`${API_BASE.replace('/api', '')}/health`)
  .then(response => {
    if (response.ok) {
      runSecurityTests();
    } else {
      console.error('❌ API server not responding. Please start the server first:');
      console.error('   cd backend && npm run dev');
    }
  })
  .catch(() => {
    console.error('❌ Cannot connect to API server at http://localhost:3001');
    console.error('   Please start the server first: cd backend && npm run dev');
    console.error('   Or run: node test-security.js --help for usage instructions');
  });