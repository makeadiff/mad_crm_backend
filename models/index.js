const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

const all = require('../config/config.js');   // <— not .json
const config = all[env];

const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// ✅ Load models dynamically
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach((file) => {
    const modelFunc = require(path.join(__dirname, file));

    if (typeof modelFunc !== 'function') {
      console.error(`❌ ERROR: ${file} is not exporting a function. Check its export.`);
      process.exit(1);
    }

    const model = modelFunc(sequelize, Sequelize.DataTypes);

    if (!model || !(model.prototype instanceof Sequelize.Model)) {
      console.error(`❌ ERROR: ${file} is NOT a valid Sequelize Model.`);
      process.exit(1);
    }

    db[model.name] = model;
    // console.log(`✅ Successfully Loaded Model: ${model.name}`);
  });

// ✅ Associate models if needed
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    // console.log(`🔗 Setting up associations for: ${modelName}`);
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
