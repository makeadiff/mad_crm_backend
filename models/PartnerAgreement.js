const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PartnerAgreement extends Model {
    static associate(models) {
      PartnerAgreement.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }

  PartnerAgreement.init(
    {
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'partners', key: 'id' },
      },
      conversion_stage: {
        type: DataTypes.ENUM(
          'new',
          'first_conversation',
          'interested',
          'interested_but_facing_delay',
          'not_interested',
          'converted',
          'dropped'
        ),
        allowNull: false,
      },
      specific_doc_required: { type: DataTypes.BOOLEAN, defaultValue: false },
      specific_doc_name: { type: DataTypes.STRING, allowNull: true },
      non_conversion_reason: { type: DataTypes.STRING, allowNull: true },
      current_status: { type: DataTypes.STRING, allowNull: true },
      expected_conversion_day: { type: DataTypes.INTEGER, allowNull: true },
      agreement_drop_date: { type: DataTypes.DATE, allowNull: true },
      potential_child_count: { type: DataTypes.INTEGER, allowNull: true },
      removed: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'PartnerAgreement',
      tableName: 'partner_agreements',
      timestamps: true,
    }
  );

  return PartnerAgreement;
};
