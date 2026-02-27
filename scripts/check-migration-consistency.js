#!/usr/bin/env node

/**
 * Migration Consistency Checker
 *
 * Checks that all local migration files are applied in the target environment's DB.
 * Used as a pre-push gate to prevent deploying code that depends on unapplied migrations.
 *
 * Usage:
 *   node scripts/check-migration-consistency.js <environment>
 *
 * Environments:
 *   staging   - loads .env.staging, checks mad_crm_staging schema
 *   prod      - loads .env.production, checks prod schema (also verifies staging == prod)
 *
 * Exit codes:
 *   0 - All migrations are applied, safe to push
 *   1 - Pending migrations found or environments are out of sync (BLOCK push)
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

// ── Load the correct .env.{env} file ─────────────────────────────────────────

const TARGET_ENV = process.argv[2];
if (!TARGET_ENV) {
  console.error('Usage: node scripts/check-migration-consistency.js <staging|prod>');
  process.exit(1);
}

const NODE_ENV_MAP = {
  staging: 'staging',
  prod: 'production',
  production: 'production',
};

const nodeEnv = NODE_ENV_MAP[TARGET_ENV];
if (!nodeEnv) {
  console.error(`❌ Unknown environment: ${TARGET_ENV}. Use staging or prod.`);
  process.exit(1);
}

const envFile = path.resolve(__dirname, '..', `.env.${nodeEnv}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config(); // fallback
}

// ── Config derived from env vars (same as config/config.js) ──────────────────

function makeDbConfig(schema) {
  return {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    ssl: { require: true, rejectUnauthorized: false },
    // Set search_path so SequelizeMeta resolves to the right schema
    options: `-c search_path="${schema}",public`,
  };
}

// Schema for each environment (matches .env DB_SCHEMA)
const SCHEMA_MAP = {
  staging: process.env.DB_SCHEMA || 'mad_crm_staging',
};

// After loading prod .env we re-read DB_SCHEMA, but we need the staging schema too
const STAGING_SCHEMA = 'mad_crm_staging';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLocalMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  return fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();
}

async function getAppliedMigrations(client, schema) {
  try {
    const result = await client.query(
      `SELECT name FROM "${schema}"."SequelizeMeta" ORDER BY name`
    );
    return result.rows.map(r => r.name);
  } catch (err) {
    if (err.message.includes('does not exist')) {
      return []; // SequelizeMeta table not yet created — all migrations pending
    }
    throw err;
  }
}

function findPending(localFiles, appliedMigrations) {
  const appliedSet = new Set(appliedMigrations);
  return localFiles.filter(f => !appliedSet.has(f));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function checkEnvironment() {
  const targetSchema = process.env.DB_SCHEMA || (TARGET_ENV === 'staging' ? 'mad_crm_staging' : 'prod');
  const localFiles = getLocalMigrationFiles();

  console.log(`\n🔍 Migration Consistency Check`);
  console.log(`   Target   : ${TARGET_ENV} (schema: ${targetSchema})`);
  console.log(`   Local    : ${localFiles.length} migration file(s)`);

  const client = new Client(makeDbConfig(targetSchema));
  let hasErrors = false;

  try {
    await client.connect();

    // ── Check: local files vs target environment ──────────────────────────────
    const appliedInTarget = await getAppliedMigrations(client, targetSchema);
    console.log(`   Applied  : ${appliedInTarget.length} in ${targetSchema}\n`);

    const pendingInTarget = findPending(localFiles, appliedInTarget);
    if (pendingInTarget.length === 0) {
      console.log(`  ✅ ${TARGET_ENV}: all ${localFiles.length} migrations applied`);
    } else {
      hasErrors = true;
      console.log(`  ❌ ${TARGET_ENV}: ${pendingInTarget.length} migration(s) NOT applied:`);
      pendingInTarget.forEach(f => console.log(`       - ${f}`));
    }

    // ── For prod: also verify staging == prod ─────────────────────────────────
    if (TARGET_ENV === 'prod' || TARGET_ENV === 'production') {
      // Load staging env to get its DB config
      const stagingEnvFile = path.resolve(__dirname, '..', '.env.staging');
      const stagingEnv = dotenv.parse(fs.existsSync(stagingEnvFile) ? fs.readFileSync(stagingEnvFile) : '');

      const stagingClient = new Client({
        host: stagingEnv.DATABASE_HOST,
        port: parseInt(stagingEnv.DATABASE_PORT || '5432', 10),
        database: stagingEnv.DATABASE,
        user: stagingEnv.DATABASE_USER,
        password: stagingEnv.DATABASE_PASS,
        ssl: { require: true, rejectUnauthorized: false },
      });

      try {
        await stagingClient.connect();
        const appliedInStaging = await getAppliedMigrations(stagingClient, STAGING_SCHEMA);

        console.log(`\n  Comparing staging (${STAGING_SCHEMA}) vs prod (${targetSchema}):`);

        const prodSet = new Set(appliedInTarget);
        const stagingSet = new Set(appliedInStaging);

        const onlyInStaging = appliedInStaging.filter(m => !prodSet.has(m));
        const onlyInProd = appliedInTarget.filter(m => !stagingSet.has(m));

        if (onlyInStaging.length === 0 && onlyInProd.length === 0) {
          console.log(`  ✅ staging and prod schemas are in sync`);
        } else {
          hasErrors = true;
          if (onlyInStaging.length > 0) {
            console.log(`  ❌ Applied in staging but NOT in prod:`);
            onlyInStaging.forEach(m => console.log(`       - ${m}`));
          }
          if (onlyInProd.length > 0) {
            console.log(`  ⚠️  Applied in prod but NOT in staging:`);
            onlyInProd.forEach(m => console.log(`       - ${m}`));
          }
        }
      } finally {
        await stagingClient.end();
      }
    }

  } catch (err) {
    console.error(`\n❌ DB connection failed: ${err.message}`);
    console.error(`   Check that .env.${nodeEnv} has correct DATABASE_HOST / DATABASE_PASS credentials.`);
    process.exit(1);
  } finally {
    await client.end();
  }

  if (hasErrors) {
    console.log(`\n🚫 Push BLOCKED — run the missing migrations before pushing:`);
    if (TARGET_ENV === 'staging') {
      console.log(`   npm run db:migrate:staging`);
    } else {
      console.log(`   npm run db:migrate:prod`);
    }
    console.log();
    process.exit(1);
  }

  console.log(`\n✅ All good — migrations are consistent. Safe to push.\n`);
  process.exit(0);
}

checkEnvironment();
