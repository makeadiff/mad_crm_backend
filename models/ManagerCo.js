const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ManagerCo extends Model {
    static associate(models) {
      ManagerCo.belongsTo(models.User, { foreignKey: 'co_id', as: 'co' });
      ManagerCo.belongsTo(models.User, { foreignKey: 'manager_id', as: 'manager' });
    }
  }

  ManagerCo.init(
    {
      co_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      manager_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
    },
    {
      sequelize,
      modelName: 'ManagerCo',
      tableName: 'manager_co',
      schema: 'prod',
      timestamps: true,
    }
  );

  return ManagerCo;
};
