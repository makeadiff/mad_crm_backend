// const Joi = require('joi');
// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const register = async (req, res, { userModel }) => {
//   console.log('register API hit');
//   const UserPasswordModel = mongoose.model(userModel + 'Password');
//   const UserModel = mongoose.model(userModel);
//   const { email, password, name, surname, photo } = req.body;

//   // Validate input
//   const objectSchema = Joi.object({
//     email: Joi.string()
//       .email({ tlds: { allow: true } })
//       .required(),
//     password: Joi.string().min(6).required(),
//     name: Joi.string().required(),
//     surname: Joi.string().allow(null, ''),
//     photo: Joi.string().uri().allow(null, ''),
//   });

//   const { error } = objectSchema.validate({ email, password, name, surname, photo });
//   if (error) {
//     return res.status(400).json({
//       success: false,
//       message: 'Invalid input data.',
//       errorMessage: error.message,
//     });
//   }

//   try {
//     // Check if the user already exists
//     const existingUser = await UserModel.findOne({ email: email, removed: false });
//     if (existingUser) {
//       return res.status(409).json({
//         success: false,
//         message: 'Email is already registered.',
//       });
//     }

//     // Generate a salt and hash the password using the salt
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(salt + password, 10); // Use salt in hashing
//     console.log('Hashed Password:', hashedPassword);

//     // Create new user
//     const newUser = new UserModel({
//       email,
//       name,
//       surname,
//       photo,
//       enabled: true, // New accounts are enabled by default
//     });

//     await newUser.save();

//     // Save password separately
//     const newUserPassword = new UserPasswordModel({
//       user: newUser._id,
//       salt: salt, // Store salt in DB
//       password: hashedPassword,
//     });

//     await newUserPassword.save();

//     return res.status(201).json({
//       success: true,
//       message: 'User registered successfully.',
//       result: {
//         id: newUser._id,
//         email: newUser.email,
//         name: newUser.name,
//         surname: newUser.surname,
//         photo: newUser.photo,
//         created: newUser.created,
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: 'Something went wrong. Please try again.',
//       errorMessage: err.message,
//     });
//   }
// };

// module.exports = register;

const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { User, UserPassword } = require('../../../../models');


const register = async (req, res) => {
  console.log('Register API hit');
  const { email, password, first_name, last_name, photo, role } = req.body;

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
  });

  const { error } = objectSchema.validate({ email, password, first_name, last_name, photo, role });
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
      enabled: true, // New accounts are enabled by default
    });

    // Save password separately
    await UserPassword.create({
      user_id: newUser.id,
      salt: salt, // Store salt in DB
      password: hashedPassword,
    });

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

module.exports = register;
