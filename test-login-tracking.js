const axios = require('axios');
const { User, UserPassword } = require('./models');

async function testLoginTracking() {
  console.log('🔄 Testing Login Attempts & Session Tracking...\n');
  
  const testEmail = 'gaurav.thwait@makeadiff.in';
  const correctPassword = 'password';
  const wrongPassword = 'wrongpassword123';
  const apiURL = 'http://localhost:8888/api/login';

  try {
    // Step 1: Check initial state
    console.log('Step 1: Checking initial login state...');
    let userPassword = await UserPassword.findOne({
      include: [{
        model: User,
        as: 'user',
        where: { email: testEmail }
      }]
    });

    if (userPassword) {
      console.log(`📊 Current state:`);
      console.log(`   - Login attempts: ${userPassword.login_attempts}`);
      console.log(`   - Logged sessions: ${userPassword.loggedSessions ? userPassword.loggedSessions.length : 0} tokens`);
      console.log(`   - Last login: ${userPassword.last_login_at || 'Never'}`);
      console.log(`   - Account locked: ${userPassword.account_locked_until ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ UserPassword record not found');
      return;
    }

    // Step 2: Test failed login attempts
    console.log('\nStep 2: Testing failed login attempts...');
    for (let i = 1; i <= 3; i++) {
      try {
        console.log(`   Attempt ${i}: Wrong password...`);
        await axios.post(apiURL, {
          email: testEmail,
          password: wrongPassword
        });
        console.log('   ❌ Expected failure but got success - something is wrong!');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log(`   ✅ Failed as expected (${error.response.status})`);
        } else {
          console.log(`   ❌ Unexpected error: ${error.message}`);
        }
      }
    }

    // Check login attempts after failures
    userPassword = await UserPassword.findOne({
      include: [{
        model: User,
        as: 'user',
        where: { email: testEmail }
      }]
    });

    console.log(`\n📊 After failed attempts:`);
    console.log(`   - Login attempts: ${userPassword.login_attempts} (should be 3)`);
    console.log(`   - Last failed login: ${userPassword.last_failed_login || 'None'}`);

    // Step 3: Test successful login and session tracking
    console.log('\nStep 3: Testing successful login...');
    const beforeSessions = userPassword.loggedSessions ? [...userPassword.loggedSessions] : [];
    console.log(`   - Sessions before login: ${beforeSessions.length}`);

    try {
      const loginResponse = await axios.post(apiURL, {
        email: testEmail,
        password: correctPassword
      });

      if (loginResponse.data.success) {
        console.log('   ✅ Login successful');
        const newToken = loginResponse.data.result.token;
        console.log(`   - New token generated: ${newToken.substring(0, 30)}...`);

        // Check updated state
        userPassword = await UserPassword.findOne({
          include: [{
            model: User,
            as: 'user',
            where: { email: testEmail }
          }]
        });

        console.log(`\n📊 After successful login:`);
        console.log(`   - Login attempts: ${userPassword.login_attempts} (should be 0)`);
        console.log(`   - Sessions after login: ${userPassword.loggedSessions ? userPassword.loggedSessions.length : 0}`);
        console.log(`   - Last login: ${userPassword.last_login_at}`);

        if (userPassword.loggedSessions && userPassword.loggedSessions.length > beforeSessions.length) {
          console.log('   ✅ New session token was added to loggedSessions');
          const latestToken = userPassword.loggedSessions[userPassword.loggedSessions.length - 1];
          console.log(`   - Latest token preview: ${latestToken.substring(0, 30)}...`);
          
          if (latestToken === newToken) {
            console.log('   ✅ Token in database matches the one returned by API');
          } else {
            console.log('   ❌ Token mismatch between API response and database');
          }
        } else {
          console.log('   ❌ Session token was NOT added to loggedSessions');
        }

      } else {
        console.log('   ❌ Login failed unexpectedly');
      }
    } catch (error) {
      console.log(`   ❌ Login error: ${error.message}`);
    }

    console.log('\n🎉 Login tracking test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLoginTracking().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test error:', error);
  process.exit(1);
});