const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // ✅ Ensure proper function signature
  class City extends Model {
    static associate(models) {
      City.belongsTo(models.State, { foreignKey: 'state_id', onDelete: 'CASCADE', as: 'state' });
    }
  }

  City.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      city_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'states',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'City',
      tableName: 'cities',
      timestamps: true,
    }
  );

  return City; // ✅ Ensure the model is returned
};
