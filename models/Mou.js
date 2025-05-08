const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Mou extends Model {
    static associate(models) {
      Mou.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }

  Mou.init(
    {
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'partners', key: 'id' },
      },
      mou_sign_date: { type: DataTypes.DATE, allowNull: true },
      mou_start_date: { type: DataTypes.DATE, allowNull: true },
      mou_end_date: { type: DataTypes.DATE, allowNull: true },
      mou_url: { type: DataTypes.STRING, allowNull: true },
      mou_status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'inactive',
      },
      mou_sign: { type: DataTypes.BOOLEAN, defaultValue: false },
      pending_mou_reason: { type: DataTypes.STRING, allowNull: true },
      confirmed_child_count: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Mou',
      tableName: 'mous',
      schema: 'prod',
      timestamps: true,
    }
  );

  return Mou;
};
