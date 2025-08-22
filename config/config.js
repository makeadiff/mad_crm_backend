// config/config.js
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Get NODE_ENV (default to development)
const env = process.env.NODE_ENV || 'development';

// Load correct .env.{env} file
const envPath = path.resolve(process.cwd(), `.env.${env}`);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded env file: .env.${env}`);
} else {
  dotenv.config();  // fallback to default `.env`
  console.warn(`⚠️ .env.${env} not found. Loaded fallback .env`);
}


// Define default schemas per environment (used only if DB_SCHEMA is not set in .env)
const DEFAULT_SCHEMAS = {
  development: 'mad_crm_dev',
  staging: 'mad_crm_staging',
  test: 'mad_crm_test',
  production: 'prod',  // You mentioned prod schema is named "prod" inside "mad_dalgo_warehouse"
};

// Fallback schema if not explicitly set in env
const schema = process.env.DB_SCHEMA || DEFAULT_SCHEMAS[env];
console.log(`Using DB schema: ${schema}`);

// Logging toggle
const logging = (process.env.DB_LOGGING || '').toLowerCase() === 'true';

// SSL toggle (RDS typically requires this)
const useSSL = (process.env.DB_SSL || 'true').toLowerCase() !== 'false';

// Base config shared across environments
const base = {
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASS,
  database: process.env.DATABASE,
  host: process.env.DATABASE_HOST,
  dialect: 'postgres',
  logging,
  searchPath: `${schema}, public`,  // First search schema, fallback to public
  dialectOptions: {
    prependSearchPath: true,
    ...(useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {})
  },
  define: {
    schema, // Sequelize model-level default schema
  },
  migrationStorageTableName: 'SequelizeMeta',
  migrationStorageTableSchema: schema,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE_MS || '30000', 10),
    idle: parseInt(process.env.DB_POOL_IDLE_MS || '10000', 10),
  },
};

// Export all envs (can override specific fields per env if needed later)
module.exports = {
  development: { ...base },
  staging: { ...base },
  test: { ...base },
  production: { ...base },
};
