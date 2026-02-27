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
 *   staging   - checks mad_crm_staging schema
 *   prod      - checks mad_crm_prod schema (also verifies staging == prod)
 *
 * Exit codes:
 *   0 - All migrations are applied, safe to push
 *   1 - Pending migrations found or environments are out of sync (BLOCK push)
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'mad-dalgo-db.cj44c6c8697a.ap-south-1.rds.amazonaws.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'mad_dalgo_warehouse',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: { require: true, rejectUnauthorized: false }
};

const SCHEMAS = {
  dev: 'mad_crm_dev',
  development: 'mad_crm_dev',
  staging: 'mad_crm_staging',
  prod: 'mad_crm_prod',
  production: 'mad_crm_prod'
};

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

function printMigrationDiff(localFiles, appliedMigrations, envLabel) {
  const appliedSet = new Set(appliedMigrations);
  const pending = localFiles.filter(f => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log(`  ✅ ${envLabel}: all ${localFiles.length} migrations applied`);
    return [];
  }

  console.log(`  ❌ ${envLabel}: ${pending.length} migration(s) NOT applied:`);
  pending.forEach(f => console.log(`       - ${f}`));
  return pending;
}

async function checkEnvironment(targetEnv) {
  const schema = SCHEMAS[targetEnv];
  if (!schema) {
    console.error(`❌ Unknown environment: ${targetEnv}`);
    process.exit(1);
  }

  const localFiles = getLocalMigrationFiles();
  console.log(`\n🔍 Migration Consistency Check`);
  console.log(`   Target   : ${targetEnv} (schema: ${schema})`);
  console.log(`   Local    : ${localFiles.length} migration file(s)`);

  const client = new Client(DB_CONFIG);
  let hasErrors = false;

  try {
    await client.connect();

    const appliedInTarget = await getAppliedMigrations(client, schema);
    console.log(`   Applied  : ${appliedInTarget.length} in ${schema}\n`);

    const pendingInTarget = printMigrationDiff(localFiles, appliedInTarget, targetEnv);
    if (pendingInTarget.length > 0) hasErrors = true;

    // For prod, also verify that staging and prod are at the same level
    if (targetEnv === 'prod' || targetEnv === 'production') {
      const stagingSchema = SCHEMAS.staging;
      const appliedInStaging = await getAppliedMigrations(client, stagingSchema);

      console.log(`\n  Comparing staging vs prod:`);
      const stagingSet = new Set(appliedInStaging);
      const prodSet = new Set(appliedInTarget);

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
    }

  } catch (err) {
    console.error(`\n❌ DB connection failed: ${err.message}`);
    console.error(`   Make sure your .env has correct DB credentials and the DB is reachable.`);
    process.exit(1);
  } finally {
    await client.end();
  }

  if (hasErrors) {
    console.log(`\n🚫 Push BLOCKED — run the missing migrations before pushing:`);
    if (targetEnv === 'staging') {
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

const env = process.argv[2];
if (!env) {
  console.error('Usage: node scripts/check-migration-consistency.js <staging|prod>');
  process.exit(1);
}

checkEnvironment(env);
