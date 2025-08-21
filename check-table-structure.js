const { UserPassword, sequelize } = require('./models');

async function checkTableStructure() {
  try {
    console.log('🔍 Checking UserPassword table structure...\n');
    
    // Get table description
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_passwords' 
      AND table_schema = '${process.env.DB_SCHEMA || 'mad_crm_dev'}'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Current table structure:');
    console.log('Column Name\t\tData Type\t\tNullable\tDefault');
    console.log('─'.repeat(80));
    
    results.forEach(col => {
      console.log(`${col.column_name.padEnd(20)}\t${col.data_type.padEnd(15)}\t${col.is_nullable}\t\t${col.column_default || 'NULL'}`);
    });
    
    // Check specific columns of interest
    const loginAttemptsCol = results.find(col => col.column_name === 'login_attempts');
    const loggedSessionsCol = results.find(col => col.column_name === 'loggedSessions');
    
    console.log('\n🔎 Analysis:');
    if (loginAttemptsCol) {
      console.log(`✅ login_attempts column exists: ${loginAttemptsCol.data_type}`);
      if (loginAttemptsCol.data_type !== 'integer') {
        console.log(`⚠️  Expected: integer, Found: ${loginAttemptsCol.data_type}`);
      }
    } else {
      console.log('❌ login_attempts column not found');
    }
    
    if (loggedSessionsCol) {
      console.log(`✅ loggedSessions column exists: ${loggedSessionsCol.data_type}`);
      if (!loggedSessionsCol.data_type.includes('ARRAY') && !loggedSessionsCol.data_type.includes('json')) {
        console.log(`⚠️  Expected: ARRAY or JSON, Found: ${loggedSessionsCol.data_type}`);
      }
    } else {
      console.log('❌ loggedSessions column not found');
    }
    
    // Test creating a record to see what happens
    console.log('\n🧪 Testing record creation...');
    const testRecord = {
      user_id: 999999,
      password_hash: 'test',
      salt: 'test',
      login_attempts: 5,
      loggedSessions: ['token1', 'token2']
    };
    
    console.log('Test data:', testRecord);
    console.log('login_attempts type:', typeof testRecord.login_attempts);
    console.log('loggedSessions type:', typeof testRecord.loggedSessions, Array.isArray(testRecord.loggedSessions));
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTableStructure();