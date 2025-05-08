'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn(
        'manager_co', // table name
        'co_id', // column name
        {
          type: Sequelize.DECIMAL,
          allowNull: false,
        }
      ),
      queryInterface.changeColumn(
        'manager_co', // table name
        'manager_id', // column name
        {
          type: Sequelize.DECIMAL,
          allowNull: false,
        }
      ),
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn(
        'manager_co', // table name
        'co_id', // column name
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        }
      ),
      queryInterface.changeColumn(
        'manager_co', // table name
        'manager_id', // column name
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        }
      ),
    ]);
  },
};
