// src/db/connect.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

const env = process.env.NODE_ENV || 'development';
const all = require('../config/config.js');
const cfg = all[env];
const activeSchema = process.env.DB_SCHEMA || cfg.define?.schema || 'public';

const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, cfg);

// ✅ Ensure EVERY pooled connection sets the search_path
sequelize.addHook('afterConnect', async (conn) => {
  // `conn` is the raw pg client (not sequelize)
  await conn.query(`SET search_path TO "${activeSchema}", public;`);
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ PostgreSQL connected. NODE_ENV=${env} schema=${activeSchema}`);

    // Now borrow a connection and check its setting
    const [rows] = await sequelize.query('SHOW search_path;');
    console.log('🔎 search_path:', rows?.[0]?.search_path);
  } catch (error) {
    console.error('❌ PostgreSQL Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB, Sequelize };
