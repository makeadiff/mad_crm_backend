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

    const tableName = 'user_data';                 // <— WAS 'users'
    const tbl = { schema, tableName };

    // Describe actual columns in the correct schema/table
    const existing = await queryInterface.describeTable(tableName, { schema });

    const addIfMissing = async (col, def) => {
      if (!existing[col]) {
        await queryInterface.addColumn(tbl, col, def);
      }
    };

    await addIfMissing('user_id', { type: Sequelize.INTEGER, allowNull: true, unique: true });
    await addIfMissing('center', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('added_by', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('contact', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('user_role', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('user_login', { type: Sequelize.STRING, allowNull: true, unique: true });
    await addIfMissing('user_display_name', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('reporting_manager_user_id', { type: Sequelize.INTEGER, allowNull: true });
    await addIfMissing('reporting_manager_role_code', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('reporting_manager_user_login', { type: Sequelize.STRING, allowNull: true });

    // Index helpers — only create if missing
    const addIndexIfMissing = async (name, cols) => {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_indexes WHERE schemaname = :schema AND tablename = :table AND indexname = :name`,
        { replacements: { schema, table: tableName, name } }
      );
      if (!rows.length) await queryInterface.addIndex(tbl, cols, { name });
    };

    await addIndexIfMissing('user_data_user_id_idx', ['user_id']);         // renamed to match table
    await addIndexIfMissing('user_data_user_login_idx', ['user_login']);
    await addIndexIfMissing('user_data_user_role_idx', ['user_role']);
  },

  async down(queryInterface) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging' ? 'mad_crm_staging'
       : env === 'test'    ? 'mad_crm_test'
       :                    'mad_crm_dev');

    const tableName = 'user_data';                 // <— WAS 'users'
    const tbl = { schema, tableName };

    // drop indexes (ignore if already absent)
    await queryInterface.removeIndex(tbl, 'user_data_user_id_idx').catch(() => {});
    await queryInterface.removeIndex(tbl, 'user_data_user_login_idx').catch(() => {});
    await queryInterface.removeIndex(tbl, 'user_data_user_role_idx').catch(() => {});

    // drop columns only if present
    const existing = await queryInterface.describeTable(tableName, { schema });
    const dropIfPresent = async (col) => existing[col] && queryInterface.removeColumn(tbl, col);

    await dropIfPresent('user_id');
    await dropIfPresent('center');
    await dropIfPresent('added_by');
    await dropIfPresent('contact');
    await dropIfPresent('user_role');
    await dropIfPresent('user_login');
    await dropIfPresent('user_display_name');
    await dropIfPresent('reporting_manager_user_id');
    await dropIfPresent('reporting_manager_role_code');
    await dropIfPresent('reporting_manager_user_login');
  }
};
