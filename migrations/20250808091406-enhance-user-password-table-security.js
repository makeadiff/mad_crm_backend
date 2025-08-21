'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging' ? 'mad_crm_staging'
       : env === 'test'    ? 'mad_crm_test'
       :                    'mad_crm_dev');

    const tableName = 'user_passwords';       // <- ensure this matches your real table
    const tbl = { schema, tableName };

    // Look up existing columns in the correct schema
    const existing = await queryInterface.describeTable(tableName, { schema });

    const addIfMissing = async (col, def) => {
      if (!existing[col]) {
        await queryInterface.addColumn(tbl, col, def);
      }
    };

    // Example: only add if missing
    await addIfMissing('plaintext_password', {
      type: Sequelize.STRING,
      allowNull: true, // adjust to your intent
    });

    // repeat addIfMissing(...) for any other columns/indexes this migration adds
  },

  async down(queryInterface/*, Sequelize */) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging' ? 'mad_crm_staging'
       : env === 'test'    ? 'mad_crm_test'
       :                    'mad_crm_dev');

    const tableName = 'user_passwords';
    const tbl = { schema, tableName };

    // Drop only if present
    const existing = await queryInterface.describeTable(tableName, { schema });
    if (existing.plaintext_password) {
      await queryInterface.removeColumn(tbl, 'plaintext_password');
    }
  }
};
