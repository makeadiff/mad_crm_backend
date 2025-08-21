const { User, UserPassword } = require('./models');
const passwordUtils = require('./src/utils/passwordUtils');

async function testFirstTimeLogin() {
  console.log('🧪 Testing First-Time Login Flow...\n');
  
  const testEmail = 'gaurav.thwait@makeadiff.in';
  const defaultPassword = passwordUtils.getDefaultPassword();
  
  try {
    // Step 1: Check if user exists
    console.log('Step 1: Checking if user exists in database...');
    const user = await User.findOne({
      where: { email: testEmail.toLowerCase().trim() },
      include: [{
        model: UserPassword,
        as: 'passwordInfo'
      }]
    });

    if (!user) {
      console.log('❌ User not found in database');
      console.log('   Please ensure the user exists in the user_data table first');
      return;
    }

    console.log('✅ User found:');
    console.log(`   - User ID: ${user.user_id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.user_role}`);
    console.log(`   - Display Name: ${user.user_display_name}`);

    // Step 2: Check role permissions
    const allowedRoles = [
      'Project Associate',
      'Project Lead',
      'Function Lead',
      'CO Full Time',
      'CO Part Time',
      'CXO',
      'CHO,CO Part Time',
    ];

    const hasValidRole = allowedRoles.includes(user.user_role);
    console.log(`   - Role Valid: ${hasValidRole ? '✅' : '❌'} (${user.user_role})`);

    if (!hasValidRole) {
      console.log(`❌ User role "${user.user_role}" is not in allowed roles`);
      console.log('   Allowed roles:', allowedRoles);
      return;
    }

    // Step 3: Check UserPassword record
    console.log('\nStep 2: Checking UserPassword record...');
    const userPassword = user.passwordInfo;
    
    if (!userPassword) {
      console.log('✅ No UserPassword record found (expected for first-time login)');
      console.log(`   - Default password to use: "${defaultPassword}"`);
    } else {
      console.log('⚠️  UserPassword record already exists:');
      console.log(`   - Password Hash: ${userPassword.password_hash ? 'Present' : 'Missing'}`);
      console.log(`   - Is Default Password: ${userPassword.is_default_password}`);
      console.log(`   - Login Attempts: ${userPassword.login_attempts}`);
      console.log(`   - Account Locked: ${userPassword.isAccountLocked ? userPassword.isAccountLocked() : false}`);
    }

    // Step 4: Test password validation logic
    console.log('\nStep 3: Testing password validation...');
    
    if (!userPassword) {
      // First-time login scenario
      const isDefaultPassword = passwordUtils.isDefaultPassword(defaultPassword);
      console.log(`   - Is "${defaultPassword}" the default password: ${isDefaultPassword ? '✅' : '❌'}`);
      
      if (isDefaultPassword) {
        console.log('✅ First-time login should succeed with default password');
        
        // Test creating UserPassword record (dry run)
        console.log('\nStep 4: Testing UserPassword record creation (dry run)...');
        const hashedPassword = await passwordUtils.hashPassword(defaultPassword);
        const salt = await passwordUtils.generateSalt();
        
        console.log('   - Password hashed successfully: ✅');
        console.log('   - Salt generated successfully: ✅');
        console.log('   - Ready to create UserPassword record');
      }
    } else {
      // Existing password record
      const isPasswordValid = await userPassword.verifyPassword(defaultPassword);
      console.log(`   - Default password valid: ${isPasswordValid ? '✅' : '❌'}`);
      
      if (!isPasswordValid) {
        console.log('   - Try other common passwords or check if password was already changed');
      }
    }

    console.log('\n🎉 First-time login test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testFirstTimeLogin().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test error:', error);
  process.exit(1);
});