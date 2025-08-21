const Joi = require('joi');
const { User, UserPassword } = require('../../../../models');
const passwordUtils = require('../../../utils/passwordUtils');
const logger = require('../../../utils/logger');
const authUser = require('./authUser');

const allowedRoles = [
  'Project Associate',
  'Project Lead',
  'Function Lead',
  'CO Full Time',
  'CO Part Time',
  'CXO',
  'CHO,CO Part Time',
];

// Helper to check if user has a valid role
function hasValidRole(user) {
  return allowedRoles.includes(user.user_role);
}

/**
 * Enhanced Login Controller with Security Features
 * 
 * Authentication Flow:
 * 1. Validate input and check user exists
 * 2. Verify user role is allowed to access platform
 * 3. Check if account is locked
 * 4. Handle first-time login with default password
 * 5. Verify password and update login tracking
 * 6. Generate JWT token and proceed
 */
const login = async (req, res) => {
  console.log("Login controller invoked--------------------------------------------");
  const startTime = Date.now();
  const { email, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;

  // Validate input
  const schema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(1)
      .required()
      .messages({
        'any.required': 'Password is required',
        'string.min': 'Password cannot be empty'
      }),
  });

  const { error } = schema.validate({ email, password });
  if (error) {
    logger.auth('Invalid login input', { 
      email, 
      error: error.message,
      clientIP 
    }, 'warn');
    
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing credentials.',
      errorMessage: error.message,
    });
  }

  try {
    console.log("----------------------login hitted-----------------------")
    // Step 1: Check if user exists
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [{
        model: UserPassword,
        as: 'passwordInfo'
      }]
    });

    //  console.log('User found:', user);

    if (!user) {
      logger.auth('Login attempt for non-existent user', {
        email,
        clientIP
      }, 'warn');

      // Use generic message to prevent user enumeration
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

  
    // Step 2: Check if user role is allowed
    if (!hasValidRole(user)) {
      logger.security('Login attempt by user with invalid role', {
        email,
        user_role: user.user_role,
        clientIP
      });

      return res.status(403).json({
        success: false,
        message: 'You do not have access to log in.',
      });
    }

    // Step 4: Handle password authentication
    let userPassword = user.passwordInfo;
    let isFirstTimeLogin = false;

    if (!userPassword) {
      // First-time login - user must use default password
      isFirstTimeLogin = true;
      
      if (!passwordUtils.isDefaultPassword(password)) {
        logger.auth('First-time login attempt with non-default password', {
          email,
          clientIP
        });

        await updateFailedLoginAttempt(user, clientIP);
        
        return res.status(401).json({
          success: false,
          message: 'For your first login, please use the default password. Contact your administrator if you need assistance.',
        });
      }

      // Create password record for first-time user
      userPassword = await UserPassword.create({
        user_id: parseInt(user.user_id),
        password_hash: passwordUtils.getDefaultPassword(), // Will be hashed by model hook
        salt: await passwordUtils.generateSalt(),
        is_default_password: true,
        plaintext_password: passwordUtils.getDefaultPassword(), // TEMPORARY
        login_attempts: 0,
        emailVerified: false,
      });

      logger.auth('First-time login password record created', {
        email,
        user_id: user.user_id,
        clientIP
      });

    } else {
      // Step 3: Check if account is disabled or removed
      if (userPassword.removed) {
        logger.security('Login attempt for disabled/removed user', {
          email,
          enabled: userPassword.enabled,
          removed: userPassword.removed,
          clientIP
        });

        return res.status(403).json({
          success: false,
          message: 'Your account is disabled. Contact your administrator.',
        });
      }

      // Step 5: Check if account is locked
      if (userPassword.isAccountLocked && userPassword.isAccountLocked()) {
        const lockTime = userPassword.account_locked_until;
        logger.security('Login attempt for locked account', {
          email,
          locked_until: lockTime,
          clientIP
        });

        return res.status(423).json({
          success: false,
          message: `Account is temporarily locked due to multiple failed login attempts. Please try again after ${lockTime.toLocaleString()}.`,
        });
      }

      console.log('User password from body info:', password);
      // Step 6: Verify password
      const isPasswordValid = await userPassword.verifyPassword(password);
      
      if (!isPasswordValid) {
        logger.auth('Failed login attempt - invalid password', {
          email,
          is_default_password: userPassword.is_default_password,
          login_attempts: userPassword.login_attempts + 1,
          clientIP
        });

        // Record failed login
        await userPassword.recordLogin(false);

        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }
    }

    // Step 7: Successful authentication - update login tracking
    await userPassword.recordLogin(true);

    // Calculate login duration
    const loginDuration = Date.now() - startTime;

    logger.auth('Successful login', {
      email,
      user_id: user.user_id,
      user_role: user.user_role,
      is_first_time_login: isFirstTimeLogin,
      is_default_password: userPassword.is_default_password,
      login_duration_ms: loginDuration,
      clientIP
    });

    // Step 8: Generate JWT and proceed with authentication
    const authPayload = {
      user,
      userPassword,
      isFirstTimeLogin,
      requiresPasswordChange: userPassword.is_default_password
    };

    // Call authUser for token generation and response handling
    authUser(req, res, authPayload);

  } catch (err) {
    logger.error('Login controller error', {
      email,
      error: err.message,
      stack: err.stack,
      clientIP
    });

    return res.status(500).json({
      success: false,
      message: 'Something went wrong, please try again.',
      errorMessage: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  }
};

/**
 * Update failed login attempt for user without UserPassword record
 * @param {Object} user - User instance
 * @param {string} clientIP - Client IP address
 */
async function updateFailedLoginAttempt(user, clientIP) {
  try {
    // Create a temporary record to track failed attempts
    const existingRecord = await UserPassword.findOne({ where: { user_id: parseInt(user.user_id) } });
    
    if (!existingRecord) {
      await UserPassword.create({
        user_id: parseInt(user.user_id),
        password_hash: 'temp', // Placeholder
        salt: 'temp', // Placeholder
        is_default_password: true,
        login_attempts: 1,
        last_failed_login: new Date(),
      });
    }
  } catch (error) {
    logger.error('Failed to update login attempt tracking', {
      error: error.message,
      user_id: user.user_id,
      clientIP
    });
  }
}

module.exports = login;
