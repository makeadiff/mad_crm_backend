module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('partner_agreements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      partner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      conversion_stage: {
        type: Sequelize.ENUM(
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
      specific_doc_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      specific_doc_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      non_conversion_reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      current_status: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      expected_conversion_day: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      agreement_drop_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      removed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('partner_agreements');
  },
};
