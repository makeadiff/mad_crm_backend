'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Create the sequence explicitly in the correct schema
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'partners_id_seq' AND n.nspname = 'prod'
        ) THEN
          CREATE SEQUENCE prod.partners_id_seq;
        END IF;
      END $$;
    `);

    // Step 2: Set the default value for the id column
    await queryInterface.sequelize.query(`
      ALTER TABLE prod.partners
      ALTER COLUMN id SET DEFAULT nextval('prod.partners_id_seq'::regclass);
    `);

    // Step 3: Sync the sequence with the max(id)
    await queryInterface.sequelize.query(`
      SELECT setval('prod.partners_id_seq', COALESCE((SELECT MAX(id) FROM prod.partners), 1));
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE prod.partners ALTER COLUMN id DROP DEFAULT;
    `);

    await queryInterface.sequelize.query(`
      DROP SEQUENCE IF EXISTS prod.partners_id_seq;
    `);
  },
};
