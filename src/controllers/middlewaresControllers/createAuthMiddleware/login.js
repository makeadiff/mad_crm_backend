// const Joi = require('joi');

// const mongoose = require('mongoose');

// const authUser = require('./authUser');

// const login = async (req, res, { userModel }) => {
//   const UserPasswordModel = mongoose.model(userModel + 'Password');
//   const UserModel = mongoose.model(userModel);
//   const { email, password } = req.body;
//   console.log("login api hitted")

//   // validate
//   const objectSchema = Joi.object({
//     email: Joi.string()
//       .email({ tlds: { allow: true } })
//       .required(),
//     password: Joi.string().required(),
//   });

//   const { error, value } = objectSchema.validate({ email, password });
//   if (error) {
//     return res.status(409).json({
//       success: false,
//       result: null,
//       error: error,
//       message: 'Invalid/Missing credentials.',
//       errorMessage: error.message,
//     });
//   }

//   const user = await UserModel.findOne({ email: email, removed: false });

//   // console.log(user);
//   if (!user)
//     return res.status(404).json({
//       success: false,
//       result: null,
//       message: 'No account with this email has been registered.',
//     });

//   const databasePassword = await UserPasswordModel.findOne({ user: user._id, removed: false });

//   if (!user.enabled)
//     return res.status(409).json({
//       success: false,
//       result: null,
//       message: 'Your account is disabled, contact your account adminstrator',
//     });

//   //  authUser if your has correct password
//   authUser(req, res, {
//     user,
//     databasePassword,
//     password,
//     UserPasswordModel,
//   });
// };

// module.exports = login;

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
      where: { email, removed: false },
      include: [{ model: UserPassword, as: 'passwordInfo' }],
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account with this email found.',
      });
    }

    if (!user.enabled) {
      return res.status(403).json({
        success: false,
        message: 'Your account is disabled. Contact your administrator.',
      });
    }

    // Get user password record
    const userPassword = user.passwordInfo;
    if (!userPassword) {
      return res.status(500).json({
        success: false,
        message: 'User password record not found. Please contact support.',
      });
    }

    // Validate password
    const isMatch = await bcrypt.compare(userPassword.salt + password, userPassword.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password.',
      });
    }

    // Call authUser for token generation and response handling
    authUser(req, res, { user, userPassword, password });
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
