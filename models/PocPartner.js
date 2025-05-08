const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PocPartner extends Model {
    static associate(models) {
      PocPartner.belongsTo(models.Poc, { foreignKey: 'poc_id', as: 'poc' });
      PocPartner.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }

  PocPartner.init(
    {
      poc_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'pocs', key: 'id' },
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'partners', key: 'id' },
      },
    },
    {
      sequelize,
      modelName: 'PocPartner',
      tableName: 'poc_partners',
      schema: 'prod',
      timestamps: true,
    }
  );

  return PocPartner;
};
