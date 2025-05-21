const { Op } = require('sequelize');
const { User } = require('../../../../models');
require('dotenv').config();

// You can store this securely via env vars
const VALID_PASSWORD = process.env.USER_API_PASSWORD; // Replace with process.env.LIST_ALL_PASSWORD in production

const listAll = async (req, res) => {
  console.log('List all users API hit');

  const { password } = req.query; // ⚠️ Change to req.body if using POST (recommended)

  if (!password || password !== VALID_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid password',
    });
  }

  try {

    const users = await User.findAll();

    return res.status(200).json({
      success: true,
      result: users,
      message: 'Successfully retrieved user list',
    });
  } catch (error) {
    console.error('Error fetching user list:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: error.message,
    });
  }
};

module.exports = listAll;
