'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE prod.partners
      ALTER COLUMN pincode TYPE INTEGER USING NULLIF(pincode, '')::INTEGER,
      ALTER COLUMN low_income_resource TYPE BOOLEAN USING NULLIF(low_income_resource, '')::BOOLEAN,
      ALTER COLUMN created_by TYPE NUMERIC USING NULLIF(created_by, '')::NUMERIC,
      ALTER COLUMN classes TYPE TEXT[] USING string_to_array(REPLACE(REPLACE(classes, '{', ''), '}', ''), ','),
      ALTER COLUMN "partner_name" SET NOT NULL,
      ALTER COLUMN "address_line_1" SET NOT NULL,
      ALTER COLUMN "pincode" SET NOT NULL,
      ALTER COLUMN "lead_source" SET NOT NULL,
      ALTER COLUMN "created_by" SET NOT NULL,
      ALTER COLUMN "createdAt" SET DEFAULT now(),
      ALTER COLUMN "updatedAt" SET DEFAULT now(),
      ALTER COLUMN "createdAt" SET NOT NULL,
      ALTER COLUMN "updatedAt" SET NOT NULL,
      ALTER COLUMN "removed" SET DEFAULT false,
      ALTER COLUMN "removed" SET NOT NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE prod.partners
      ALTER COLUMN pincode TYPE VARCHAR(20),
      ALTER COLUMN low_income_resource TYPE VARCHAR(255),
      ALTER COLUMN created_by TYPE VARCHAR(255),
      ALTER COLUMN classes TYPE VARCHAR(255),
      ALTER COLUMN "createdAt" DROP DEFAULT,
      ALTER COLUMN "updatedAt" DROP DEFAULT,
      ALTER COLUMN "removed" DROP DEFAULT,
      ALTER COLUMN "partner_name" DROP NOT NULL,
      ALTER COLUMN "address_line_1" DROP NOT NULL,
      ALTER COLUMN "pincode" DROP NOT NULL,
      ALTER COLUMN "lead_source" DROP NOT NULL,
      ALTER COLUMN "created_by" DROP NOT NULL,
      ALTER COLUMN "createdAt" DROP NOT NULL,
      ALTER COLUMN "updatedAt" DROP NOT NULL,
      ALTER COLUMN "removed" DROP NOT NULL;
    `);
  },
};
