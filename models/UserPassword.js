const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class UserPassword extends Model {
    static associate(models) {
      // ✅ Ensure the correct association is set
      UserPassword.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  UserPassword.init(
    {
      removed: { type: DataTypes.BOOLEAN, defaultValue: false },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
      },
      password: { type: DataTypes.STRING, allowNull: false },
      salt: { type: DataTypes.STRING, allowNull: false },
      emailToken: { type: DataTypes.STRING, allowNull: true },
      resetToken: { type: DataTypes.STRING, allowNull: true },
      emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
      authType: { type: DataTypes.STRING, defaultValue: 'email' },
      loggedSessions: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    },
    {
      sequelize,
      modelName: 'UserPassword',
      tableName: 'user_passwords',
      timestamps: true,
    }
  );

  return UserPassword;
};
