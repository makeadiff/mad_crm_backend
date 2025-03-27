module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('partner_agreements', 'potential_child_count', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('partner_agreements', 'potential_child_count');
  },
};
