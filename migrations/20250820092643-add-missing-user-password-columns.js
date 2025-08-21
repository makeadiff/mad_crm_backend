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

    const table = { schema, tableName: 'user_passwords' };
    const existing = await queryInterface.describeTable(table.tableName, { schema });

    const addIfMissing = async (col, def) => {
      if (!existing[col]) {
        await queryInterface.addColumn(table, col, def);
      }
    };

    // Check and add missing columns from the model
    await addIfMissing('plaintext_password', { type: Sequelize.TEXT, allowNull: true });
    await addIfMissing('is_default_password', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
    await addIfMissing('last_login_at', { type: Sequelize.DATE });
    await addIfMissing('password_changed_at', { type: Sequelize.DATE });
    await addIfMissing('login_attempts', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await addIfMissing('last_failed_login', { type: Sequelize.DATE });
    await addIfMissing('account_locked_until', { type: Sequelize.DATE });
  },

  async down(queryInterface) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging' ? 'mad_crm_staging'
       : env === 'test'    ? 'mad_crm_test'
       :                    'mad_crm_dev');

    const table = { schema, tableName: 'user_passwords' };
    const dropIfExists = async (col) => {
      const existing = await queryInterface.describeTable(table.tableName, { schema });
      if (existing[col]) {
        await queryInterface.removeColumn(table, col);
      }
    };

    await dropIfExists('plaintext_password');
    await dropIfExists('is_default_password');
    await dropIfExists('last_login_at');
    await dropIfExists('password_changed_at');
    await dropIfExists('login_attempts');
    await dropIfExists('last_failed_login');
    await dropIfExists('account_locked_until');
  }
};
