'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('mous', 'potential_child_count', 'confirmed_child_count');
    await queryInterface.addColumn('mous', 'mou_end_date', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('mous', 'confirmed_child_count', 'potential_child_count');
    await queryInterface.removeColumn('mous', 'mou_end_date'); 
  },
};