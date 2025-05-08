const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Meeting extends Model {
    static associate(models) {
      Meeting.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      Meeting.belongsTo(models.Poc, { foreignKey: 'poc_id', as: 'poc' });
      Meeting.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }

  Meeting.init(
    {
      user_id: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
      },
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
      meeting_date: { type: DataTypes.DATE, allowNull: false },
      follow_up_meeting_scheduled: { type: DataTypes.BOOLEAN, defaultValue: false },
      follow_up_meeting_date: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Meeting',
      tableName: 'meetings',
      schema: 'prod',
      timestamps: true,
    }
  );

  return Meeting;
};
