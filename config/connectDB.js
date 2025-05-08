require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE, // database name
  process.env.DATABASE_USER, // username
  process.env.DATABASE_PASS, // password
  {
    host: process.env.DATABASE_HOST,
    port: 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      schema: 'prod', // 👈 THIS sets default schema for all models
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }
);

const connectDB = async () => {
  
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected Successfully!');
  } catch (error) {
    console.error('❌ PostgreSQL Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB, Sequelize };
