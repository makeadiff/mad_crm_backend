// src/controllers/middlewaresControllers/createAuthMiddleware/resetPassword.js
const Joi = require('joi');
const crypto = require('crypto');
const bcrypt = require('bcryptjs'); // only if you want to bypass hooks; otherwise not needed
const { User, UserPassword } = require('../../../../models');
const passwordUtils = require('../../../utils/passwordUtils');
// const sendMail = require('./sendMail'); // optional: password-changed notification

/**
 * Body: { token: string, password: string }
 */
const resetPassword = async (req, res) => {
  // 1) validate
  const schema = Joi.object({
    token: Joi.string().min(16).required(),
    password: Joi.string().min(8).max(128).required(), // adjust rules as needed
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input.',
      errorMessage: error.message,
    });
  }

  const { token, password } = value;
  console.log("Reset password api hitted ----->", token, password);

  try {
    // 2) find user_passwords row by token hash
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const userPassword = await UserPassword.findOne({
      where: { resetToken: hash }, // you already store hash in resetToken
      include: [{ model: User, as: 'user' }],
    });

    // Guard: not found / expired / used
    if (
      !userPassword ||
      !userPassword.reset_token_expires_at ||
      userPassword.reset_token_expires_at < new Date() ||
      userPassword.reset_used_at
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link.',
      });
    }

    // 3) set new password
    // Option A: let your model hook hash it (you already have beforeUpdate hashing when 'password_hash' changed)
    userPassword.password_hash = password; // plain here; model hook will hash
    userPassword.salt = await passwordUtils.generateSalt(); // you maintain a salt column
    userPassword.is_default_password = false;
    userPassword.password_changed_at = new Date();

    // 4) invalidate sessions & clear token
    userPassword.loggedSessions = []; // log out everywhere
    userPassword.reset_used_at = new Date();
    userPassword.resetToken = null;
    userPassword.reset_token_expires_at = null;

    await userPassword.save();

    // Optional: notify user their password was changed
    // try {
    //   await sendMail({
    //     email: userPassword.user.email,
    //     name: [userPassword.user.first_name, userPassword.user.last_name].filter(Boolean).join(' ') || 'there',
    //     link: '',
    //     subject: 'Your password was changed | MAD CRM',
    //     type: 'passwordChanged',
    //   });
    // } catch (e) { /* swallow email failure */ }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.',
    });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

module.exports = resetPassword;
