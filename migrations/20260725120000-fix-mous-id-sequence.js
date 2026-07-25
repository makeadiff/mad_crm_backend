'use strict';

// Resolves the same schema config/config.js would pick for the current run,
// so this migration touches the right schema in every environment (dev/staging/prod)
// instead of always hitting prod.
const DEFAULT_SCHEMAS = {
  development: 'mad_crm_dev',
  staging: 'mad_crm_staging',
  test: 'mad_crm_test',
  production: 'prod',
};
const schema = process.env.DB_SCHEMA || DEFAULT_SCHEMAS[process.env.NODE_ENV || 'development'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Create the sequence explicitly in the correct schema
    await queryInterface.sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS "${schema}".mous_id_seq;
    `);

    // Step 2: Set the default value for the id column
    await queryInterface.sequelize.query(`
      ALTER TABLE "${schema}".mous
      ALTER COLUMN id SET DEFAULT nextval('"${schema}".mous_id_seq'::regclass);
    `);

    // Step 3: Sync the sequence with the max(id)
    await queryInterface.sequelize.query(`
      SELECT setval('"${schema}".mous_id_seq', COALESCE((SELECT MAX(id) FROM "${schema}".mous), 1));
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "${schema}".mous ALTER COLUMN id DROP DEFAULT;
    `);

    await queryInterface.sequelize.query(`
      DROP SEQUENCE IF EXISTS "${schema}".mous_id_seq;
    `);
  },
};
