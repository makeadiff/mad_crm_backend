/**
 * Authentication Flow Test Script
 * 
 * Simple functional tests to verify authentication flows work correctly
 * Run with: node src/tests/authFlow.test.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const passwordUtils = require('../utils/passwordUtils');
const roleUtils = require('../utils/roleUtils');
const logger = require('../utils/logger');

// Test results tracking
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Simple test framework
function test(name, testFunction) {
  testsRun++;
  try {
    const result = testFunction();
    if (result === true || result === undefined) {
      console.log(`✅ PASS: ${name}`);
      testsPassed++;
    } else {
      console.log(`❌ FAIL: ${name} - ${result}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${name} - ${error.message}`);
    testsFailed++;
  }
}

function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}. ${message}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`Expected true, got false. ${message}`);
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(`Expected false, got true. ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Running Authentication Flow Tests\n');

  // Test 1: Password Utils - Default Password Detection
  test('Default password detection', () => {
    assertTrue(passwordUtils.isDefaultPassword('password'));
    assertFalse(passwordUtils.isDefaultPassword('Password123!'));
  });

  // Test 2: Password Utils - Password Validation
  test('Password validation - valid strong password', () => {
    const result = passwordUtils.validatePasswordStrength('Password123!');
    assertTrue(result.isValid);
    assertEquals(result.issues.length, 0);
  });

  test('Password validation - weak password', () => {
    const result = passwordUtils.validatePasswordStrength('weak');
    assertFalse(result.isValid);
    assertTrue(result.issues.length > 0);
  });

  test('Password validation - default password allowed', () => {
    const result = passwordUtils.validatePasswordStrength('password');
    assertTrue(result.isValid);
  });

  // Test 3: Password Utils - Password Change Validation
  test('Password change validation - valid change', () => {
    const result = passwordUtils.validatePasswordChange('password', 'NewPassword123!');
    assertTrue(result.isValid);
  });

  test('Password change validation - same password rejected', () => {
    const result = passwordUtils.validatePasswordChange('password', 'password');
    assertFalse(result.isValid);
    assertTrue(result.issues.includes('New password must be different from current password'));
  });

  test('Password change validation - cannot revert to default', () => {
    const result = passwordUtils.validatePasswordChange('OldPassword123!', 'password');
    assertFalse(result.isValid);
    assertTrue(result.issues.includes('Cannot change back to default password'));
  });

  // Test 4: Password Utils - Hashing
  test('Password hashing works', async () => {
    const password = 'TestPassword123!';
    const hash = await passwordUtils.hashPassword(password);
    assertTrue(hash !== password, 'Password should be hashed');
    assertTrue(hash.length > 50, 'Hash should be long enough');
  });

  test('Password verification works', async () => {
    const password = 'TestPassword123!';
    const hash = await passwordUtils.hashPassword(password);
    const isValid = await passwordUtils.verifyPassword(password, hash);
    assertTrue(isValid, 'Password verification should work');
  });

  test('Password verification fails for wrong password', async () => {
    const password = 'TestPassword123!';
    const wrongPassword = 'WrongPassword123!';
    const hash = await passwordUtils.hashPassword(password);
    const isValid = await passwordUtils.verifyPassword(wrongPassword, hash);
    assertFalse(isValid, 'Wrong password should fail verification');
  });

  // Test 5: Role Utils - Role Validation
  test('Valid roles are accepted', () => {
    assertTrue(roleUtils.isValidRole('Wingman'));
    assertTrue(roleUtils.isValidRole('Academic Support'));
    assertTrue(roleUtils.isValidRole('Project Lead'));
    assertTrue(roleUtils.isValidRole('super_admin'));
  });

  test('Invalid roles are rejected', () => {
    assertFalse(roleUtils.isValidRole('InvalidRole'));
    assertFalse(roleUtils.isValidRole(''));
    assertFalse(roleUtils.isValidRole(null));
  });

  // Test 6: Role Utils - Role Hierarchy
  test('Role hierarchy levels work', () => {
    assertTrue(roleUtils.getRoleLevel('super_admin') > roleUtils.getRoleLevel('admin'));
    assertTrue(roleUtils.getRoleLevel('admin') > roleUtils.getRoleLevel('manager'));
    assertTrue(roleUtils.getRoleLevel('Project Lead') > roleUtils.getRoleLevel('Wingman'));
  });

  test('Role level permissions work', () => {
    assertTrue(roleUtils.hasRoleLevel('super_admin', 50));
    assertTrue(roleUtils.hasRoleLevel('admin', 50));
    assertFalse(roleUtils.hasRoleLevel('Wingman', 50));
  });

  // Test 7: Role Utils - Permission Checks
  test('Admin access permissions', () => {
    assertTrue(roleUtils.canAccessAdmin('super_admin'));
    assertTrue(roleUtils.canAccessAdmin('admin'));
    assertTrue(roleUtils.canAccessAdmin('manager'));
    assertFalse(roleUtils.canAccessAdmin('Wingman'));
  });

  test('User management permissions', () => {
    assertTrue(roleUtils.canManageUsers('super_admin'));
    assertTrue(roleUtils.canManageUsers('Function Lead'));
    assertFalse(roleUtils.canManageUsers('Project Associate'));
    assertFalse(roleUtils.canManageUsers('Wingman'));
  });

  // Test 8: User Permissions Object
  test('User permissions for valid role', () => {
    const permissions = roleUtils.getUserPermissions('Project Lead');
    assertTrue(permissions.canLogin);
    assertTrue(permissions.canChangePassword);
    assertTrue(permissions.canViewSensitiveData);
    assertTrue(permissions.roleLevel > 0);
  });

  test('User permissions for invalid role', () => {
    const permissions = roleUtils.getUserPermissions('InvalidRole');
    assertFalse(permissions.canLogin);
    assertFalse(permissions.canAccessAdmin);
    assertFalse(permissions.canManageUsers);
  });

  // Test 9: Security Token Generation
  test('Reset token generation', () => {
    const token1 = passwordUtils.generateResetToken();
    const token2 = passwordUtils.generateResetToken();
    assertTrue(token1 !== token2, 'Tokens should be unique');
    assertTrue(token1.length === 64, 'Token should be 64 characters');
  });

  test('Email token generation', () => {
    const token = passwordUtils.generateEmailToken();
    assertTrue(token.length === 64, 'Email token should be 64 characters');
    assertTrue(/^[a-f0-9]+$/.test(token), 'Token should be hexadecimal');
  });

  // Test 10: Token Hashing
  test('Token hashing', () => {
    const token = 'test-token-123';
    const hash = passwordUtils.hashToken(token);
    assertTrue(hash !== token, 'Token should be hashed');
    assertTrue(hash.length === 64, 'SHA256 hash should be 64 characters');
  });

  // Summary
  console.log('\n📊 Test Results:');
  console.log(`Total Tests: ${testsRun}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { test, assertEquals, assertTrue, assertFalse, runTests };