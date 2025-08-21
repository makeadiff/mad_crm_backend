const axios = require('axios');
const { User, UserPassword } = require('./models');

async function testLoginAPI() {
  console.log('🚀 Testing First-Time Login API...\n');
  
  const testEmail = 'gaurav.thwait@makeadiff.in';
  const defaultPassword = 'password';
  const apiURL = 'http://localhost:8888/api/login';

  try {
    // Step 1: Check initial state
    console.log('Step 1: Checking initial database state...');
    let user = await User.findOne({
      where: { email: testEmail.toLowerCase().trim() },
      include: [{
        model: UserPassword,
        as: 'passwordInfo'
      }]
    });

    console.log(`✅ User found: ${user.email}`);
    console.log(`   - Has password record: ${user.passwordInfo ? 'Yes' : 'No'}`);

    // Step 2: Make login API call
    console.log('\nStep 2: Making login API request...');
    console.log(`   - URL: ${apiURL}`);
    console.log(`   - Email: ${testEmail}`);
    console.log(`   - Password: ${defaultPassword}`);

    const loginResponse = await axios.post(apiURL, {
      email: testEmail,
      password: defaultPassword
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('\n✅ Login API Response:');
    console.log(`   - Status: ${loginResponse.status}`);
    console.log(`   - Success: ${loginResponse.data.success}`);
    console.log(`   - Message: ${loginResponse.data.message}`);
    
    if (loginResponse.data.result) {
      const result = loginResponse.data.result;
      console.log(`   - User ID: ${result.id}`);
      console.log(`   - Name: ${result.first_name} ${result.last_name}`);
      console.log(`   - Role: ${result.role}`);
      console.log(`   - Token: ${result.token ? 'Generated ✅' : 'Missing ❌'}`);
      console.log(`   - Token Preview: ${result.token ? result.token.substring(0, 50) + '...' : 'N/A'}`);
    }

    // Step 3: Verify UserPassword record was created
    console.log('\nStep 3: Verifying UserPassword record creation...');
    user = await User.findOne({
      where: { email: testEmail.toLowerCase().trim() },
      include: [{
        model: UserPassword,
        as: 'passwordInfo'
      }]
    });

    if (user.passwordInfo) {
      const passwordInfo = user.passwordInfo;
      console.log('✅ UserPassword record created:');
      console.log(`   - User ID: ${passwordInfo.user_id}`);
      console.log(`   - Has password hash: ${passwordInfo.password_hash ? 'Yes' : 'No'}`);
      console.log(`   - Has salt: ${passwordInfo.salt ? 'Yes' : 'No'}`);
      console.log(`   - Is default password: ${passwordInfo.is_default_password}`);
      console.log(`   - Login attempts: ${passwordInfo.login_attempts}`);
      console.log(`   - Last login: ${passwordInfo.last_login_at || 'N/A'}`);
      console.log(`   - Account locked: ${passwordInfo.account_locked_until ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ UserPassword record was not created');
    }

    // Step 4: Test token validation
    if (loginResponse.data.result && loginResponse.data.result.token) {
      console.log('\nStep 4: Testing token validation...');
      const token = loginResponse.data.result.token;
      
      try {
        const protectedResponse = await axios.get('http://localhost:8888/api/setting/listAll', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        console.log('✅ Token validation successful:');
        console.log(`   - Protected endpoint status: ${protectedResponse.status}`);
      } catch (tokenError) {
        if (tokenError.response) {
          console.log(`❌ Token validation failed: ${tokenError.response.status} - ${tokenError.response.data.message}`);
        } else {
          console.log(`❌ Token validation error: ${tokenError.message}`);
        }
      }
    }

    console.log('\n🎉 First-time login API test completed successfully!');

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:');
      console.error(`   - Status: ${error.response.status}`);
      console.error(`   - Message: ${error.response.data.message || error.response.data}`);
      console.error(`   - Details: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection Error: Server is not running on http://localhost:8888');
      console.error('   Please start the server with: npm run dev');
    } else {
      console.error('❌ Test failed:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testLoginAPI().then(() => {
  console.log('\n✅ API test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ API test error:', error);
  process.exit(1);
});