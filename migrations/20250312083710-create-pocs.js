module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pocs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      partner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'partners', key: 'id' },
        onDelete: 'CASCADE',
      },
      poc_name: { type: Sequelize.STRING, allowNull: false },
      poc_designation: { type: Sequelize.STRING, allowNull: false },
      poc_contact: { type: Sequelize.STRING, allowNull: false },
      poc_email: { type: Sequelize.STRING, allowNull: false },
      date_of_first_contact: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pocs');
  },
};
