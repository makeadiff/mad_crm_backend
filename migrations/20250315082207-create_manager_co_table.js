module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('manager_co', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      co_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      manager_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addConstraint('manager_co', {
      fields: ['co_id', 'manager_id'],
      type: 'unique',
      name: 'unique_co_manager_relationship', // Prevent duplicate mappings
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('manager_co');
  },
};
