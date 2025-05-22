// 

const { Op } = require('sequelize');
const { User } = require('../../../../models');

const listAll = async (req, res) => {
  console.log('List all users API hit');

  // Extract query parameters
  const { role } = req.query; // Expecting role as a query param (e.g., 'co,manager')

  let whereConditions = {}; // Default condition to exclude removed users

  // Filtering by multiple roles
  // if (role) {
  //   const roleArray = role.split(','); // Convert "co,manager" -> ["co", "manager"]
  //   whereConditions.role = { [Op.in]: roleArray }; // Sequelize condition for IN operator
  // }

  whereConditions.user_role = {
    [Op.in]: ['CO Part Time', 'CO Full Time'],
  };

  try {
    // Fetch users based on conditions
    const users = await User.findAll({
      where: whereConditions,
      order: [['user_display_name', 'ASC']], // Optional: Sort by first_name
      attributes: ['user_id', 'user_display_name', 'email', 'user_role'], // Limit fields
    });

    // const users = await User.findAll()

    // console.log("user data from co list :", users)
    return res.status(200).json({
      success: true,
      result: users,
      message: 'Successfully retrieved user list',
    });
  } catch (error) {
    console.error('Error fetching user list:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error retrieving users',
      error: error.message,
    });
  }
};

module.exports = listAll;
