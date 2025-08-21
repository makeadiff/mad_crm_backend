// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { User, UserPassword } = require('../../../../models');

// const authUser = async (req, res, { user, userPassword, password }) => {
//   try {
//     // Compare hashed password
//     const isMatch = await bcrypt.compare(userPassword.salt + password, userPassword.password);

//     if (!isMatch) {
//       return res.status(403).json({
//         success: false,
//         result: null,
//         message: 'Invalid credentials.',
//       });
//     }

//     // Generate JWT token
//     const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
//       expiresIn: req.body.remember ? '365d' : '24h',
//     });

//     // Update loggedSessions (assuming it's a JSON array)
//     const newSessions = userPassword.loggedSessions
//       ? [...userPassword.loggedSessions, token]
//       : [token];

//     await UserPassword.update({ loggedSessions: newSessions }, { where: { user_id: user.id } });


//     // Send response
//     res.status(200).json({
//       success: true,
//       result: {
//         id: user.id,
//         first_name: user.first_name,
//         last_name: user.last_name,
//         role: user.role,
//         email: user.email,
//         photo: user.photo,
//         token: token,
//         maxAge: req.body.remember ? 365 : null,
//       },
//       message: 'Successfully logged in user',
//     });
//   } catch (error) {
//     console.error('Auth Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong. Please try again.',
//       errorMessage: error.message,
//     });
//   }
// };

// module.exports = authUser;


const jwt = require('jsonwebtoken');
const { UserPassword } = require('../../../../models');

const authUser = async (req, res, { user, userPassword }) => {
  try {
    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: req.body.remember ? '365d' : '24h',
    });

    // Update loggedSessions array with the new token
    console.log('🔍 AuthUser debug:', {
      hasUserPassword: !!userPassword,
      userPasswordId: userPassword ? userPassword.id : 'null',
      currentSessions: userPassword ? userPassword.loggedSessions : 'null',
      userIdInt: parseInt(user.user_id)
    });
    
    if (userPassword) {
      const currentSessions = userPassword.loggedSessions || [];
      const newSessions = [...currentSessions, token];
      
      console.log(`🔄 Updating sessions from ${currentSessions.length} to ${newSessions.length}`);
      
      const updateResult = await UserPassword.update(
        { loggedSessions: newSessions },
        { where: { user_id: parseInt(user.user_id) } }
      );
      
      console.log(`✅ Update result:`, updateResult);
      console.log(`✅ Token added to loggedSessions. Total sessions: ${newSessions.length}`);
    } else {
      console.log('❌ No userPassword provided to authUser');
    }

    res.status(200).json({
      success: true,
      result: {
        id: user.user_id,
        first_name: user.user_display_name,
        last_name: user.user_display_name,
        photo: "abcd",
        role: user.user_role,
        email: user.email,
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
