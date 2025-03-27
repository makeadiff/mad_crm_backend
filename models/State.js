const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class State extends Model {
    static associate(models) {
      State.hasMany(models.City, { foreignKey: 'state_id', onDelete: 'CASCADE' });
    }
  }
  
  State.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      state_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'State',
      tableName: 'states',
      timestamps: false, // Disable createdAt and updatedAt
    }
  );

  return State; // ✅ Ensure the function returns the model
};
