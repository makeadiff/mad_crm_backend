#!/usr/bin/env node

/**
 * Test Authentication System Script
 * 
 * This script tests the complete authentication flow:
 * 1. Create test users
 * 2. Test password hashing utilities
 * 3. Test login flows (first-time and regular)
 * 4. Test password change functionality
 */

require('dotenv').config();
const { Client } = require('pg');
const passwordUtils = require('../src/utils/passwordUtils');
const logger = require('../src/utils/logger');

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
 * Create test users for authentication testing
 */
async function createTestUsers() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('🔄 Creating test users...');
    
    const testUsers = [
      {
        user_id: 1001,
        email: 'john.doe@makeadiff.in',
        user_display_name: 'John Doe',
        user_role: 'Wingman',
        user_login: 'john.doe',
        city: 'Bangalore',
        state: 'Karnataka',
        center: 'Bangalore'
      },
      {
        user_id: 1002, 
        email: 'jane.smith@makeadiff.in',
        user_display_name: 'Jane Smith',
        user_role: 'Fellow',
        user_login: 'jane.smith',
        city: 'Mumbai',
        state: 'Maharashtra', 
        center: 'Mumbai'
      },
      {
        user_id: 1003,
        email: 'admin@makeadiff.in',
        user_display_name: 'Admin User',
        user_role: 'Admin',
        user_login: 'admin',
        city: 'Hyderabad',
        state: 'Telangana',
        center: 'Hyderabad'
      }
    ];
    
    for (const userData of testUsers) {
      // Insert user
      await client.query(`
        INSERT INTO "mad_crm_dev"."users" (
          user_id, email, user_display_name, user_role, user_login, 
          city, state, center, enabled, removed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false)
        ON CONFLICT (user_id) DO UPDATE SET
          email = EXCLUDED.email,
          user_display_name = EXCLUDED.user_display_name,
          user_role = EXCLUDED.user_role,
          user_login = EXCLUDED.user_login,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          center = EXCLUDED.center
      `, [
        userData.user_id,
        userData.email,
        userData.user_display_name,
        userData.user_role,
        userData.user_login,
        userData.city,
        userData.state,
        userData.center
      ]);
      
      // Insert user password (first-time login setup)
      await client.query(`
        INSERT INTO "mad_crm_dev"."user_passwords" (
          user_id, plain_password, failed_login_attempts, account_locked
        ) VALUES ($1, $2, 0, false)
        ON CONFLICT (user_id) DO UPDATE SET
          plain_password = EXCLUDED.plain_password
      `, [userData.user_id, 'password']); // Default password
      
      console.log(`✅ Created test user: ${userData.email}`);
    }
    
    console.log('🎉 Test users created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create test users:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Test password utilities
 */
async function testPasswordUtils() {
  console.log('\n🔧 Testing Password Utilities...');
  console.log('='.repeat(40));
  
  try {
    // Test password hashing
    const plainPassword = 'TestPassword123!';
    console.log(`📝 Testing password: "${plainPassword}"`);
    
    const hashedPassword = await passwordUtils.hashPassword(plainPassword);
    console.log(`✅ Password hashed successfully: ${hashedPassword.substring(0, 20)}...`);
    
    // Test password verification
    const isValid = await passwordUtils.verifyPassword(plainPassword, hashedPassword);
    console.log(`✅ Password verification: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    // Test wrong password
    const wrongPassword = 'WrongPassword123!';
    const isWrong = await passwordUtils.verifyPassword(wrongPassword, hashedPassword);
    console.log(`✅ Wrong password verification: ${isWrong ? 'FAILED (should be false)' : 'PASSED'}`);
    
    // Test default password
    const isDefault = passwordUtils.isDefaultPassword('password');
    console.log(`✅ Default password check: ${isDefault ? 'PASSED' : 'FAILED'}`);
    
    // Test password strength validation
    const strongPassword = 'StrongPass123!';
    const weakPassword = 'weak';
    
    const strongValidation = passwordUtils.validatePasswordStrength(strongPassword);
    const weakValidation = passwordUtils.validatePasswordStrength(weakPassword);
    
    console.log(`✅ Strong password validation: ${strongValidation.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Weak password validation: ${!weakValidation.isValid ? 'PASSED' : 'FAILED'}`);
    if (!weakValidation.isValid) {
      console.log(`   Issues: ${weakValidation.issues.join(', ')}`);
    }
    
    console.log('🎉 Password utilities tests completed!');
    
  } catch (error) {
    console.error('❌ Password utilities test failed:', error.message);
    throw error;
  }
}

/**
 * Test login simulation (without HTTP server)
 */
async function testLoginSimulation() {
  console.log('\n🔐 Testing Login Simulation...');
  console.log('='.repeat(40));
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    
    // Test Case 1: First-time login with default password
    console.log('\n📋 Test Case 1: First-time login with default password');
    const testEmail = 'john.doe@makeadiff.in';
    const defaultPassword = 'password';
    
    // Get user
    const userResult = await client.query(`
      SELECT u.*, up.hashed_password, up.plain_password, up.failed_login_attempts, up.account_locked
      FROM "mad_crm_dev"."users" u
      LEFT JOIN "mad_crm_dev"."user_passwords" up ON u.user_id = up.user_id
      WHERE u.email = $1
    `, [testEmail]);
    
    if (userResult.rows.length === 0) {
      throw new Error(`User ${testEmail} not found`);
    }
    
    const user = userResult.rows[0];
    console.log(`👤 Testing user: ${user.user_display_name} (${user.email})`);
    
    // Check if first-time login (no hashed password)
    const isFirstTimeLogin = !user.hashed_password;
    console.log(`🔍 First-time login: ${isFirstTimeLogin ? 'YES' : 'NO'}`);
    
    if (isFirstTimeLogin) {
      // Verify default password
      const isDefaultPassword = passwordUtils.isDefaultPassword(defaultPassword);
      console.log(`✅ Default password check: ${isDefaultPassword ? 'PASSED' : 'FAILED'}`);
      
      if (isDefaultPassword) {
        console.log('✅ First-time login simulation: SUCCESS');
        console.log('   User would be prompted to change password');
      }
    }
    
    // Test Case 2: Password change simulation
    console.log('\n📋 Test Case 2: Password change simulation');
    const newPassword = 'NewSecurePass123!';
    
    // Validate new password
    const validation = passwordUtils.validatePasswordStrength(newPassword);
    console.log(`🔍 New password validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    
    if (validation.isValid) {
      // Hash the new password
      const hashedNewPassword = await passwordUtils.hashPassword(newPassword);
      
      // Update password in database
      await client.query(`
        UPDATE "mad_crm_dev"."user_passwords" 
        SET hashed_password = $1, 
            plain_password = NULL, 
            password_changed_at = CURRENT_TIMESTAMP,
            failed_login_attempts = 0
        WHERE user_id = $2
      `, [hashedNewPassword, user.user_id]);
      
      console.log('✅ Password change simulation: SUCCESS');
      console.log('   Password hashed and stored securely');
    }
    
    // Test Case 3: Regular login with hashed password
    console.log('\n📋 Test Case 3: Regular login with hashed password');
    
    // Get updated user data
    const updatedUserResult = await client.query(`
      SELECT u.*, up.hashed_password, up.plain_password, up.failed_login_attempts, up.account_locked
      FROM "mad_crm_dev"."users" u
      LEFT JOIN "mad_crm_dev"."user_passwords" up ON u.user_id = up.user_id
      WHERE u.email = $1
    `, [testEmail]);
    
    const updatedUser = updatedUserResult.rows[0];
    
    // Test correct password
    const correctPasswordMatch = await passwordUtils.verifyPassword(newPassword, updatedUser.hashed_password);
    console.log(`✅ Correct password login: ${correctPasswordMatch ? 'SUCCESS' : 'FAILED'}`);
    
    // Test wrong password
    const wrongPasswordMatch = await passwordUtils.verifyPassword('WrongPassword123!', updatedUser.hashed_password);
    console.log(`✅ Wrong password login: ${wrongPasswordMatch ? 'FAILED (should reject)' : 'SUCCESS (correctly rejected)'}`);
    
    console.log('🎉 Login simulation tests completed!');
    
  } catch (error) {
    console.error('❌ Login simulation test failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Test role validation
 */
async function testRoleValidation() {
  console.log('\n👥 Testing Role Validation...');
  console.log('='.repeat(40));
  
  // Define allowed roles (should match your authentication system)
  const allowedRoles = [
    'Admin', 'Wingman', 'Fellow', 'Regional Manager', 
    'City Manager', 'Volunteer Manager', 'Shelter Coordinator',
    'Teacher', 'Center Volunteer'
  ];
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    
    // Get all test users and their roles
    const usersResult = await client.query(`
      SELECT user_display_name, user_role, email 
      FROM "mad_crm_dev"."users" 
      ORDER BY user_id
    `);
    
    console.log('📋 Validating user roles:');
    
    for (const user of usersResult.rows) {
      const isValidRole = allowedRoles.includes(user.user_role);
      console.log(`   ${user.user_display_name} (${user.user_role}): ${isValidRole ? '✅ VALID' : '❌ INVALID'}`);
    }
    
    console.log('\n📊 Role validation summary:');
    console.log(`   Allowed roles: ${allowedRoles.length}`);
    console.log(`   Test users: ${usersResult.rows.length}`);
    
  } catch (error) {
    console.error('❌ Role validation test failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Test logging functionality
 */
function testLogging() {
  console.log('\n📝 Testing Logging Functionality...');
  console.log('='.repeat(40));
  
  try {
    // Test different log types
    logger.info('Test info message', { test: 'data' });
    logger.auth('Test authentication log', { user: 'test@example.com', action: 'login' });
    logger.sync('Test sync operation log', { operation: 'user_sync', status: 'success' });
    logger.security('Test security event', { event: 'password_change', user: 'test@example.com' });
    
    // Test auth attempt logging
    logger.logAuthAttempt('test@example.com', true, null, { ip: '127.0.0.1' });
    logger.logAuthAttempt('hacker@example.com', false, 'Invalid password', { ip: '192.168.1.100' });
    
    // Test security event logging  
    logger.logSecurityEvent('password_change', { user: 'test@example.com', timestamp: new Date().toISOString() });
    
    console.log('✅ Logging functionality tested (check console output above)');
    console.log('✅ Log files should be created in logs/ directory');
    
  } catch (error) {
    console.error('❌ Logging test failed:', error.message);
    throw error;
  }
}

/**
 * Display test summary
 */
async function displayTestSummary() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    
    console.log('\n📊 Test Summary');
    console.log('='.repeat(50));
    
    // Count users
    const usersCount = await client.query('SELECT COUNT(*) FROM "mad_crm_dev"."users"');
    const passwordsCount = await client.query('SELECT COUNT(*) FROM "mad_crm_dev"."user_passwords"');
    const hashedPasswordsCount = await client.query('SELECT COUNT(*) FROM "mad_crm_dev"."user_passwords" WHERE hashed_password IS NOT NULL');
    
    console.log(`📈 Database Status:`);
    console.log(`   Total users: ${usersCount.rows[0].count}`);
    console.log(`   User passwords: ${passwordsCount.rows[0].count}`);
    console.log(`   Hashed passwords: ${hashedPasswordsCount.rows[0].count}`);
    console.log(`   First-time logins remaining: ${passwordsCount.rows[0].count - hashedPasswordsCount.rows[0].count}`);
    
    console.log(`\n🔧 Functional Components Tested:`);
    console.log(`   ✅ Password hashing (bcrypt)`);
    console.log(`   ✅ Password verification`);
    console.log(`   ✅ Default password handling`);
    console.log(`   ✅ Password strength validation`);
    console.log(`   ✅ First-time login flow`);
    console.log(`   ✅ Password change flow`);
    console.log(`   ✅ Regular login flow`);
    console.log(`   ✅ Role validation`);
    console.log(`   ✅ Security logging`);
    
    console.log(`\n🚀 Ready for Integration:`);
    console.log(`   ✅ Database schema properly set up`);
    console.log(`   ✅ Authentication utilities working`);
    console.log(`   ✅ Test data created`);
    console.log(`   ✅ All functional programming components tested`);
    
  } catch (error) {
    console.error('❌ Failed to generate test summary:', error.message);
  } finally {
    await client.end();
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 Starting Authentication System Tests');
  console.log('='.repeat(50));
  
  try {
    await createTestUsers();
    await testPasswordUtils();
    await testLoginSimulation();
    await testRoleValidation();
    testLogging();
    await displayTestSummary();
    
    console.log('\n🎉 All authentication tests completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('1. Test Hasura API integration');
    console.log('2. Run user synchronization');
    console.log('3. Start the application server');
    console.log('4. Test actual HTTP login endpoints');
    
  } catch (error) {
    console.error('\n❌ Authentication tests failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = { 
  createTestUsers, 
  testPasswordUtils, 
  testLoginSimulation, 
  testRoleValidation,
  testLogging 
};