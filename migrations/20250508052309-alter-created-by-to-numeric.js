'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
      { tableName: 'partners', schema: 'prod' }, // add schema here if using non-public schema
      'created_by',
      {
        type: Sequelize.DECIMAL,
        allowNull: false,
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn({ tableName: 'partners', schema: 'prod' }, 'created_by', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
