#!/usr/bin/env node

/**
 * Restructure User Tables Script
 * 
 * This script converts the existing user_data table into separate
 * users and user_passwords tables as expected by our authentication system.
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
  test: 'mad_crm_test'
};

/**
 * Restructure user tables for a specific environment
 */
async function restructureUserTables(environment) {
  const schema = SCHEMAS[environment];
  if (!schema) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log(`🔄 Restructuring user tables in ${environment} (schema: ${schema})`);
    
    // Step 1: Check if user_data table exists and has data
    const userDataCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = 'user_data'
    `, [schema]);
    
    if (userDataCheck.rows.length === 0) {
      console.log(`⚠️  user_data table not found in ${schema}, skipping restructure`);
      return;
    }
    
    const userDataCount = await client.query(`SELECT COUNT(*) FROM "${schema}"."user_data"`);
    console.log(`📊 Found user_data table with ${userDataCount.rows[0].count} rows`);
    
    // Step 2: Create users table if it doesn't exist
    console.log(`🏗️  Creating users table...`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."users" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        city VARCHAR(255),
        state VARCHAR(255),
        center VARCHAR(255),
        contact VARCHAR(15),
        user_role VARCHAR(100),
        user_login VARCHAR(255) UNIQUE,
        user_display_name VARCHAR(255),
        reporting_manager_user_id INTEGER,
        reporting_manager_role_code VARCHAR(100),
        reporting_manager_user_login VARCHAR(255),
        user_created_datetime TIMESTAMP,
        user_updated_datetime TIMESTAMP,
        enabled BOOLEAN DEFAULT true,
        removed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log(`✅ Users table created`);
    
    // Step 3: Create user_passwords table if it doesn't exist  
    console.log(`🏗️  Creating user_passwords table...`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."user_passwords" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "${schema}"."users"(user_id) ON DELETE CASCADE,
        hashed_password VARCHAR(255),
        plain_password VARCHAR(255),
        password_changed_at TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked BOOLEAN DEFAULT false,
        locked_until TIMESTAMP,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log(`✅ User_passwords table created`);
    
    // Step 4: Migrate data from user_data if it exists
    if (parseInt(userDataCount.rows[0].count) > 0) {
      console.log(`📦 Migrating data from user_data table...`);
      
      // Get all data from user_data
      const userData = await client.query(`SELECT * FROM "${schema}"."user_data"`);
      
      for (const row of userData.rows) {
        try {
          // Insert into users table
          await client.query(`
            INSERT INTO "${schema}"."users" (
              user_id, email, city, state, center, contact, user_role, user_login,
              user_display_name, reporting_manager_user_id, reporting_manager_role_code,
              reporting_manager_user_login, user_created_datetime, user_updated_datetime
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (user_id) DO UPDATE SET
              email = EXCLUDED.email,
              city = EXCLUDED.city,
              state = EXCLUDED.state,
              center = EXCLUDED.center,
              contact = EXCLUDED.contact,
              user_role = EXCLUDED.user_role,
              user_login = EXCLUDED.user_login,
              user_display_name = EXCLUDED.user_display_name,
              reporting_manager_user_id = EXCLUDED.reporting_manager_user_id,
              reporting_manager_role_code = EXCLUDED.reporting_manager_role_code,
              reporting_manager_user_login = EXCLUDED.reporting_manager_user_login,
              user_updated_datetime = EXCLUDED.user_updated_datetime
          `, [
            parseInt(parseFloat(row.user_id)), // Convert decimal to integer
            row.email,
            row.city,
            row.state, 
            row.center,
            row.contact,
            row.user_role,
            row.user_login,
            row.user_display_name,
            row.reporting_manager_user_id,
            row.reporting_manager_role_code,
            row.reporting_manager_user_login,
            row.user_created_datetime,
            row.user_updated_datetime
          ]);
          
          // Insert into user_passwords table
          await client.query(`
            INSERT INTO "${schema}"."user_passwords" (
              user_id, plain_password, password_changed_at
            ) VALUES ($1, $2, $3)
            ON CONFLICT (user_id) DO UPDATE SET
              plain_password = EXCLUDED.plain_password,
              password_changed_at = EXCLUDED.password_changed_at
          `, [
            parseInt(parseFloat(row.user_id)),
            row.password || row.updated_password || 'password', // Use default if null
            row.user_updated_datetime || new Date()
          ]);
          
        } catch (error) {
          console.error(`⚠️  Failed to migrate user ${row.user_id}: ${error.message}`);
        }
      }
      
      console.log(`✅ Migrated ${userData.rows.length} users`);
    }
    
    // Step 5: Rename user_data to user_data_backup for safety
    console.log(`📦 Backing up user_data table...`);
    await client.query(`ALTER TABLE "${schema}"."user_data" RENAME TO "user_data_backup"`);
    console.log(`✅ user_data table backed up as user_data_backup`);
    
    // Step 6: Update SequelizeMeta to reflect that users and user_passwords creation migrations are applied
    console.log(`📝 Updating migration status...`);
    
    const usersMigrations = [
      '20250311153222-create_users_table.js',
      '20250311154756-create_user_password.js'
    ];
    
    for (const migration of usersMigrations) {
      await client.query(`
        INSERT INTO "${schema}"."SequelizeMeta" (name) VALUES ($1)
        ON CONFLICT (name) DO NOTHING
      `, [migration]);
    }
    console.log(`✅ Migration status updated`);
    
    console.log(`\n🎉 User table restructuring completed successfully!`);
    console.log(`📊 Summary:`);
    
    // Show final counts
    const usersCount = await client.query(`SELECT COUNT(*) FROM "${schema}"."users"`);
    const passwordsCount = await client.query(`SELECT COUNT(*) FROM "${schema}"."user_passwords"`);
    
    console.log(`   - Users table: ${usersCount.rows[0].count} records`);
    console.log(`   - User_passwords table: ${passwordsCount.rows[0].count} records`);
    console.log(`   - Original user_data backed up as user_data_backup`);
    
  } catch (error) {
    console.error('❌ Failed to restructure user tables:', error.message);
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
    await restructureUserTables(environment);
    
    console.log('\n💡 Next steps:');
    console.log('1. Run: npx sequelize-cli db:migrate:status (to verify migration status)');
    console.log('2. Run: npx sequelize-cli db:migrate (to apply remaining authentication migrations)');
    console.log('3. Test the authentication system');
    
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { restructureUserTables };