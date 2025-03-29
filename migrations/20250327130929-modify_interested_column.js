module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('partners', 'interested', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: null, // ✅ Change default value to NULL
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('partners', 'interested', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false, // ⬅️ Rollback to previous state
    });
  },
};
