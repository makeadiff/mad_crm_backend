const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.hasOne(models.UserPassword, { foreignKey: 'user_id', as: 'passwordInfo' });

      User.belongsTo(models.City, { foreignKey: 'city_id', as: 'city' });
      User.belongsTo(models.State, { foreignKey: 'state_id', as: 'state' });
    }
  }

  User.init(
    {
      removed: { type: DataTypes.BOOLEAN, defaultValue: false },
      enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        lowercase: true,
        trim: true,
      },
      first_name: { type: DataTypes.STRING, allowNull: false },
      last_name: { type: DataTypes.STRING, allowNull: true },
      photo: { type: DataTypes.STRING, allowNull: true, trim: true },
      role: { type: DataTypes.ENUM('super_admin', 'admin', 'manager', 'co'), allowNull: false },
      city_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'cities', key: 'id' },
      },
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'states', key: 'id' },
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
    }
  );

  return User; // ✅ Make sure to return the model
};
