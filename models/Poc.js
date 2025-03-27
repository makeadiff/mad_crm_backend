const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Poc extends Model {
    static associate(models) {
      Poc.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
      Poc.hasMany(models.PocPartner, { foreignKey: 'poc_id', as: 'pocPartners' });
      Poc.hasMany(models.Meeting, { foreignKey: 'poc_id', as: 'meetings' });
    }
  }

  Poc.init(
    {
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'partners', key: 'id' },
      },
      poc_name: { type: DataTypes.STRING, allowNull: false },
      poc_designation: { type: DataTypes.STRING, allowNull: false },
      poc_contact: { type: DataTypes.BIGINT, allowNull: false },
      poc_email: { type: DataTypes.STRING, allowNull: false },
      date_of_first_contact: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: 'Poc',
      tableName: 'pocs',
      timestamps: true,
    }
  );

  return Poc;
};
