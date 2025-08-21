#!/usr/bin/env node

/**
 * Analyze Existing Production Schema Script
 * 
 * This script analyzes the current production database to understand
 * what schema the existing data is in and plan the migration strategy.
 */

require('dotenv').config();
const { Client } = require('pg');

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

/**
 * Create PostgreSQL client
 */
function createClient() {
  return new Client(DB_CONFIG);
}

/**
 * Analyze existing database structure
 */
async function analyzeExistingSchema() {
  const client = createClient();
  
  try {
    await client.connect();
    console.log('🔍 Analyzing existing database structure...\n');
    
    // 1. List all schemas
    console.log('📋 Available Schemas:');
    const schemasResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    
    for (const schema of schemasResult.rows) {
      console.log(`   - ${schema.schema_name}`);
    }
    
    // 2. Check which schemas have CRM-related tables
    console.log('\n🏗️  CRM Table Analysis:');
    const crmTables = ['users', 'partners', 'meetings', 'invoices', 'quotes', 'payments'];
    
    for (const schema of schemasResult.rows) {
      const schemaName = schema.schema_name;
      
      // Get tables in this schema
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `, [schemaName]);
      
      const tables = tablesResult.rows.map(row => row.table_name);
      const crmTablesInSchema = tables.filter(table => 
        crmTables.some(crmTable => table.toLowerCase().includes(crmTable))
      );
      
      if (tables.length > 0) {
        console.log(`\n   Schema: ${schemaName}`);
        console.log(`   Total Tables: ${tables.length}`);
        console.log(`   CRM Tables: ${crmTablesInSchema.length}`);
        
        if (crmTablesInSchema.length > 0) {
          console.log(`   CRM-related tables found:`);
          for (const table of crmTablesInSchema) {
            // Check row count
            try {
              const countResult = await client.query(`SELECT COUNT(*) FROM "${schemaName}"."${table}"`);
              const rowCount = parseInt(countResult.rows[0].count);
              console.log(`     - ${table}: ${rowCount} rows`);
            } catch (error) {
              console.log(`     - ${table}: (unable to count rows)`);
            }
          }
        }
        
        // Show all tables if not too many
        if (tables.length <= 20) {
          console.log(`   All tables: ${tables.join(', ')}`);
        } else {
          console.log(`   Sample tables: ${tables.slice(0, 10).join(', ')}... (+${tables.length - 10} more)`);
        }
      }
    }
    
    // 3. Check for SequelizeMeta table to understand migration status
    console.log('\n📊 Migration Status Analysis:');
    
    for (const schema of schemasResult.rows) {
      const schemaName = schema.schema_name;
      
      try {
        const metaResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_name = 'SequelizeMeta'
        `, [schemaName]);
        
        if (metaResult.rows.length > 0) {
          console.log(`\n   Schema: ${schemaName} - HAS SequelizeMeta table`);
          
          // Get applied migrations
          const migrationsResult = await client.query(`
            SELECT name FROM "${schemaName}"."SequelizeMeta" ORDER BY name
          `);
          
          console.log(`   Applied migrations: ${migrationsResult.rows.length}`);
          if (migrationsResult.rows.length > 0) {
            console.log(`   Latest migration: ${migrationsResult.rows[migrationsResult.rows.length - 1].name}`);
            if (migrationsResult.rows.length <= 10) {
              console.log(`   All migrations:`);
              migrationsResult.rows.forEach(migration => {
                console.log(`     - ${migration.name}`);
              });
            }
          }
        }
      } catch (error) {
        // Schema might not have SequelizeMeta table
      }
    }
    
    // 4. Check if there are tables in the public schema (default)
    console.log('\n🔍 Public Schema Analysis:');
    try {
      const publicTablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      if (publicTablesResult.rows.length > 0) {
        console.log(`   Public schema has ${publicTablesResult.rows.length} tables`);
        const publicTables = publicTablesResult.rows.map(row => row.table_name);
        const publicCrmTables = publicTables.filter(table => 
          crmTables.some(crmTable => table.toLowerCase().includes(crmTable))
        );
        
        if (publicCrmTables.length > 0) {
          console.log(`   ⚠️  IMPORTANT: Found CRM tables in public schema:`);
          for (const table of publicCrmTables) {
            try {
              const countResult = await client.query(`SELECT COUNT(*) FROM public."${table}"`);
              const rowCount = parseInt(countResult.rows[0].count);
              console.log(`     - ${table}: ${rowCount} rows`);
            } catch (error) {
              console.log(`     - ${table}: (unable to count rows)`);
            }
          }
        }
        
        if (publicTables.length <= 15) {
          console.log(`   All public tables: ${publicTables.join(', ')}`);
        }
      } else {
        console.log(`   Public schema is empty`);
      }
    } catch (error) {
      console.log(`   Unable to analyze public schema: ${error.message}`);
    }
    
    // 5. Recommendations
    console.log('\n💡 Migration Strategy Recommendations:');
    console.log('=====================================');
    
    const publicTablesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const publicTableCount = parseInt(publicTablesResult.rows[0].count);
    
    if (publicTableCount > 0) {
      console.log('🎯 RECOMMENDED APPROACH:');
      console.log('1. Your existing data appears to be in the "public" schema');
      console.log('2. We should:');
      console.log('   a. Set up dev/staging with new schema structure');
      console.log('   b. Test all migrations in dev/staging first');
      console.log('   c. For production: either migrate existing data to mad_crm_prod schema');
      console.log('      OR configure production to continue using public schema temporarily');
      console.log('');
      console.log('⚠️  NEXT STEPS:');
      console.log('1. First set up development environment safely');
      console.log('2. Test all new migrations in development');
      console.log('3. Plan production migration strategy based on your preference');
    } else {
      console.log('✅ No conflicting data found in public schema');
      console.log('✅ Safe to proceed with new schema structure');
    }
    
  } catch (error) {
    console.error('❌ Failed to analyze database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Main execution
if (require.main === module) {
  analyzeExistingSchema().catch(error => {
    console.error('Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { analyzeExistingSchema };