const Joi = require('joi');
const crypto = require('crypto');
const { User, UserPassword } = require('../../../../models');
const sendMail = require('./sendMail');
const shortid = require('shortid');
const { loadSettings } = require('../../../middlewares/settings/loadSettings');

const { useAppSettings } = require('../../../middlewares/settings');

const passwordUtils = require('../../../utils/passwordUtils');

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

// async function ensurePasswordRow(user, t) {
//   let up = await UserPassword.findOne({
//     where: { user_id: parseInt(user.user_id) },
//     transaction: t
//   });
//   if (up) return up;

//   // create a minimal row; password_hash is required by your model (NOT NULL),
//   // so use a random string (the beforeCreate hook will hash it)
//   const tempPlain = crypto.randomBytes(16).toString('hex');

//   up = await UserPassword.create({
//     user_id: parseInt(user.user_id),
//     password_hash: passwordUtils.getDefaultPassword(),                 // will be hashed by hook
//     salt: await passwordUtils.generateSalt(), // you keep a salt column
//     is_default_password: true,
//     login_attempts: 0,
//     emailVerified: false,
//     plaintext_password: passwordUtils.getDefaultPassword(),                 // recommend removing this column later
//   }, { transaction: t });

//   return up;
// }


const forgetPassword = async (req, res) => {
  console.log('forgetPassword api hitted');
  // const UserPassword = mongoose.model(userModel + 'Password');
  // const User = mongoose.model(userModel);
  const startTime = Date.now();
  const { email, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;

  // validate
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
  });

  const { error, value } = objectSchema.validate({ email });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      error: error,
      message: 'Invalid email.',
      errorMessage: error.message,
    });
  }


  try {
    const user = await User.findOne({ where: { email } , include: [{ model: UserPassword, as: 'passwordInfo' }]});
    if (!user) {
      // Always return generic response (no user enumeration)
      return res.json({ success: true, message: "If an account exists, a reset link has been sent." });
    }

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

      const [passwordInfo /*instance*/, created] = await UserPassword.findOrCreate({
      where: { user_id: parseInt(user.user_id) },
      defaults: {
        user_id: parseInt(user.user_id),
        password_hash: passwordUtils.getDefaultPassword(),                       // will be hashed by hook
        salt: await passwordUtils.generateSalt(),
        is_default_password: true,
        login_attempts: 0,
        emailVerified: false,
        plaintext_password: passwordUtils.getDefaultPassword(),
      },
    });


    // Create opaque token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');

    passwordInfo.resetToken = hash;
    passwordInfo.reset_token_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    passwordInfo.reset_used_at = null;
    await passwordInfo.save();

    const resetLink = `${process.env.FRONTEND_URL}/resetpassword?token=${rawToken}`;

      await sendMail({
      email,
      name: user.user_display_name || 'User',
      link:resetLink,
      subject: 'Reset your password | MAD CRM',
      type: 'passwordVerfication',
    });

    return res.status(200).json({
    success: true,
    result: null,
    message: 'Check your email inbox , to reset your password',
  });


  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Something went wrong." });
    }


  // const resetToken = shortid.generate();

  // // const settings = useAppSettings();
  // // const idurar_app_email = settings['idurar_app_email'];
  // // const idurar_base_url = c['idurar_base_url'];

  // // const url = checkAndCorrectURL(idurar_base_url);

  // const url = 'http://localhost:3000'
  // const idurar_app_email = 'gaurav.thwait@makeadiff.in'

  // const link = url + '/resetpassword/' + 123 + '/' + resetToken;

  // await sendMail({
  //   email,
  //   name: 'gaurav',
  //   link,
  //   subject: 'Reset your password | idurar',
  //   idurar_app_email,
  //   type: 'passwordVerfication',
  // });

  
};

module.exports = forgetPassword;
