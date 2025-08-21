#!/usr/bin/env node

/**
 * Skip Migration Script
 * 
 * Mark a specific migration as applied without running it.
 * Useful when a migration is causing issues but the changes already exist.
 */

require('dotenv').config();
const { Client } = require('pg');

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

const SCHEMAS = {
  dev: 'mad_crm_dev',
  development: 'mad_crm_dev',
  staging: 'mad_crm_staging',
  test: 'mad_crm_test',
  prod: 'public',
  production: 'public'
};

/**
 * Skip a specific migration by marking it as applied
 */
async function skipMigration(environment, migrationName) {
  const schema = SCHEMAS[environment];
  if (!schema) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log(`🔄 Skipping migration: ${migrationName} in ${environment} (schema: ${schema})`);
    
    // Check if already applied
    const result = await client.query(`
      SELECT name FROM "${schema}"."SequelizeMeta" WHERE name = $1
    `, [migrationName]);
    
    if (result.rows.length > 0) {
      console.log(`⚠️  Migration ${migrationName} is already marked as applied`);
      return;
    }
    
    // Mark as applied
    await client.query(`
      INSERT INTO "${schema}"."SequelizeMeta" (name) VALUES ($1)
    `, [migrationName]);
    
    console.log(`✅ Marked ${migrationName} as applied (skipped)`);
    
  } catch (error) {
    console.error('❌ Failed to skip migration:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Main execution
 */
async function main() {
  const environment = process.argv[2];
  const migrationName = process.argv[3];
  
  if (!environment || !migrationName) {
    console.log(`
Skip Migration Script

Usage:
  node scripts/skip-migration.js [environment] [migration-name]

Example:
  node scripts/skip-migration.js dev 20250313212922-update-mou-table.js
    `);
    return;
  }
  
  try {
    await skipMigration(environment, migrationName);
    console.log('\n🎉 Migration skipped successfully!');
    console.log('💡 You can now run: npx sequelize-cli db:migrate');
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { skipMigration };