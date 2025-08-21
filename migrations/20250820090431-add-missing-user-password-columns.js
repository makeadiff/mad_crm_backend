'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
        : env === 'staging' ? 'mad_crm_staging'
        : env === 'test' ? 'mad_crm_test'
        : 'mad_crm_dev');

    const tableName = 'user_passwords';
    const tbl = { schema, tableName };

    const existing = await queryInterface.describeTable(tableName, { schema });

    const addIfMissing = async (col, def) => {
      if (!existing[col]) {
        console.log(`⏳ Adding column "${col}"...`);
        await queryInterface.addColumn(tbl, col, def);
      }
    };

    await addIfMissing('plaintext_password', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await addIfMissing('is_default_password', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    });

    await addIfMissing('password_changed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await addIfMissing('login_attempts', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });

    await addIfMissing('last_failed_login', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await addIfMissing('account_locked_until', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await addIfMissing('emailToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await addIfMissing('resetToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await addIfMissing('emailVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    await addIfMissing('authType', {
      type: Sequelize.STRING,
      defaultValue: 'local',
    });

    await addIfMissing('loggedSessions', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    // Optional: createdAt/updatedAt if your table doesn't have timestamps managed
    if (!existing['createdAt']) {
      await queryInterface.addColumn(tbl, 'createdAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      });
    }

    if (!existing['updatedAt']) {
      await queryInterface.addColumn(tbl, 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      });
    }

    console.log(`✅ Migration completed for ${schema}.${tableName}`);
  },

  async down(queryInterface, Sequelize) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
        : env === 'staging' ? 'mad_crm_staging'
        : env === 'test' ? 'mad_crm_test'
        : 'mad_crm_dev');

    const tableName = 'user_passwords';
    const tbl = { schema, tableName };

    const fieldsToDrop = [
      'plaintext_password',
      'is_default_password',
      'password_changed_at',
      'login_attempts',
      'last_failed_login',
      'account_locked_until',
      'emailToken',
      'resetToken',
      'emailVerified',
      'authType',
      'loggedSessions',
      'createdAt',
      'updatedAt',
    ];

    const existing = await queryInterface.describeTable(tableName, { schema });

    for (const col of fieldsToDrop) {
      if (existing[col]) {
        console.log(`🧹 Removing column "${col}"...`);
        await queryInterface.removeColumn(tbl, col);
      }
    }

    console.log(`🔄 Rollback completed for ${schema}.${tableName}`);
  }
};
