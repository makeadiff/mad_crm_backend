module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mous', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      partner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'partners', key: 'id' },
        onDelete: 'CASCADE',
      },
      mou_sign_date: { type: Sequelize.DATE, allowNull: true },
      mou_start_date: { type: Sequelize.DATE, allowNull: true },
      mou_url: { type: Sequelize.STRING, allowNull: true },
      mou_status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'inactive',
      },
      mou_sign: { type: Sequelize.BOOLEAN, defaultValue: false },
      pending_mou_reason: { type: Sequelize.STRING, allowNull: true },
      potential_child_count: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mous');
  },
};
