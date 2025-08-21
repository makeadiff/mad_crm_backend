const { User, UserPassword } = require('./models');

async function debugSessions() {
  try {
    const testEmail = 'gaurav.thwait@makeadiff.in';
    
    const userPassword = await UserPassword.findOne({
      include: [{
        model: User,
        as: 'user',
        where: { email: testEmail }
      }]
    });

    if (userPassword) {
      console.log('UserPassword record found:');
      console.log('- ID:', userPassword.id);
      console.log('- User ID:', userPassword.user_id);
      console.log('- LoggedSessions type:', typeof userPassword.loggedSessions);
      console.log('- LoggedSessions value:', userPassword.loggedSessions);
      console.log('- LoggedSessions length:', userPassword.loggedSessions ? userPassword.loggedSessions.length : 'null');
      console.log('- Raw data:', JSON.stringify(userPassword.dataValues, null, 2));
    } else {
      console.log('No UserPassword record found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugSessions();