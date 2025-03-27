// const jwt = require('jsonwebtoken');

// const mongoose = require('mongoose');

// const isValidAuthToken = async (req, res, next, { userModel, jwtSecret = 'JWT_SECRET' }) => {
//   try {
//     console.log("---------------validate token api called---------------")
//     const UserPassword = mongoose.model(userModel + 'Password');
//     const User = mongoose.model(userModel);

//     // const token = req.cookies[`token_${cloud._id}`];
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1]; // Extract the token

//     if (!token)
//       return res.status(401).json({
//         success: false,
//         result: null,
//         message: 'No authentication token, authorization denied.',
//         jwtExpired: true,
//       });

//     const verified = jwt.verify(token, process.env[jwtSecret]);

//     if (!verified)
//       return res.status(401).json({
//         success: false,
//         result: null,
//         message: 'Token verification failed, authorization denied.',
//         jwtExpired: true,
//       });

//     const userPasswordPromise = UserPassword.findOne({ user: verified.id, removed: false });
//     const userPromise = User.findOne({ _id: verified.id, removed: false });

//     const [user, userPassword] = await Promise.all([userPromise, userPasswordPromise]);

//     if (!user)
//       return res.status(401).json({
//         success: false,
//         result: null,
//         message: "User doens't Exist, authorization denied.",
//         jwtExpired: true,
//       });

//     const { loggedSessions } = userPassword;

//     if (!loggedSessions.includes(token))
//       return res.status(401).json({
//         success: false,
//         result: null,
//         message: 'User is already logout try to login, authorization denied.',
//         jwtExpired: true,
//       });
//     else {
//       const reqUserName = userModel.toLowerCase();
//       req[reqUserName] = user;
//       next();
//     }
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       result: null,
//       message: error.message,
//       error: error,
//       controller: 'isValidAuthToken',
//       jwtExpired: true,
//     });
//   }
// };

// module.exports = isValidAuthToken;



const jwt = require('jsonwebtoken');
const { User, UserPassword } = require('../../../../models'); // Adjust the path if needed

const isValidAuthToken = async (req, res, next) => {
  try {
    console.log('--------------- Validate Token API Called ---------------');

    // Extract token from the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'No authentication token, authorization denied.',
        jwtExpired: true,
      });
    }

    // Verify JWT Token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Token verification failed, authorization denied.',
        jwtExpired: true,
      });
    }

    // Fetch user and password records from PostgreSQL
    const user = await User.findOne({
      where: { id: verified.id, removed: false, enabled: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        result: null,
        message: "User doesn't exist, authorization denied.",
        jwtExpired: true,
      });
    }

    // Fetch UserPassword record
    const userPassword = await UserPassword.findOne({
      where: { user_id: user.id, removed: false },
    });

    if (!userPassword) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'User authentication failed, authorization denied.',
        jwtExpired: true,
      });
    }

    // Check if the token exists in loggedSessions
    const { loggedSessions } = userPassword;
    if (!loggedSessions.includes(token)) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'User is already logged out, try logging in again.',
        jwtExpired: true,
      });
    }

    // Attach user object to the request
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error,
      controller: 'isValidAuthToken',
      jwtExpired: true,
    });
  }
};

module.exports = isValidAuthToken;

