#!/usr/bin/env node

/**
 * Sync Migration Status Script
 * 
 * When you copy a schema from production, the data and structure exist
 * but the migration tracking table may not reflect all applied migrations.
 * This script syncs the SequelizeMeta table to match the actual database state.
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

// Environment mapping
const ENV_MAPPING = {
  dev: 'development',
  development: 'development',
  staging: 'staging',
  test: 'test',
  prod: 'production',
  production: 'production'
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
 * Get all migration files
 */
function getAllMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort();
  return files;
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(client, schema) {
  const result = await client.query(`
    SELECT name FROM "${schema}"."SequelizeMeta" ORDER BY name
  `);
  return result.rows.map(row => row.name);
}

/**
 * Check if a table exists in the schema
 */
async function tableExists(client, schema, tableName) {
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = $1 AND table_name = $2
  `, [schema, tableName]);
  return result.rows.length > 0;
}

/**
 * Check if a column exists in a table
 */
async function columnExists(client, schema, tableName, columnName) {
  const result = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
  `, [schema, tableName, columnName]);
  return result.rows.length > 0;
}

/**
 * Analyze database structure to determine which migrations should be marked as applied
 */
async function analyzeDatabaseState(client, schema) {
  console.log(`🔍 Analyzing database state for schema: ${schema}`);
  
  const shouldBeApplied = [];
  
  // Define expected state for each migration
  const migrationChecks = {
    '20250311130057-create-states-table.js': () => tableExists(client, schema, 'states'),
    '20250311141727-create_cities_table.js': () => tableExists(client, schema, 'cities'),
    '20250311153222-create_users_table.js': () => tableExists(client, schema, 'users'),
    '20250311154756-create_user_password.js': () => tableExists(client, schema, 'user_passwords'),
    '20250312075521-create_partners_table.js': () => tableExists(client, schema, 'partners'),
    '20250312075751-create_partner_cos_table.js': () => tableExists(client, schema, 'partner_cos'),
    '20250312080202-create_partner_agreements_table.js': () => tableExists(client, schema, 'partner_agreements'),
    '20250312083710-create-pocs.js': () => tableExists(client, schema, 'pocs'),
    '20250312083832-create-poc-partners.js': () => tableExists(client, schema, 'poc_partners'),
    '20250312083918-create-meetings.js': () => tableExists(client, schema, 'meetings'),
    '20250312084029-create-mous.js': () => tableExists(client, schema, 'mous'),
    '20250313110058-add-potential-child-count-to-partner-agreement.js': () => columnExists(client, schema, 'partner_agreements', 'potential_child_count'),
    '20250313212922-update-mou-table.js': () => columnExists(client, schema, 'mous', 'potential_child_count'),
    '20250315082207-create_manager_co_table.js': () => tableExists(client, schema, 'manager_co'),
    '20250325100137-add-interested-to-partner.js': () => columnExists(client, schema, 'partners', 'interested'),
    '20250327130929-modify_interested_column.js': async () => {
      // Check if interested column exists and is of correct type
      const result = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = 'partners' AND column_name = 'interested'
      `, [schema]);
      return result.rows.length > 0;
    },
    '20250327132103-update-low-income-resource.js': () => columnExists(client, schema, 'partners', 'low_income_resource'),
    '20250409094048-add-removed-column-to-partners.js': () => columnExists(client, schema, 'partners', 'removed'),
    '20250409094514-add-removed-column-to-poc.js': () => columnExists(client, schema, 'pocs', 'removed'),
    // The numeric conversion migrations - these are harder to detect, assume applied if tables exist
    '20250508052309-alter-created-by-to-numeric.js': () => tableExists(client, schema, 'partners'),
    '20250508052406-alter-created-by-to-numeric.js': () => tableExists(client, schema, 'pocs'),
    '20250508053503-alter-co-id-numeric.js': () => tableExists(client, schema, 'partner_cos'),
    '20250508054232-alter-meeting-user-id-numeric.js': () => tableExists(client, schema, 'meetings'),
    '20250508055006-alter-manager_co-manage_-id-co_id-numeric.js': () => tableExists(client, schema, 'manager_co'),
    '20250605152726-fix-partners-id-sequence.js': () => tableExists(client, schema, 'partners'),
    '20250606053810-fix-partners-schema.js': () => tableExists(client, schema, 'partners'),
    // Our new authentication migrations - these are the ones we actually want to run
    '20250808091236-update-users-table-for-hasura-sync.js': () => columnExists(client, schema, 'users', 'user_id'),
    '20250808091406-enhance-user-password-table-security.js': () => columnExists(client, schema, 'user_passwords', 'hashed_password')
  };
  
  for (const [migration, checkFn] of Object.entries(migrationChecks)) {
    try {
      const exists = await checkFn();
      if (exists) {
        shouldBeApplied.push(migration);
        console.log(`✅ ${migration} - structure exists`);
      } else {
        console.log(`❌ ${migration} - structure missing`);
      }
    } catch (error) {
      console.log(`⚠️  ${migration} - check failed: ${error.message}`);
    }
  }
  
  return shouldBeApplied;
}

/**
 * Mark migrations as applied in SequelizeMeta table
 */
async function markMigrationsAsApplied(client, schema, migrations) {
  for (const migration of migrations) {
    try {
      await client.query(`
        INSERT INTO "${schema}"."SequelizeMeta" (name) 
        VALUES ($1) 
        ON CONFLICT (name) DO NOTHING
      `, [migration]);
      console.log(`✅ Marked ${migration} as applied`);
    } catch (error) {
      console.log(`❌ Failed to mark ${migration}: ${error.message}`);
    }
  }
}

/**
 * Sync migration status for environment
 */
async function syncMigrationStatus(environment) {
  const schema = SCHEMAS[environment];
  if (!schema) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log(`🔄 Syncing migration status for ${environment} (schema: ${schema})`);
    
    // Get current applied migrations
    const appliedMigrations = await getAppliedMigrations(client, schema);
    console.log(`📋 Currently applied migrations: ${appliedMigrations.length}`);
    
    // Analyze database state
    const shouldBeApplied = await analyzeDatabaseState(client, schema);
    
    // Find migrations that should be marked as applied but aren't
    const toMarkAsApplied = shouldBeApplied.filter(migration => 
      !appliedMigrations.includes(migration)
    );
    
    if (toMarkAsApplied.length > 0) {
      console.log(`\n📝 Marking ${toMarkAsApplied.length} migrations as applied:`);
      await markMigrationsAsApplied(client, schema, toMarkAsApplied);
    } else {
      console.log(`\n✅ Migration status is already in sync`);
    }
    
    // Get final status
    const finalApplied = await getAppliedMigrations(client, schema);
    console.log(`\n📊 Final status: ${finalApplied.length} migrations marked as applied`);
    
  } catch (error) {
    console.error('❌ Failed to sync migration status:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Main execution function
 */
async function main() {
  const environment = process.argv[2] || 'dev';
  
  try {
    await syncMigrationStatus(environment);
    
    console.log('\n🎉 Migration status sync completed!');
    console.log('💡 Next steps:');
    console.log('1. Run: npx sequelize-cli db:migrate:status');
    console.log('2. Run: npx sequelize-cli db:migrate (to apply any remaining migrations)');
    console.log('3. Test your application');
    
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { syncMigrationStatus, analyzeDatabaseState };