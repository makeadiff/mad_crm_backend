
// const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
// const { routesList } = require('@/models/utils');

// const { globSync } = require('glob');
// const path = require('path');

// // Load directories, so we know what custom controllers exist
// const pattern = './src/controllers/appControllers/*/';
// const controllerDirectories = globSync(pattern).map((dir) => path.basename(dir));

// const appControllers = () => {
//   const controllers = {};

//   controllerDirectories.forEach((controllerName) => {
//     try {
//       const customController = require('@/controllers/appControllers/' + controllerName);
//       controllers[controllerName] = customController; // This will be the object from index.js of each controller folder
//     } catch (err) {
//       throw new Error(`Failed to load custom controller ${controllerName}: ${err.message}`);
//     }
//   });

//   // For all entities in routeList, if no custom controller exists, fall back to auto CRUD
//   routesList.forEach(({ modelName, controllerName }) => {
//     if (!controllers[controllerName]) {
//       controllers[controllerName] = createCRUDController(modelName);
//     }
//   });

//   return controllers;
// };

// module.exports = appControllers();



const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const { routesList} = require('@/models/utils'); // Ensure it gets models from Sequelize
const { globSync } = require('glob');
const path = require('path');

// Load directories to check for custom controllers
const pattern = './src/controllers/appControllers/*/';
const controllerDirectories = globSync(pattern).map((dir) => path.basename(dir));

const appControllers = () => {
  const controllers = {};

  // Load custom controllers
  controllerDirectories.forEach((controllerName) => {
    try {
      const customController = require(`@/controllers/appControllers/${controllerName}`);
      controllers[controllerName] = customController;
    } catch (err) {
      throw new Error(`Failed to load custom controller ${controllerName}: ${err.message}`);
    }
  });

  // For all entities in routeList, only use createCRUDController for models in Sequelize
  routesList.forEach(({ modelName, controllerName }) => {
    if (!controllers[controllerName] && appModelsList.includes(modelName)) {
      controllers[controllerName] = createCRUDController(modelName);
    }
  });

  return controllers;
};

module.exports = appControllers;
