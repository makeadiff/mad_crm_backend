module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('partners', 'low_income_resource', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: null, // ✅ Set default to NULL
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('partners', 'low_income_resource', {
      type: Sequelize.BOOLEAN,
      allowNull: false, // Revert to not-nullable
      defaultValue: false, // Revert to default false
    });
  },
};
