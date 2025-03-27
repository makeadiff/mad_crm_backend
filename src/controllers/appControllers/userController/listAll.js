const { Op } = require('sequelize');
const { User } = require('../../../../models');

const listAll = async (req, res) => {
  console.log('List all users API hit');

  // Extract query parameters
  const { role } = req.query; // Expecting role as a query param (e.g., 'co,manager')

  let whereConditions = { removed: false }; // Default condition to exclude removed users

  // Filtering by multiple roles
  if (role) {
    const roleArray = role.split(','); // Convert "co,manager" -> ["co", "manager"]
    whereConditions.role = { [Op.in]: roleArray }; // Sequelize condition for IN operator
  }

  try {
    // Fetch users based on conditions
    const users = await User.findAll({
      where: whereConditions,
      order: [['first_name', 'ASC']], // Optional: Sort by first_name
      attributes: ['id', 'first_name', 'last_name', 'email', 'role'], // Limit fields
    });

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

