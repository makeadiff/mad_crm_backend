const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      // If you keep this relation, switch to sourceKey: 'user_id'
      if (models.UserPassword) {
        User.hasOne(models.UserPassword, {
          foreignKey: 'user_id',
          sourceKey: 'user_id',
          as: 'passwordInfo',
        });
      }
      // Remove or keep these only if you actually have these tables/columns
      // User.belongsTo(models.City,  { foreignKey: 'city_id',  as: 'cityInfo'  });
      // User.belongsTo(models.State, { foreignKey: 'state_id', as: 'stateInfo' });
    }
  }

  User.init(
    {
      // Primary key that exists in your table
      user_id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },

      email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
      user_login: { type: DataTypes.STRING, allowNull: true, unique: true },
      user_display_name: { type: DataTypes.STRING, allowNull: true },
      user_role: { type: DataTypes.STRING, allowNull: true },

      reporting_manager_user_id:   { type: DataTypes.STRING, allowNull: true },
      reporting_manager_role_code: { type: DataTypes.STRING, allowNull: true },
      reporting_manager_user_login:{ type: DataTypes.STRING, allowNull: true },

      city:   { type: DataTypes.STRING, allowNull: true },
      state:  { type: DataTypes.STRING, allowNull: true },
      center: { type: DataTypes.STRING, allowNull: true },
      contact:{ type: DataTypes.STRING, allowNull: true },
      added_by:{ type: DataTypes.STRING, allowNull: true },

      user_created_datetime: { type: DataTypes.DATE, allowNull: true },
      user_updated_datetime: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'user_data',      // <- your real table, not "users"
      schema: process.env.DB_SCHEMA, // uncomment if using per-schema deploys
      timestamps: false,           // your API table likely has no createdAt/updatedAt
      hooks: {
        beforeSave: (user) => {
          if (user.email) user.email = user.email.toLowerCase().trim();
          if (user.user_login) user.user_login = user.user_login.toLowerCase().trim();
          if (user.reporting_manager_user_login)
            user.reporting_manager_user_login = user.reporting_manager_user_login.toLowerCase().trim();
        },
      },
      indexes: [
        { unique: true, fields: ['email'] },
        { unique: true, fields: ['user_login'] },
        { unique: true, fields: ['user_id'] },
      ],
    }
  );

  return User;
};
