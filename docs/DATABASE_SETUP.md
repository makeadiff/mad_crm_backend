# Multi-Environment Database Setup Guide

This guide explains how to set up and manage databases across different environments (development, staging, production) using separate PostgreSQL schemas.

## Overview

The MAD CRM application uses PostgreSQL schemas to separate data between environments:

- **Development**: `mad_crm_dev` schema
- **Staging**: `mad_crm_staging` schema  
- **Test**: `mad_crm_test` schema
- **Production**: `mad_crm_prod` schema

All schemas reside in the same `mad_dalgo_warehouse` database but are completely isolated from each other.

## Quick Start

### 1. Environment Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Development Environment

```bash
# Create development schema and run migrations
npm run db:create:dev
npm run db:migrate:dev
npm run db:seed:dev
```

### 4. Test Connection

```bash
# Test development environment
NODE_ENV=development node scripts/test-connection.js

# Or test all environments
node scripts/test-connection.js
```

## Available Commands

### Database Management Scripts

```bash
# Help - show all available commands
npm run db:help

# Development Environment
npm run db:create:dev      # Create development schema
npm run db:migrate:dev     # Run migrations for development
npm run db:seed:dev        # Run seeds for development
npm run db:status:dev      # Check migration status for development
npm run db:reset:dev       # Reset development schema (destructive!)

# Staging Environment  
npm run db:create:staging  # Create staging schema
npm run db:migrate:staging # Run migrations for staging
npm run db:seed:staging    # Run seeds for staging
npm run db:status:staging  # Check migration status for staging
npm run db:reset:staging   # Reset staging schema (destructive!)

# Production Environment
npm run db:create:prod     # Create production schema
npm run db:migrate:prod    # Run migrations for production
npm run db:status:prod     # Check migration status for production
# Note: No reset or seed commands for production for safety

# Utility Commands
npm run db:sync-all        # Sync all environments to same migration status
```

### Direct Sequelize Commands

For advanced users who want to run sequelize commands directly:

```bash
# Run migration in current NODE_ENV
npm run migrate
NODE_ENV=staging npm run migrate

# Check migration status
npm run migrate:status
NODE_ENV=production npm run migrate:status

# Undo last migration
npm run migrate:undo
NODE_ENV=staging npm run migrate:undo
```

## Environment Switching

### Method 1: Using npm scripts (Recommended)

```bash
# Development
npm run db:migrate:dev

# Staging  
npm run db:migrate:staging

# Production
npm run db:migrate:prod
```

### Method 2: Using NODE_ENV

```bash
NODE_ENV=development npx sequelize-cli db:migrate
NODE_ENV=staging npx sequelize-cli db:migrate  
NODE_ENV=production npx sequelize-cli db:migrate
```

### Method 3: Using db-manager script directly

```bash
node scripts/db-manager.js migrate dev
node scripts/db-manager.js migrate staging
node scripts/db-manager.js migrate prod
```

## Common Workflows

### Setting Up a New Environment

1. **Create the schema**:
   ```bash
   npm run db:create:dev
   ```

2. **Run migrations**:
   ```bash
   npm run db:migrate:dev
   ```

3. **Seed with sample data** (non-production only):
   ```bash
   npm run db:seed:dev
   ```

4. **Verify setup**:
   ```bash
   NODE_ENV=development node scripts/test-connection.js
   ```

### Deploying to Production

1. **Create production schema**:
   ```bash
   npm run db:create:prod
   ```

2. **Run migrations**:
   ```bash
   npm run db:migrate:prod
   ```

3. **Verify migration status**:
   ```bash
   npm run db:status:prod
   ```

### Keeping Environments in Sync

To ensure all environments have the same migration status:

```bash
npm run db:sync-all
```

This will:
- Create schemas if they don't exist
- Run all pending migrations in each environment
- Seed non-production environments with sample data

### Development Reset

If you need to start fresh in development:

```bash
npm run db:reset:dev
```

⚠️ **Warning**: This will destroy all data in the development schema!

## Migration Management

### Creating New Migrations

```bash
# Create a new migration file
npx sequelize-cli migration:generate --name add-new-feature

# Edit the migration file in migrations/
# Then run it in your target environment
npm run db:migrate:dev
```

### Migration Status

Check which migrations have been applied:

```bash
npm run db:status:dev      # Development
npm run db:status:staging  # Staging  
npm run db:status:prod     # Production
```

### Rolling Back Migrations

```bash
# Undo last migration
NODE_ENV=development npm run migrate:undo

# Undo specific migration
NODE_ENV=development npx sequelize-cli db:migrate:undo --to YYYYMMDDHHMMSS-migration-name.js
```

## Troubleshooting

### Schema Doesn't Exist Error

If you get a schema doesn't exist error:

```bash
# Create the schema first
npm run db:create:dev
```

### Connection Refused

1. Check your database credentials in `.env`
2. Ensure the database server is running
3. Verify SSL settings in `config/config.json`

### Migration Already Applied Error

Check migration status and compare across environments:

```bash
npm run db:status:dev
npm run db:status:staging
npm run db:status:prod
```

### Testing Connections

Use the test script to diagnose connection issues:

```bash
# Test specific environment
NODE_ENV=development node scripts/test-connection.js

# Test all environments
node scripts/test-connection.js
```

## Security Considerations

- **Production Access**: Production database commands are limited to prevent accidental data loss
- **Schema Isolation**: Each environment is completely isolated from others
- **Migration Safety**: Always test migrations in development before applying to production
- **Backup Strategy**: Implement regular backups, especially for production

## Configuration Files

### config/config.json
Contains database configuration for each environment with schema settings.

### .env
Contains environment-specific variables like API keys and secrets.

### scripts/db-manager.js
Main database management script that handles schema creation and migration.

### scripts/test-connection.js
Utility script for testing database connections and schema status.

## Environment Schema Mapping

| Environment | NODE_ENV | Schema Name | Usage |
|-------------|----------|-------------|--------|
| Development | `development` | `mad_crm_dev` | Local development |
| Staging | `staging` | `mad_crm_staging` | Testing before production |
| Test | `test` | `mad_crm_test` | Automated testing |
| Production | `production` | `mad_crm_prod` | Live application |

## Next Steps

After setting up the database:

1. **Configure Hasura API** credentials in `.env`
2. **Set up user synchronization** cron jobs
3. **Test authentication flows** with synced user data
4. **Configure logging and monitoring** for production

For user synchronization setup, refer to the main authentication documentation.