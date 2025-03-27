const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PartnerCo extends Model {
    static associate(models) {
      PartnerCo.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
      PartnerCo.belongsTo(models.User, { foreignKey: 'co_id', as: 'co' });
    }
  }

  PartnerCo.init(
    {
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'partners', key: 'id' },
      },
      co_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
    },
    {
      sequelize,
      modelName: 'PartnerCo',
      tableName: 'partner_cos',
      timestamps: true,
    }
  );

  return PartnerCo;
};
