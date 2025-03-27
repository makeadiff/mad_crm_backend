const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { User, UserPassword, ManagerCo } = require('../../../../models');

const create = async (req, res) => {
  console.log('user create API hit');
  const { email, password, first_name, last_name, photo, role, city_id, state_id, manager_id } = req.body;

  // Validate input
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().min(6).required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().allow(null, ''),
    photo: Joi.string().uri().allow(null, ''),
    role: Joi.string().required(),
    state_id: Joi.number().integer().required(),
    city_id: Joi.number().integer().required(),
  });

  const { error } = objectSchema.validate({ email, password, first_name, last_name, photo, role, city_id, state_id});
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input data.',
      errorMessage: error.message,
    });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ where: { email, removed: false } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(salt + password, 10);
    console.log('Hashed Password:', hashedPassword);

    // Create new user
    const newUser = await User.create({
      email,
      first_name,
      last_name,
      photo,
      role,
      city_id,
      state_id,
      enabled: true, // New accounts are enabled by default
    });

    // Save password separately
    await UserPassword.create({
      user_id: newUser.id,
      salt: salt, // Store salt in DB
      password: hashedPassword,
    });

    if(role == "co"){
      // if role of co is manager than its requied to create a row in manager_co table
      await ManagerCo.create({
        co_id: newUser.id,
        manager_id: manager_id
      })
      console.log(" manager_co row created ----------------->")
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      result: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        photo: newUser.photo,
        created: newUser.createdAt,
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

module.exports = create;
