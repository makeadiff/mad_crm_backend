#!/usr/bin/env node

/**
 * Test Hasura API Integration
 * 
 * This script tests the connection to Hasura API and validates the response format.
 */

require('dotenv').config();
const hasuraApi = require('../src/services/hasuraApiService');

async function testHasuraAPI() {
  console.log('🔍 Testing Hasura API Integration...');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Health Check
    console.log('\n📋 Test 1: API Health Check');
    const health = await hasuraApi.healthCheck();
    
    console.log(`🏥 Health Status: ${health.status}`);
    console.log(`⏱️  Response Time: ${health.responseTime}ms`);
    
    if (health.status === 'healthy') {
      console.log('✅ Hasura API is healthy and reachable');
    } else {
      console.log(`❌ Hasura API is unhealthy: ${health.error}`);
      return;
    }
    
    // Test 2: Fetch Users (limited)
    console.log('\n📋 Test 2: Fetch Users Sample');
    
    try {
      const users = await hasuraApi.fetchUsersPaginated(5, 0); // Get first 5 users
      
      console.log(`📊 Fetched ${users.users.length} users`);
      console.log(`📄 Has More: ${users.hasMore}`);
      console.log(`🔢 Total Count: ${users.totalCount || 'Unknown'}`);
      
      if (users.users.length > 0) {
        console.log('\n📝 Sample User Data:');
        const sampleUser = users.users[0];
        console.log('  Raw API Response:');
        console.log('  ', JSON.stringify(sampleUser, null, 2));
        
        // Test data transformation
        console.log('\n🔄 Testing Data Transformation:');
        const transformed = hasuraApi.transformUserData(sampleUser);
        console.log('  Transformed Data:');
        console.log('  ', JSON.stringify(transformed, null, 2));
        
        console.log('✅ Data transformation successful');
      } else {
        console.log('⚠️  No users returned from API (this might be expected for test environment)');
      }
      
    } catch (error) {
      console.error('❌ User fetch failed:', error.message);
      console.log('💡 This might be due to:');
      console.log('   - Invalid API endpoint');
      console.log('   - Invalid JWT token');
      console.log('   - Network connectivity issues');
      console.log('   - API rate limiting');
    }
    
    // Test 3: API Configuration Validation
    console.log('\n📋 Test 3: Configuration Validation');
    
    console.log(`🔗 Endpoint: ${process.env.HASURA_REST_API_ENDPOINT}`);
    console.log(`🎫 JWT Token: ${process.env.HASURA_JWT_TOKEN ? 'SET (length: ' + process.env.HASURA_JWT_TOKEN.length + ')' : 'NOT SET'}`);
    
    const config = {
      endpoint: !!process.env.HASURA_REST_API_ENDPOINT,
      jwt: !!process.env.HASURA_JWT_TOKEN,
      validEndpoint: process.env.HASURA_REST_API_ENDPOINT && process.env.HASURA_REST_API_ENDPOINT.startsWith('http'),
      validJwt: process.env.HASURA_JWT_TOKEN && process.env.HASURA_JWT_TOKEN.length > 50
    };
    
    console.log(`✅ Configuration Status:`);
    console.log(`   Endpoint Set: ${config.endpoint ? '✅' : '❌'}`);
    console.log(`   JWT Set: ${config.jwt ? '✅' : '❌'}`);
    console.log(`   Valid Endpoint: ${config.validEndpoint ? '✅' : '❌'}`);
    console.log(`   Valid JWT: ${config.validJwt ? '✅' : '❌'}`);
    
    const allValid = Object.values(config).every(Boolean);
    console.log(`🎯 Overall Config: ${allValid ? '✅ VALID' : '❌ INVALID'}`);
    
  } catch (error) {
    console.error('❌ Hasura API test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testHasuraAPI();
}

module.exports = { testHasuraAPI };