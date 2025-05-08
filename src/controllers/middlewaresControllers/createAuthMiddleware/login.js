const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { User, UserPassword } = require('../../../../models');

const authUser = require('./authUser');

const login = async (req, res) => {
  console.log('Login API hit');
  const { email, password } = req.body;

  // Validate input
  const schema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate({ email, password });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing credentials.',
      errorMessage: error.message,
    });
  }

  try {
    // Check if user exists
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account with this email found.',
      });
    }

    // Pick correct password (prioritize updated_password)
    const storedPassword = user.updated_password || user.password;

    if (password !== storedPassword) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password.',
      });
    }

    // if (!user.enabled) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Your account is disabled. Contact your administrator.',
    //   });
    // }

    // Get user password record
    // const userPassword = user.passwordInfo;
    // if (!userPassword) {
    //   return res.status(500).json({
    //     success: false,
    //     message: 'User password record not found. Please contact support.',
    //   });
    // }

    // Validate password
    // const isMatch = await bcrypt.compare(userPassword.salt + password, userPassword.password);
    // if (!isMatch) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Incorrect password.',
    //   });
    // }

    // Call authUser for token generation and response handling
    // authUser(req, res, { user, userPassword, password });

    // Proceed to token auth
    authUser(req, res, { user });

    
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong, please try again.',
      errorMessage: err.message,
    });
  }
};

module.exports = login;
