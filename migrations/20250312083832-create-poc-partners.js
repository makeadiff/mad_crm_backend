module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('poc_partners', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
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
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('poc_partners');
  },
};
