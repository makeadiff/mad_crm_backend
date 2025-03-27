module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meetings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      poc_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'pocs', key: 'id' },
        onDelete: 'CASCADE',
      },
      partner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'partners', key: 'id' },
        onDelete: 'CASCADE',
      },
      meeting_date: { type: Sequelize.DATE, allowNull: false },
      follow_up_meeting_scheduled: { type: Sequelize.BOOLEAN, defaultValue: false },
      follow_up_meeting_date: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('meetings');
  },
};
