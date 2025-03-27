// const { basename, extname } = require('path');
// const { globSync } = require('glob');

// const appModelsFiles = globSync('./src/models/appModel/**/*.js');

// const pattern = './src/models/**/*.js';

// const modelsFiles = globSync(pattern).map((filePath) => {
//   const fileNameWithExtension = basename(filePath);
//   const fileNameWithoutExtension = fileNameWithExtension.replace(
//     extname(fileNameWithExtension),
//     ''
//   );
//   return fileNameWithoutExtension;
// });

// const constrollersList = [];
// const appModelsList = [];
// const entityList = [];
// const routesList = [];

// for (const filePath of appModelsFiles) {
//   const fileNameWithExtension = basename(filePath);
//   const fileNameWithoutExtension = fileNameWithExtension.replace(
//     extname(fileNameWithExtension),
//     ''
//   );
//   const firstChar = fileNameWithoutExtension.charAt(0);
//   const modelName = fileNameWithoutExtension.replace(firstChar, firstChar.toUpperCase());
//   const fileNameLowerCaseFirstChar = fileNameWithoutExtension.replace(
//     firstChar,
//     firstChar.toLowerCase()
//   );
//   const entity = fileNameWithoutExtension.toLowerCase();

//   controllerName = fileNameLowerCaseFirstChar + 'Controller';
//   constrollersList.push(controllerName);
//   appModelsList.push(modelName);
//   entityList.push(entity);

//   const route = {
//     entity: entity,
//     modelName: modelName,
//     controllerName: controllerName,
//   };
//   routesList.push(route);
// }

// routesList.push({
//   entity: 'poc',
//   modelName: 'Lead',
//   controllerName: 'pocController',
// });

// routesList.push({
//   entity: 'admim',
//   modelName: 'Admin',
//   controllerName: 'adminController',
// });



// module.exports = { constrollersList, appModelsList, modelsFiles, entityList, routesList };



const routesList = [
  { entity: 'poc', modelName: 'Lead', controllerName: 'pocController' },
  { entity: 'user', modelName: 'User', controllerName: 'userController' },
  { entity: 'state', modelName: 'State', controllerName: 'stateController' },
  { entity: 'city', modelName: 'City', controllerName: 'cityController' },
  { entity: 'lead', modelName: 'Partner', controllerName: 'leadController' },
  { entity: 'organization', modelName: 'Partner', controllerName: 'organizationController' }

];


module.exports = { routesList };


