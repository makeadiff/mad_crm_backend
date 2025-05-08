'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
      { tableName: 'partner_cos', schema: 'prod' }, // add schema here if using non-public schema
      'co_id',
      {
        type: Sequelize.DECIMAL,
        allowNull: false,
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn({ tableName: 'partner_cos', schema: 'prod' }, 'co_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
