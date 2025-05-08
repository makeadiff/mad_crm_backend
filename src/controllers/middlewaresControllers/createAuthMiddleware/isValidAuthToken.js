// const jwt = require('jsonwebtoken');
// const { User, UserPassword } = require('../../../../models'); // Adjust the path if needed

// const isValidAuthToken = async (req, res, next) => {
//   try {
//     console.log('--------------- Validate Token API Called ---------------');
//     console.log('validate token headers ----------->:', req.headers['authorization']);

//     // Extract token from the Authorization header
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         result: null,
//         message: 'No authentication token, authorization denied.',
//         jwtExpired: true,
//       });
//     }

//     // Verify JWT Token
//     const verified = jwt.verify(token, process.env.JWT_SECRET);
//     if (!verified) {
//       return res.status(401).json({
//         success: false,
//         result: null,
//         message: 'Token verification failed, authorization denied.',
//         jwtExpired: true,
//       });
//     }

//     // Fetch user and password records from PostgreSQL
//     const user = await User.findOne({
//       where: { id: verified.id, removed: false, enabled: true },
//     });

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         result: null,
//         message: "User doesn't exist, authorization denied.",
//         jwtExpired: true,
//       });
//     }

//     // Fetch UserPassword record
//     const userPassword = await UserPassword.findOne({
//       where: { user_id: user.id, removed: false },
//     });

//     if (!userPassword) {
//       return res.status(401).json({
//         success: false,
//         result: null,
//         message: 'User authentication failed, authorization denied.',
//         jwtExpired: true,
//       });
//     }

//     // Check if the token exists in loggedSessions
//     const { loggedSessions } = userPassword;
//     if (!loggedSessions.includes(token)) {
//       return res.status(401).json({
//         success: false,
//         result: null,
//         message: 'User is already logged out, try logging in again.',
//         jwtExpired: true,
//       });
//     }

//     // Attach user object to the request
//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       result: null,
//       message: error.message,
//       error,
//       controller: 'isValidAuthToken',
//       jwtExpired: true,
//     });
//   }
// };

// module.exports = isValidAuthToken;


const jwt = require('jsonwebtoken');
const { User } = require('../../../../models'); // Adjust path if needed

const isValidAuthToken = async (req, res, next) => {
  try {
    console.log('--------------- Validate Token API Called ---------------');
    // console.log('validate token headers :', req.headers['authorization']);

    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    // console.log("token when valiade api is called :", token)
    if (!token) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'No authentication token, authorization denied.',
        jwtExpired: true,
      });
    }

    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified || !verified.id) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Token verification failed, authorization denied.',
        jwtExpired: true,
      });
    }
    // console.log("token varified")
    // Fetch user by ID from the prod schema
    const user = await User.findOne({
      where: { user_id: verified.id },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        result: null,
        message: "User doesn't exist or is disabled, authorization denied.",
        jwtExpired: true,
      });
    }
    // console.log("user found in validate token :", user)
    // Attach user to request
    // console.log("in validate toke user data stored in req.user -------------->", user)
    req.user = user;
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Internal server error during token validation.',
      errorMessage: error.message,
      jwtExpired: true,
    });
  }
};

module.exports = isValidAuthToken;

