#!/usr/bin/env node

/**
 * Test script for Notes API endpoints
 * Run this after setting up the backend to verify everything works
 */

const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function testEndpoint(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    console.log(`${method} ${endpoint}: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      console.log(`  Error: ${result.error || 'Unknown error'}`);
    } else {
      console.log(`  Success: ${result.message || 'OK'}`);
    }
  } catch (error) {
    console.log(`${method} ${endpoint}: Error - ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Testing Notes API Endpoints...\n');

  // Test health check
  await testEndpoint('GET', '/health');

  // Test Notion auth URL (should work without auth)
  await testEndpoint('GET', '/notion/auth-url');

  // Test protected endpoints (should fail without auth)
  await testEndpoint('GET', '/notes');
  await testEndpoint('GET', '/notion/status');

  console.log('\n📝 Note: Protected endpoints require Firebase authentication.');
  console.log('To test with authentication, use the frontend application.');
  console.log('\n✅ Basic API connectivity test complete!');
}

runTests().catch(console.error);
