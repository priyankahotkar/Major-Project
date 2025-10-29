#!/usr/bin/env node

/**
 * Setup script for Notes Integration feature
 * This script helps configure the environment variables and dependencies
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Notes Integration for Mentor Connect...\n');

// Check if required files exist
const requiredFiles = [
  'server/env.example',
  'env.example',
  'package.json'
];

console.log('📋 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

console.log('\n📦 Installing additional dependencies...');
console.log('Run: npm install @notionhq/client express cors dotenv firebase-admin concurrently');
console.log('Run: npm install --save-dev @types/express @types/cors');

console.log('\n🔧 Environment Setup:');
console.log('1. Copy server/env.example to server/.env');
console.log('2. Copy env.example to .env');
console.log('3. Configure Firebase service account credentials');
console.log('4. Set up Notion integration credentials');

console.log('\n🔑 Required Credentials:');
console.log('Firebase Service Account:');
console.log('- Go to Firebase Console → Project Settings → Service Accounts');
console.log('- Generate new private key');
console.log('- Extract credentials from JSON file');

console.log('\nNotion Integration:');
console.log('- Go to https://www.notion.so/my-integrations');
console.log('- Create new integration');
console.log('- Set redirect URI: http://localhost:5173/notes?notion_auth=true');

console.log('\n🚀 Running the Application:');
console.log('Development (both frontend and backend): npm run dev:full');
console.log('Frontend only: npm run dev');
console.log('Backend only: npm run server');

console.log('\n📚 Documentation:');
console.log('See NOTES_INTEGRATION_README.md for detailed setup instructions');

console.log('\n✨ Setup complete! Follow the steps above to configure your environment.');
