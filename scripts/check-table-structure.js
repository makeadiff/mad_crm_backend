#!/usr/bin/env node

require('dotenv').config();
const { Client } = require('pg');
const config = require('../config/config.json');

async function checkTableStructure() {
  const client = new Client({
    host: config.development.host,
    port: config.development.port || 5432,
    database: config.development.database,
    user: config.development.username,
    password: config.development.password,
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database...');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'mad_crm_dev' AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nCurrent users table structure:');
    console.table(result.rows);
    
    if (result.rows.length === 0) {
      console.log('\n❌ Users table not found in mad_crm_dev schema');
      
      // Check if table exists in any schema
      const tableCheck = await client.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables 
        WHERE table_name = 'users'
      `);
      
      console.log('\nTables named "users" found:');
      console.table(tableCheck.rows);
    }
  } catch (error) {
    console.error('Error checking table structure:', error.message);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  checkTableStructure();
}

module.exports = { checkTableStructure };