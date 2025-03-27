module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('partners', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      partner_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address_line_1: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address_line_2: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pincode: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      partner_affiliation_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      school_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      total_child_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lead_source: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      classes: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      low_income_resource: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'states',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      city_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'cities',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('partners');
  },
};
