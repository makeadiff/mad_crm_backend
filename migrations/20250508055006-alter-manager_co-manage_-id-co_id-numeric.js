'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn({ tableName: 'manager_co', schema: 'prod' }, 'co_id', {
      type: Sequelize.DECIMAL,
      allowNull: false,
    });
    await queryInterface.changeColumn({ tableName: 'manager_co', schema: 'prod' }, 'manager_id', {
      type: Sequelize.DECIMAL,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn({ tableName: 'manager_co', schema: 'prod' }, 'co_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn({ tableName: 'manager_co', schema: 'prod' }, 'manager_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
