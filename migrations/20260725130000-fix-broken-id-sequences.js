'use strict';

// Same schema resolution as config/config.js, so this runs against the right
// schema in every environment (dev/staging/prod) instead of always hitting prod.
const DEFAULT_SCHEMAS = {
  development: 'mad_crm_dev',
  staging: 'mad_crm_staging',
  test: 'mad_crm_test',
  production: 'prod',
};
const schema = process.env.DB_SCHEMA || DEFAULT_SCHEMAS[process.env.NODE_ENV || 'development'];

// Tables found (via audit) to have lost their id column's DEFAULT nextval(...)
// while already containing sequential id data.
const TABLES = [
  'cities',
  'manager_co',
  'meetings',
  'partner_agreements',
  'partner_cos',
  'poc_partners',
  'pocs',
  'states',
];

module.exports = {
  up: async (queryInterface) => {
    for (const table of TABLES) {
      const seqName = `${table}_id_seq`;

      await queryInterface.sequelize.query(`
        CREATE SEQUENCE IF NOT EXISTS "${schema}"."${seqName}";
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE "${schema}"."${table}"
        ALTER COLUMN id SET DEFAULT nextval('"${schema}"."${seqName}"'::regclass);
      `);

      await queryInterface.sequelize.query(`
        SELECT setval('"${schema}"."${seqName}"', COALESCE((SELECT MAX(id) FROM "${schema}"."${table}"), 1));
      `);
    }
  },

  down: async (queryInterface) => {
    for (const table of TABLES) {
      const seqName = `${table}_id_seq`;

      await queryInterface.sequelize.query(`
        ALTER TABLE "${schema}"."${table}" ALTER COLUMN id DROP DEFAULT;
      `);

      await queryInterface.sequelize.query(`
        DROP SEQUENCE IF EXISTS "${schema}"."${seqName}";
      `);
    }
  },
};
