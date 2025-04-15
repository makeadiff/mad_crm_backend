const { Op } = require('sequelize');
const Joi = require('joi');
const { User, UserPassword } = require('../../../../models');

const remove = async (req, res) => {
  try {
    console.log('>>>>>>>>>>>>>>>>>>>user delete api hitted<<<<<<<<<<<<<<<<<<<<<<<<<<<<');

    const userId = req.params.id;

    // Find existing poc
    const existedUser = await User.findByPk(userId);
    if (!existedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userUpdate = await User.update(
      {
        removed: true,
      },
      { where: { id: userId } }
    );

    const userPasswordUpdate = await UserPassword.update(
      {
        removed: true,
      },
      { where: { user_id: userId } }
    );

    return res.status(200).json({ success: true, message: 'User Deleted Successfull' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting user details',
      error: error.message,
    });
  }
};

module.exports = remove;
