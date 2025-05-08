// const { Model, DataTypes } = require('sequelize');

// module.exports = (sequelize) => {
//   class User extends Model {
//     static associate(models) {
//       User.hasOne(models.UserPassword, { foreignKey: 'user_id', as: 'passwordInfo' });

//       User.belongsTo(models.City, { foreignKey: 'city_id', as: 'city' });
//       User.belongsTo(models.State, { foreignKey: 'state_id', as: 'state' });
//     }
//   }

//   User.init(
//     {
//       removed: { type: DataTypes.BOOLEAN, defaultValue: false },
//       enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
//       email: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         unique: true,
//         lowercase: true,
//         trim: true,
//       },
//       first_name: { type: DataTypes.STRING, allowNull: false },
//       last_name: { type: DataTypes.STRING, allowNull: true },
//       photo: { type: DataTypes.STRING, allowNull: true, trim: true },
//       role: { type: DataTypes.ENUM('super_admin', 'admin', 'manager', 'co'), allowNull: false },
//       city_id: {
//         type: DataTypes.INTEGER,
//         allowNull: true,
//         references: { model: 'cities', key: 'id' },
//       },
//       state_id: {
//         type: DataTypes.INTEGER,
//         allowNull: true,
//         references: { model: 'states', key: 'id' },
//       },
//     },
//     {
//       sequelize,
//       modelName: 'User',
//       tableName: 'users',
//       timestamps: true,
//     }
//   );

//   return User; // ✅ Make sure to return the model
// };


const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {}

  User.init(
    {
      user_id: {
        type: DataTypes.DECIMAL, // or INTEGER if safe
        primaryKey: true,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
      },
      state: {
        type: DataTypes.STRING,
      },
      center: {
        type: DataTypes.STRING,
      },
      contact: {
        type: DataTypes.STRING,
      },
      user_role: {
        type: DataTypes.STRING,
      },
      user_login: {
        type: DataTypes.STRING,
      },
      user_display_name: {
        type: DataTypes.STRING,
      },
      user_created_datetime: {
        type: DataTypes.DATE,
      },
      user_updated_datetime: {
        type: DataTypes.DATE,
      },
      password: {
        type: DataTypes.STRING,
      },
      updated_password: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'user_data',
      schema: 'prod', // 👈 using 'prod' schema
      timestamps: false, // or true if you have Sequelize's createdAt/updatedAt
    }
  );

  return User;
};
