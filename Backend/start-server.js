#!/usr/bin/env node

// Simple server startup script with better error handling
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Gym Management Backend Server...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('📝 Please create a .env file with the following variables:');
  console.log('   - MONGODB_URI');
  console.log('   - JWT_SECRET');
  console.log('   - PORT (optional, defaults to 5002)');
  process.exit(1);
}

// Load environment variables
require('dotenv').config();

// Check required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`📊 Port: ${process.env.PORT || 5002}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
console.log(`🗄️ MongoDB URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}\n`);

// Start the server
try {
  console.log('📦 Loading server modules...');
  require('./server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('\n📋 Stack trace:');
  console.error(error.stack);
  process.exit(1);
}