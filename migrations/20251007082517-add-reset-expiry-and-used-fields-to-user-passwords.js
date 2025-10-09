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

    // Describe table within schema
    const existing = await queryInterface.describeTable(table.tableName, { schema });

    const addIfMissing = async (col, def) => {
      if (!existing[col]) {
        await queryInterface.addColumn(table, col, def);
      }
    };

    // Add the two new columns (skip if already present)
    await addIfMissing('reset_token_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Expiry time for password reset token (short-lived, e.g. 10 minutes)',
    });

    await addIfMissing('reset_used_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when the reset token was actually used (prevents reuse)',
    });

    // (Optional) If you want faster lookups by token, add an index on existing resetToken.
    // Wrap in try/catch to avoid failures if the index already exists or dialect doesn’t support where.
    try {
      await queryInterface.addIndex(table, ['resetToken'], {
        name: 'idx_user_passwords_resetToken',
        unique: false,
      });
    } catch (e) {
      // no-op: index may already exist or dialect doesn’t support this exact call
    }
  },

  async down(queryInterface /*, Sequelize */) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging' ? 'mad_crm_staging'
       : env === 'test'    ? 'mad_crm_test'
       :                    'mad_crm_dev');

    const table = { schema, tableName: 'user_passwords' };

    const dropIfExists = async (col) => {
      const current = await queryInterface.describeTable(table.tableName, { schema });
      if (current[col]) {
        await queryInterface.removeColumn(table, col);
      }
    };

    await dropIfExists('reset_token_expires_at');
    await dropIfExists('reset_used_at');

    // Best-effort index removal
    try {
      await queryInterface.removeIndex(table, 'idx_user_passwords_resetToken');
    } catch (e) {
      // ignore if index wasn't created
    }
  }
};
