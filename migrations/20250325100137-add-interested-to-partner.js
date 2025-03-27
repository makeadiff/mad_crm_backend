module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('partners', 'interested', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('partners', 'interested');
  },
};
