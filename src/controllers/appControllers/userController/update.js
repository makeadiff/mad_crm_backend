const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, UserPassword } = require('../../../../models');

const update = async (req, res) => {
  console.log('User update API hit')

  const id  = req.params.id
  
  console.log("request params in user update :", req.params.id)

  const { email, password, first_name, last_name, photo, role, city_id, state_id, enabled } = req.body;

  // Validate input
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().min(6).optional(),
    first_name: Joi.string().required(),
    last_name: Joi.string().allow(null, ''),
    photo: Joi.string().uri().allow(null, ''),
    role: Joi.string().required(),
    state_id: Joi.number().integer().required(),
    city_id: Joi.number().integer().required(),
    enabled: Joi.boolean().optional(),
  });

  const { error } = objectSchema.validate({
    email,
    first_name,
    last_name,
    photo,
    role,
    city_id,
    state_id,
    enabled
  });

  if (password) {
    const passwordSchema = Joi.string().min(6).required();
    const { error: passwordError } = passwordSchema.validate(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password.',
        errorMessage: passwordError.message,
      });
    }
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input data.',
      errorMessage: error.message,
    });
  }

  try {
    // Find the user
    const user = await User.findOne({ where: { id, removed: false } });
    console.log("user found in user update.js :", user.dataValues)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if email already exists (except for the current user)
    const existingUser = await User.findOne({
      where: {
        email,
        id: { [Op.ne]: id }, // ✅ Correct Sequelize syntax
        removed: false,
      },
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered with another account.',
      });
    }
    
    // Prepare update data
    const updateData = {
      email,
      first_name,
      last_name,
      photo,
      role,
      city_id,
      state_id,
      enabled
    };

    await user.update(updateData);

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(salt + password, 10);

      const userPassword = await UserPassword.findOne({ where: { user_id: id } });
      if (userPassword) {
        await userPassword.update({ salt, password: hashedPassword });
      } else {
        await UserPassword.create({ user_id: id, salt, password: hashedPassword });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      result: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        photo: user.photo,
        updated: user.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
      errorMessage: err.message,
    });
  }
};

module.exports = update;
