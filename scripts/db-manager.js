#!/usr/bin/env node

/**
 * Database Manager Script
 * 
 * This script manages database schemas across different environments (dev, staging, prod)
 * 
 * Usage:
 *   node scripts/db-manager.js [command] [environment]
 * 
 * Commands:
 *   create-schema [env]    - Create schema for environment
 *   migrate [env]          - Run migrations for environment
 *   seed [env]             - Run seeds for environment
 *   status [env]           - Check migration status for environment
 *   reset [env]            - Reset schema (drops and recreates)
 *   sync-all               - Sync all environments to same migration status
 * 
 * Examples:
 *   node scripts/db-manager.js create-schema dev
 *   node scripts/db-manager.js migrate staging
 *   node scripts/db-manager.js sync-all
 */

require('dotenv').config();
const { Client } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'mad-dalgo-db.cj44c6c8697a.ap-south-1.rds.amazonaws.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'mad_dalgo_warehouse',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'AWSgonemad123',
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
};

// Schema names for each environment
const SCHEMAS = {
  dev: 'mad_crm_dev',
  development: 'mad_crm_dev',
  staging: 'mad_crm_staging',
  test: 'mad_crm_test',
  prod: 'mad_crm_prod',
  production: 'mad_crm_prod'
};

// Map environment names to NODE_ENV values for Sequelize
const ENV_MAPPING = {
  dev: 'development',
  development: 'development',
  staging: 'staging',
  test: 'test',
  prod: 'production',
  production: 'production'
};

/**
 * Create a PostgreSQL client
 * @returns {Client} PostgreSQL client
 */
function createClient() {
  return new Client(DB_CONFIG);
}

/**
 * Create schema if it doesn't exist
 * @param {string} environment - Environment name
 */
async function createSchema(environment) {
  const schemaName = SCHEMAS[environment];
  if (!schemaName) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  const client = createClient();
  
  try {
    await client.connect();
    console.log(`📦 Creating schema '${schemaName}' for ${environment} environment...`);
    
    // Create schema if not exists
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    
    // Grant permissions
    await client.query(`GRANT ALL ON SCHEMA "${schemaName}" TO ${DB_CONFIG.user}`);
    await client.query(`GRANT ALL ON ALL TABLES IN SCHEMA "${schemaName}" TO ${DB_CONFIG.user}`);
    await client.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA "${schemaName}" TO ${DB_CONFIG.user}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schemaName}" GRANT ALL ON TABLES TO ${DB_CONFIG.user}`);
    await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schemaName}" GRANT ALL ON SEQUENCES TO ${DB_CONFIG.user}`);
    
    console.log(`✅ Schema '${schemaName}' created successfully!`);
    
  } catch (error) {
    console.error(`❌ Failed to create schema '${schemaName}':`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Check if schema exists
 * @param {string} environment - Environment name
 * @returns {boolean} True if schema exists
 */
async function schemaExists(environment) {
  const schemaName = SCHEMAS[environment];
  const client = createClient();
  
  try {
    await client.connect();
    const result = await client.query(
      'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1',
      [schemaName]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Failed to check schema existence:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Run migrations for specific environment
 * @param {string} environment - Environment name
 */
async function runMigrations(environment) {
  const schemaName = SCHEMAS[environment];
  if (!schemaName) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  try {
    // Ensure schema exists first
    if (!(await schemaExists(environment))) {
      console.log(`Schema doesn't exist, creating it first...`);
      await createSchema(environment);
    }

    console.log(`🔄 Running migrations for ${environment} environment (schema: ${schemaName})...`);
    
    // Set NODE_ENV to the correct Sequelize environment
    const nodeEnv = ENV_MAPPING[environment] || environment;
    const env = { ...process.env, NODE_ENV: nodeEnv };
    
    const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate', {
      cwd: path.join(__dirname, '..'),
      env
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log(`✅ Migrations completed for ${environment} environment!`);
    
  } catch (error) {
    console.error(`❌ Migration failed for ${environment}:`, error.message);
    throw error;
  }
}

/**
 * Check migration status for environment
 * @param {string} environment - Environment name
 */
async function migrationStatus(environment) {
  const schemaName = SCHEMAS[environment];
  if (!schemaName) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  try {
    console.log(`📊 Checking migration status for ${environment} environment...`);
    
    const nodeEnv = ENV_MAPPING[environment] || environment;
    const env = { ...process.env, NODE_ENV: nodeEnv };
    
    const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate:status', {
      cwd: path.join(__dirname, '..'),
      env
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
  } catch (error) {
    console.error(`❌ Failed to check migration status for ${environment}:`, error.message);
    throw error;
  }
}

/**
 * Run seeds for specific environment
 * @param {string} environment - Environment name
 */
async function runSeeds(environment) {
  const schemaName = SCHEMAS[environment];
  if (!schemaName) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  // Don't run seeds in production
  if (environment === 'prod' || environment === 'production') {
    console.log('⚠️  Skipping seeds for production environment');
    return;
  }

  try {
    console.log(`🌱 Running seeds for ${environment} environment...`);
    
    const nodeEnv = ENV_MAPPING[environment] || environment;
    const env = { ...process.env, NODE_ENV: nodeEnv };
    
    const { stdout, stderr } = await execAsync('npx sequelize-cli db:seed:all', {
      cwd: path.join(__dirname, '..'),
      env
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log(`✅ Seeds completed for ${environment} environment!`);
    
  } catch (error) {
    console.error(`❌ Seeding failed for ${environment}:`, error.message);
    throw error;
  }
}

/**
 * Reset schema (drop and recreate)
 * @param {string} environment - Environment name
 */
async function resetSchema(environment) {
  const schemaName = SCHEMAS[environment];
  if (!schemaName) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  // Extra safety for production
  if (environment === 'prod' || environment === 'production') {
    console.log('❌ Cannot reset production schema for safety reasons!');
    return;
  }

  const client = createClient();
  
  try {
    await client.connect();
    console.log(`🔥 Resetting schema '${schemaName}' for ${environment} environment...`);
    
    // Drop schema if exists
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    console.log(`🗑️  Dropped schema '${schemaName}'`);
    
    // Recreate schema
    await createSchema(environment);
    
    // Run migrations
    await runMigrations(environment);
    
    // Run seeds (if not production)
    await runSeeds(environment);
    
    console.log(`✅ Schema '${schemaName}' reset successfully!`);
    
  } catch (error) {
    console.error(`❌ Failed to reset schema '${schemaName}':`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Sync all environments to have the same migration status
 */
async function syncAllEnvironments() {
  const environments = ['dev', 'staging', 'prod'];
  
  console.log('🔄 Syncing all environments...');
  
  for (const env of environments) {
    try {
      console.log(`\n--- ${env.toUpperCase()} ENVIRONMENT ---`);
      await createSchema(env);
      await runMigrations(env);
      
      if (env !== 'prod') {
        await runSeeds(env);
      }
      
    } catch (error) {
      console.error(`Failed to sync ${env} environment:`, error.message);
      // Continue with other environments
    }
  }
  
  console.log('\n✅ All environments synced!');
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Database Manager - Multi-Environment Database Schema Management

Usage:
  node scripts/db-manager.js [command] [environment]

Commands:
  create-schema [env]    Create schema for environment
  migrate [env]          Run migrations for environment  
  seed [env]             Run seeds for environment
  status [env]           Check migration status for environment
  reset [env]            Reset schema (drops and recreates) - NOT for production
  sync-all               Sync all environments to same migration status
  help                   Show this help message

Environments:
  dev, development       Development environment (mad_crm_dev schema)
  staging                Staging environment (mad_crm_staging schema)  
  test                   Test environment (mad_crm_test schema)
  prod, production       Production environment (mad_crm_prod schema)

Examples:
  node scripts/db-manager.js create-schema dev
  node scripts/db-manager.js migrate staging
  node scripts/db-manager.js status prod
  node scripts/db-manager.js sync-all
  node scripts/db-manager.js reset dev
  `);
}

/**
 * Main execution function
 */
async function main() {
  const [command, environment] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'create-schema':
        if (!environment) {
          console.error('❌ Environment required for create-schema command');
          process.exit(1);
        }
        await createSchema(environment);
        break;

      case 'migrate':
        if (!environment) {
          console.error('❌ Environment required for migrate command');
          process.exit(1);
        }
        await runMigrations(environment);
        break;

      case 'seed':
        if (!environment) {
          console.error('❌ Environment required for seed command');
          process.exit(1);
        }
        await runSeeds(environment);
        break;

      case 'status':
        if (!environment) {
          console.error('❌ Environment required for status command');
          process.exit(1);
        }
        await migrationStatus(environment);
        break;

      case 'reset':
        if (!environment) {
          console.error('❌ Environment required for reset command');
          process.exit(1);
        }
        await resetSchema(environment);
        break;

      case 'sync-all':
        await syncAllEnvironments();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createSchema,
  runMigrations,
  migrationStatus,
  runSeeds,
  resetSchema,
  syncAllEnvironments
};