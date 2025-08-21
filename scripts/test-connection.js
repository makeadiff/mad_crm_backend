#!/usr/bin/env node

/**
 * Test Database Connection Script
 * 
 * This script tests the database connection for different environments
 * and verifies schema configuration is working correctly.
 * 
 * Usage:
 *   NODE_ENV=development node scripts/test-connection.js
 *   NODE_ENV=staging node scripts/test-connection.js
 *   NODE_ENV=production node scripts/test-connection.js
 */

require('dotenv').config();

const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

async function testConnection(environment) {
  const env = environment || process.env.NODE_ENV || 'development';
  const envConfig = config[env];
  
  if (!envConfig) {
    console.error(`❌ Configuration not found for environment: ${env}`);
    process.exit(1);
  }
  
  console.log(`🔍 Testing connection for ${env.toUpperCase()} environment`);
  console.log(`📦 Schema: ${envConfig.schema}`);
  console.log(`🗄️  Database: ${envConfig.database}`);
  console.log(`🏠 Host: ${envConfig.host}`);
  
  const sequelize = new Sequelize(
    envConfig.database,
    envConfig.username,
    envConfig.password,
    envConfig
  );
  
  try {
    // Test basic connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Test schema access
    const [results] = await sequelize.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = '${envConfig.schema}'
    `);
    
    if (results.length > 0) {
      console.log(`✅ Schema '${envConfig.schema}' exists and is accessible!`);
      
      // Check if SequelizeMeta table exists in this schema
      const [metaResults] = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${envConfig.schema}' 
        AND table_name = 'SequelizeMeta'
      `);
      
      if (metaResults.length > 0) {
        console.log('✅ Migration tracking table (SequelizeMeta) exists');
        
        // Show migration status
        const [migrations] = await sequelize.query(`
          SELECT name FROM "${envConfig.schema}"."SequelizeMeta" ORDER BY name
        `);
        
        if (migrations.length > 0) {
          console.log(`📋 Applied migrations (${migrations.length}):`);
          migrations.forEach(migration => {
            console.log(`   - ${migration.name}`);
          });
        } else {
          console.log('📋 No migrations applied yet');
        }
      } else {
        console.log('⚠️  Migration tracking table not found - no migrations run yet');
      }
      
      // List all tables in this schema
      const [tables] = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${envConfig.schema}'
        ORDER BY table_name
      `);
      
      if (tables.length > 0) {
        console.log(`📊 Tables in schema (${tables.length}):`);
        tables.forEach(table => {
          console.log(`   - ${table.table_name}`);
        });
      } else {
        console.log('📊 No tables found in schema');
      }
      
    } else {
      console.log(`⚠️  Schema '${envConfig.schema}' does not exist yet`);
      console.log('💡 Run: npm run db:create:' + env.replace('development', 'dev'));
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (error.original) {
      console.error('❌ Original error:', error.original.message);
    }
  } finally {
    await sequelize.close();
  }
}

// Main execution
async function main() {
  const environment = process.argv[2];
  
  if (environment) {
    await testConnection(environment);
  } else {
    // Test all environments
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      console.log('\n' + '='.repeat(50));
      await testConnection(env);
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testConnection };