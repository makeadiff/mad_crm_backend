const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: 'mad-dalgo-db.cj44c6c8697a.ap-south-1.rds.amazonaws.com',
  port: 5432,
  database: 'mad_dalgo_warehouse',
  user: 'postgres',
  password: 'AWSgonemad123',
  ssl: { require: true, rejectUnauthorized: false }
});

async function checkUserData() {
  try {
    await client.connect();
    
    // Get column info
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'mad_crm_dev' AND table_name = 'user_data' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 user_data table structure:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name} - ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Get sample data
    const sample = await client.query('SELECT * FROM "mad_crm_dev"."user_data" LIMIT 2');
    console.log('\n📋 Sample data:');
    console.log(sample.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUserData();