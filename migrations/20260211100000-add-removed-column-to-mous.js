'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging' ? 'mad_crm_staging'
       : env === 'test'    ? 'mad_crm_test'
       :                    'mad_crm_dev');

    const table = { schema, tableName: 'mous' };

    // Step 1: Add the `removed` column with default false
    await queryInterface.addColumn(table, 'removed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Step 2: Remap existing data — inactive MOUs get removed = true
    await queryInterface.bulkUpdate(
      table,
      { removed: true },
      { mou_status: 'inactive' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging' ? 'mad_crm_staging'
       : env === 'test'    ? 'mad_crm_test'
       :                    'mad_crm_dev');

    const table = { schema, tableName: 'mous' };

    await queryInterface.removeColumn(table, 'removed');
  },
};
