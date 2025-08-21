const bcrypt = require('bcryptjs');
const { User, UserPassword } = require('../../../../models');
const logger = require('../../../utils/logger');
const passwordUtils = require('../../../utils/passwordUtils');

// Simple password validation
function validatePassword(password) {
  if (!password) return { isValid: false, errors: ['Password is required'] };
  if (password.length < 8) return { isValid: false, errors: ['Password must be at least 8 characters long'] };
  
  // Allow default password
  if (password === 'password') return { isValid: true, errors: [] };
  
  const errors = [];
  if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain lowercase letter'); 
  if (!/\d/.test(password)) errors.push('Must contain number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Must contain special character');
  
  return { isValid: errors.length === 0, errors };
}


const updateProfilePassword = async (req, res) => {
  console.log('Update password API hit');

  const userId = req.user?.user_id || req.user?.id;
  const { password, passwordCheck } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;

  // Input validation
  if (!password || !passwordCheck) {
    return res.status(400).json({ 
      success: false,
      message: 'New password and confirmation are required.' 
    });
  }

  if (password !== passwordCheck) {
    return res.status(400).json({ 
      success: false,
      message: 'Password confirmation does not match.' 
    });
  }

  // Validate password strength
  const validation = validatePassword(password);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Password validation failed.',
      errors: validation.errors
    });
  }

  try {
    // Get user with password info
    const user = await User.findOne({ 
      where: { user_id: userId },
      include: [{ model: UserPassword, as: 'passwordInfo' }]
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found.' 
      });
    }

    // Prevent demo user password change
    if (user.email === 'admin@demo.com') {
      return res.status(403).json({
        success: false,
        message: "Demo user password cannot be changed",
      });
    }

    // Check if account is active
    if (user.passwordInfo.removed == true) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled',
      });
    }

    let userPassword = user.passwordInfo;
    const isFirstTime = !userPassword;

    // Handle password verification
    if (isFirstTime) {

      // Create new password record
      
      userPassword = await UserPassword.create({
        user_id: user.id,
        password_hash: passwordUtils.getDefaultPassword(), // Will be hashed by model hook
        salt: salt,
        is_default_password: password === 'password',
        password_changed_at: new Date(),
        plaintext_password: password, // TEMPORARY
        login_attempts: 0
      });

    } else {

      // Prevent changing back to default password  
      if (!userPassword.is_default_password && password === 'password') {
        return res.status(400).json({
          success: false,
          message: 'Cannot change back to default password'
        });
      }

      // Update password

      await userPassword.update({
        password_hash: password,
        is_default_password: password === 'password',
        password_changed_at: new Date(),
        plaintext_password: password, // TEMPORARY
        login_attempts: 0 // Reset failed attempts
      });
    }

    console.log(' your hased password ---->', userPassword.password_hash);

    // Log successful password change
    logger.auth('Password changed successfully', {
      user_id: userId,
      email: user.email,
      was_first_time: isFirstTime,
      was_default_password: userPassword.is_default_password || false,
      clientIP
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
      data: {
        password_changed_at: new Date(),
        is_default_password: password === 'password'
      }
    });

  } catch (error) {
    logger.error('Update password error', {
      error: error.message,
      user_id: userId,
      clientIP
    });

    console.error('Error updating password:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating the password.',
      errorMessage: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = updateProfilePassword;
