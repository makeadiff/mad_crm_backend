// const { City } = require('../../../../models'); // Adjust path if necessary
// const { State } = require('../../../../models'); // Ensure State is included
// const Joi = require('joi');

// const create = async (req, res) => {
//   const { city_name, state_id } = req.body;

//     console.log("city creation api hitted")

//   // Validate input using Joi
//   const schema = Joi.object({
//     city_name: Joi.string().trim().min(2).required(),
//     state_id: Joi.number().integer().required(),
//   });

//   const { error } = schema.validate({ city_name, state_id });
//   if (error) {
//     return res.status(400).json({
//       success: false,
//       message: 'Invalid input data',
//       errorMessage: error.message,
//     });
//   }

//   try {
//     // Check if the state exists
//     const stateExists = await State.findByPk(state_id);
//     if (!stateExists) {
//       return res.status(404).json({
//         success: false,
//         message: 'State not found',
//       });
//     }

//     // Check if the city already exists in the state
//     const cityExists = await City.findOne({ where: { city_name, state_id } });
//     if (cityExists) {
//       return res.status(409).json({
//         success: false,
//         message: 'City already exists in this state',
//       });
//     }

//     // Create city
//     const newCity = await City.create({ city_name, state_id });

//     res.status(201).json({
//       success: true,
//       message: 'City added successfully',
//       city: newCity,
//     });
//   } catch (error) {
//     console.error('Error creating city:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Something went wrong, please try again',
//       errorMessage: error.message,
//     });
//   }
// };

// module.exports =  create;



const { City, State } = require('../../../../models'); // Adjust path if necessary
const Joi = require('joi');

const create = async (req, res) => {
  const { cities } = req.body; // Expecting an array of city objects

  console.log('Bulk city creation API hit');

  // Validate input using Joi
  const schema = Joi.array().items(
    Joi.object({
      city_name: Joi.string().trim().min(2).required(),
      state_id: Joi.number().integer().required(),
    })
  );

  const { error } = schema.validate(cities);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input data',
      errorMessage: error.message,
    });
  }

  try {
    // Validate all state IDs first
    const stateIds = [...new Set(cities.map((city) => city.state_id))]; // Unique state IDs
    const existingStates = await State.findAll({ where: { id: stateIds } });
    const existingStateIds = existingStates.map((state) => state.id);

    // Filter out cities with invalid state IDs
    const validCities = cities.filter((city) => existingStateIds.includes(city.state_id));
    if (validCities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid states found for provided cities',
      });
    }

    // Check if cities already exist in the given states
    const existingCities = await City.findAll({
      where: {
        city_name: validCities.map((city) => city.city_name),
        state_id: validCities.map((city) => city.state_id),
      },
    });

    const existingCityNames = existingCities.map((city) => city.city_name);

    // Filter out cities that already exist
    const newCities = validCities.filter((city) => !existingCityNames.includes(city.city_name));

    if (newCities.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'All cities already exist in the given states',
      });
    }

    // Insert new cities
    const insertedCities = await City.bulkCreate(newCities);

    res.status(201).json({
      success: true,
      message: 'Cities added successfully',
      cities: insertedCities,
    });
  } catch (error) {
    console.error('Error creating cities:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong, please try again',
      errorMessage: error.message,
    });
  }
};

module.exports = create;

