// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// const authUser = async (req, res, { user, databasePassword, password, UserPasswordModel }) => {
//   const isMatch = await bcrypt.compare(databasePassword.salt + password, databasePassword.password);

//   if (!isMatch)
//     return res.status(403).json({
//       success: false,
//       result: null,
//       message: 'Invalid credentials.',
//     });

//   if (isMatch === true) {
//     const token = jwt.sign(
//       {
//         id: user._id,
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: req.body.remember ? 365 * 24 + 'h' : '24h' }
//     );

//     await UserPasswordModel.findOneAndUpdate(
//       { user: user._id },
//       { $push: { loggedSessions: token } },
//       {
//         new: true,
//       }
//     ).exec();

//     // .cookie(`token_${user.cloud}`, token, {
//     //     maxAge: req.body.remember ? 365 * 24 * 60 * 60 * 1000 : null,
//     //     sameSite: 'None',
//     //     httpOnly: true,
//     //     secure: true,
//     //     domain: req.hostname,
//     //     path: '/',
//     //     Partitioned: true,
//     //   })
//     res.status(200).json({
//       success: true,
//       result: {
//         _id: user._id,
//         name: user.name,
//         surname: user.surname,
//         role: user.role,
//         email: user.email,
//         photo: user.photo,
//         token: token,
//         maxAge: req.body.remember ? 365 : null,
//       },
//       message: 'Successfully login user',
//     });
//   } else {
//     return res.status(403).json({
//       success: false,
//       result: null,
//       message: 'Invalid credentials.',
//     });
//   }
// };

// module.exports = authUser;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, UserPassword } = require('../../../../models');

const authUser = async (req, res, { user, userPassword, password }) => {
  try {
    // Compare hashed password
    const isMatch = await bcrypt.compare(userPassword.salt + password, userPassword.password);

    if (!isMatch) {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'Invalid credentials.',
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: req.body.remember ? '365d' : '24h',
    });

    // Update loggedSessions (assuming it's a JSON array)
    const newSessions = userPassword.loggedSessions
      ? [...userPassword.loggedSessions, token]
      : [token];

    await UserPassword.update({ loggedSessions: newSessions }, { where: { user_id: user.id } });


    // Send response
    res.status(200).json({
      success: true,
      result: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email: user.email,
        photo: user.photo,
        token: token,
        maxAge: req.body.remember ? 365 : null,
      },
      message: 'Successfully logged in user',
    });
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
      errorMessage: error.message,
    });
  }
};

module.exports = authUser;
