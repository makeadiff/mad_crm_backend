#!/usr/bin/env node

/**
 * Safe Development Setup Script
 * 
 * This script safely sets up development environment without affecting production.
 * It creates the dev schema and runs all migrations including the new authentication ones.
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

/**
 * Run command with proper error handling
 */
async function runCommand(command, description, env = 'development') {
  console.log(`🔄 ${description}...`);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: env }
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Logging to console is disabled')) {
      console.error(stderr);
    }
    
    console.log(`✅ ${description} completed successfully!\n`);
    
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

/**
 * Safe development environment setup
 */
async function setupDevelopment() {
  console.log('🚀 Setting up Development Environment Safely');
  console.log('===============================================');
  console.log('This will NOT affect your production data.\n');
  
  try {
    // 1. Create development schema
    await runCommand(
      'node scripts/db-manager.js create-schema dev',
      'Creating development schema (mad_crm_dev)'
    );
    
    // 2. Run all existing migrations first  
    await runCommand(
      'npx sequelize-cli db:migrate',
      'Running existing migrations in development',
      'development'
    );
    
    // 3. Check migration status
    await runCommand(
      'npx sequelize-cli db:migrate:status',
      'Checking migration status',
      'development'
    );
    
    // 4. Test the connection
    await runCommand(
      'node scripts/test-connection.js development',
      'Testing development database connection'
    );
    
    console.log('🎉 Development Environment Setup Complete!');
    console.log('==========================================');
    console.log('✅ Development schema created: mad_crm_dev');
    console.log('✅ All migrations applied to development');
    console.log('✅ Production data remains untouched in public schema');
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('1. Test your application with NODE_ENV=development');
    console.log('2. Run new authentication migrations in development first');
    console.log('3. When ready, apply same migrations to production');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\n🛠️  Troubleshooting:');
    console.error('1. Check your database connection');
    console.error('2. Verify .env file is properly configured'); 
    console.error('3. Ensure database server is accessible');
    process.exit(1);
  }
}

/**
 * Setup staging environment  
 */
async function setupStaging() {
  console.log('🚀 Setting up Staging Environment');
  console.log('==================================');
  
  try {
    // 1. Create staging schema
    await runCommand(
      'node scripts/db-manager.js create-schema staging',
      'Creating staging schema (mad_crm_staging)'
    );
    
    // 2. Run migrations
    await runCommand(
      'npx sequelize-cli db:migrate',
      'Running migrations in staging',
      'staging'
    );
    
    // 3. Test connection
    await runCommand(
      'node scripts/test-connection.js staging',
      'Testing staging database connection'
    );
    
    console.log('✅ Staging Environment Setup Complete!');
    
  } catch (error) {
    console.error('❌ Staging setup failed:', error.message);
    throw error;
  }
}

/**
 * Show current production status (safe read-only check)
 */
async function checkProductionStatus() {
  console.log('📊 Production Environment Status');
  console.log('=================================');
  console.log('(Read-only check - no changes will be made)\n');
  
  try {
    await runCommand(
      'node scripts/test-connection.js production',
      'Checking production database status'
    );
    
    await runCommand(
      'npx sequelize-cli db:migrate:status',
      'Checking production migration status',
      'production'
    );
    
  } catch (error) {
    console.error('❌ Unable to check production status:', error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'dev':
    case 'development':
      await setupDevelopment();
      break;
      
    case 'staging':
      await setupStaging();
      break;
      
    case 'check-prod':
    case 'status':
      await checkProductionStatus();
      break;
      
    case 'all':
      await setupDevelopment();
      await setupStaging(); 
      await checkProductionStatus();
      break;
      
    default:
      console.log(`
Safe Setup Script - Multi-Environment Database Setup

Usage:
  node scripts/safe-setup.js [command]

Commands:
  dev, development    Set up development environment safely
  staging             Set up staging environment
  check-prod, status  Check production status (read-only)
  all                 Set up dev + staging + check prod

Examples:
  node scripts/safe-setup.js dev
  node scripts/safe-setup.js staging
  node scripts/safe-setup.js check-prod
  node scripts/safe-setup.js all

Safety Features:
- Development and staging use separate schemas
- Production continues using existing public schema
- No production data is modified or moved
- All operations can be tested safely first
      `);
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { setupDevelopment, setupStaging, checkProductionStatus };