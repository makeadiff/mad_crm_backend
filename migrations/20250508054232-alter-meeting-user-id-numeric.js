'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
      { tableName: 'meetings', schema: 'prod' }, // add schema here if using non-public schema
      'user_id',
      {
        type: Sequelize.DECIMAL,
        allowNull: false,
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.changeColumn({ tableName: 'meetings', schema: 'prod' }, 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
