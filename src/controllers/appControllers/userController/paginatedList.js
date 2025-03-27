const { Op } = require('sequelize');
const { User} = require('../../../../models');

const paginatedList = async (req, res) => {
  console.log('Paginated user list API hit');

  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.items) || 10;
  const offset = (page - 1) * limit;

  // Sorting parameters
  const sortBy = req.query.sortBy || 'createdAt';
  const sortValue = req.query.sortValue === 'asc' ? 'ASC' : 'DESC';

  // Filtering parameters
  const { filter, equal, q: searchQuery } = req.query;

  // Fields to search
  const searchableFields = ['email', 'first_name', 'last_name', 'role'];

  let whereConditions = { removed: false }; // Exclude removed users

  // Search functionality
  if (searchQuery) {
    whereConditions[Op.or] = searchableFields.map((field) => ({
      [field]: { [Op.iLike]: `%${searchQuery}%` }, // Case-insensitive search
    }));
  }

  // Apply filtering
  if (filter && equal !== undefined) {
    whereConditions[filter] = equal;
  }

  try {
    const { rows: users, count } = await User.findAndCountAll({
      where: whereConditions,
      order: [[sortBy, sortValue]],
      offset,
      limit,
      include: [
        {
          association: 'city',
          attributes: ['id', 'city_name'], // Ensure correct attribute name
        },
        {
          association: 'state',
          attributes: ['id', 'state_name'], // Ensure correct attribute name
        },
      ],
      attributes: { exclude: ['password'] }, // Ensure password is not included
    });

    const formattedUsers = users.map((user) => {
      const plainUser = user.get({ plain: true });

      return {
        id: plainUser.id,
        first_name: plainUser.first_name,
        last_name: plainUser.last_name,
        email: plainUser.email,
        role: plainUser.role,
        enabled: plainUser.enabled,
        city_id: plainUser.city?.id || null,
        city: plainUser.city?.city_name || null,
        state_id: plainUser.state?.id || null,
        state_name: plainUser.state?.state_name || null,
        createdAt: plainUser.createdAt,
        updatedAt: plainUser.updatedAt,
      };
    });

    const pages = Math.ceil(count / limit);
    const pagination = { page, pages, count };

    if (count > 0) {
      return res.status(200).json({
        success: true,
        result: formattedUsers,
        pagination,
        message: 'Successfully found users',
      });
    } else {
      return res.status(203).json({
        success: true,
        result: [],
        pagination,
        message: 'No users found',
      });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error finding users',
      error: error.message,
    });
  }
};

module.exports = paginatedList;