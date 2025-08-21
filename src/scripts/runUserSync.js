#!/usr/bin/env node

/**
 * User Sync Script
 * 
 * This script can be run manually or via cron to sync users from Hasura API
 * 
 * Usage:
 *   node runUserSync.js [options]
 * 
 * Options:
 *   --type=full|delta|filtered    Type of sync (default: full)
 *   --since=YYYY-MM-DD            For delta sync, sync users since this date
 *   --batch-size=100              Batch size for pagination (default: 100)
 *   --stop-on-error               Stop sync on first error (default: continue)
 *   --filters='{"role":"Wingman"}'  JSON filters for filtered sync
 *   --dry-run                     Don't actually save changes, just log what would happen
 *   --help                        Show this help message
 */

require('dotenv').config();

const userSyncService = require('./userSyncService');
const logger = require('../utils/logger');

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
      type: 'full',
      batchSize: 100,
      stopOnError: false,
      dryRun: false,
      since: null,
      filters: null
    };

    args.forEach(arg => {
      if (arg === '--help') {
        showHelp();
        process.exit(0);
      } else if (arg === '--stop-on-error') {
        options.stopOnError = true;
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg.startsWith('--type=')) {
        options.type = arg.split('=')[1];
      } else if (arg.startsWith('--since=')) {
        options.since = new Date(arg.split('=')[1]);
      } else if (arg.startsWith('--batch-size=')) {
        options.batchSize = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--filters=')) {
        try {
          options.filters = JSON.parse(arg.split('=')[1]);
        } catch (error) {
          console.error('Invalid JSON in filters argument');
          process.exit(1);
        }
      }
    });

    return options;
}

/**
 * Show help message
 */
function showHelp() {
    console.log(`
User Sync Script

This script syncs users from Hasura API to the CRM database.

Usage:
  node runUserSync.js [options]

Options:
  --type=full|delta|filtered    Type of sync (default: full)
  --since=YYYY-MM-DD            For delta sync, sync users since this date
  --batch-size=100              Batch size for pagination (default: 100)
  --stop-on-error               Stop sync on first error (default: continue)
  --filters='{"role":"Wingman"}'  JSON filters for filtered sync
  --dry-run                     Don't actually save changes, just log what would happen
  --help                        Show this help message

Examples:
  # Full sync
  node runUserSync.js --type=full

  # Delta sync (last 24 hours)
  node runUserSync.js --type=delta

  # Delta sync (since specific date)
  node runUserSync.js --type=delta --since=2025-01-01

  # Filtered sync (specific role)
  node runUserSync.js --type=filtered --filters='{"user_role":"Wingman"}'

  # Dry run (don't save changes)
  node runUserSync.js --type=full --dry-run
    `);
}

/**
 * Validate options
 * @param {Object} options - Options to validate
 * @returns {boolean} True if options are valid
 */
function validateOptions(options) {
    const validTypes = ['full', 'delta', 'filtered'];
    
    if (!validTypes.includes(options.type)) {
      console.error(`Invalid sync type: ${options.type}. Valid types: ${validTypes.join(', ')}`);
      return false;
    }

    if (options.type === 'filtered' && !options.filters) {
      console.error('Filtered sync requires --filters argument');
      return false;
    }

    if (options.batchSize <= 0) {
      console.error('Batch size must be a positive integer');
      return false;
    }

    if (options.since && isNaN(options.since.getTime())) {
      console.error('Invalid date format for --since. Use YYYY-MM-DD');
      return false;
    }

    return true;
}

/**
 * Run the sync operation
 * @param {Object} options - Sync options
 */
async function run(options) {
    try {
      console.log('🚀 Starting User Sync Script');
      console.log('============================');
      console.log(`Sync Type: ${options.type}`);
      console.log(`Batch Size: ${options.batchSize}`);
      console.log(`Stop on Error: ${options.stopOnError}`);
      console.log(`Dry Run: ${options.dryRun}`);
      
      if (options.since) {
        console.log(`Since: ${options.since.toISOString()}`);
      }
      
      if (options.filters) {
        console.log(`Filters: ${JSON.stringify(options.filters)}`);
      }
      
      console.log('============================\n');

      // Validate options
      if (!validateOptions(options)) {
        process.exit(1);
      }

      // Log sync start
      logger.logSyncStart(options.type, options);

      let syncStats;

      // Execute appropriate sync type
      switch (options.type) {
        case 'full':
          syncStats = await runFullSync(options);
          break;
        case 'delta':
          syncStats = await runDeltaSync(options);
          break;
        case 'filtered':
          syncStats = await runFilteredSync(options);
          break;
        default:
          throw new Error(`Unknown sync type: ${options.type}`);
      }

      // SIMPLE TEST - Add basic completion log first
      logger.logSyncStart('SYNC_COMPLETION_TEST', { message: 'This should appear in log if completion section is reached' });

      // Log completion
      logger.logSyncComplete(options.type, syncStats);
      
      // Log sync completion with same pattern as start
      logger.logSyncStart('completed-' + options.type, {
        durationSeconds: Math.round((syncStats.endTime - syncStats.startTime) / 1000),
        totalUsers: syncStats.total,
        created: syncStats.created,
        updated: syncStats.updated,
        skipped: syncStats.skipped,
        errors: syncStats.errors,
        successRate: syncStats.total > 0 ? 
          Math.round(((syncStats.created + syncStats.updated) / syncStats.total) * 100) + '%' : '100%'
      });

      // Display results
      console.log('\n✅ Sync completed successfully!');
      console.log('===============================');
      console.log(`Duration: ${Math.round((syncStats.endTime - syncStats.startTime) / 1000)} seconds`);
      console.log(`Total Users: ${syncStats.total}`);
      console.log(`Created: ${syncStats.created}`);
      console.log(`Updated: ${syncStats.updated}`);
      console.log(`Skipped: ${syncStats.skipped}`);
      console.log(`Errors: ${syncStats.errors}`);

      
      const successRate = syncStats.total > 0 ? 
        Math.round(((syncStats.total - syncStats.errors) / syncStats.total) * 100) : 100;
      console.log(`Success Rate: ${successRate}%`);

      const summaryLog = {
        syncType: options.type,
        durationSeconds: Math.round((syncStats.endTime - syncStats.startTime) / 1000),
        totalUsers: syncStats.total,
        created: syncStats.created,
        updated: syncStats.updated,
        skipped: syncStats.skipped,
        errors: syncStats.errors,
        successRate: syncStats.total > 0 ? 
          Math.round(((syncStats.created + syncStats.updated) / syncStats.total) * 100) + '%' : '100%'
      };

      // Log detailed summary to dedicated file
      console.log('Writing sync summary to log file...');
      logger.logSyncSummary(summaryLog);


      // Exit with appropriate code
      process.exit(syncStats.errors > 0 ? 1 : 0);

    } catch (error) {
      console.error('\n❌ Sync failed:', error.message);
      
      // Log error
      logger.logSyncError(options.type, error, {
        options: options
      });

      // If we have partial syncStats, still log what we can
      if (syncStats) {
        const summaryLog = {
          syncType: options.type,
          durationSeconds: syncStats.endTime ? Math.round((syncStats.endTime - syncStats.startTime) / 1000) : 0,
          totalUsers: syncStats.total || 0,
          created: syncStats.created || 0,
          updated: syncStats.updated || 0,
          skipped: syncStats.skipped || 0,
          errors: (syncStats.errors || 0) + 1, // +1 for the main error
          successRate: '0%',
          failed: true,
          errorMessage: error.message
        };
        
        console.log('Writing failed sync summary to log file...');
        logger.logSyncSummary(summaryLog);
      }

      process.exit(1);
    }
}

/**
 * Run full sync
 * @param {Object} options - Sync options
 * @returns {Object} Sync statistics
 */
async function runFullSync(options) {
  console.log('🔄 Running full sync...\n');
  return await userSyncService.syncAllUsers({
    batchSize: options.batchSize,
    stopOnError: options.stopOnError,
    dryRun: options.dryRun
  });
}

/**
 * Run delta sync
 * @param {Object} options - Sync options
 * @returns {Object} Sync statistics
 */
async function runDeltaSync(options) {
  const sinceDate = options.since || new Date(Date.now() - 24 * 60 * 60 * 1000);
  console.log(`🔄 Running delta sync since ${sinceDate.toISOString()}...\n`);
  
  return await userSyncService.syncRecentUsers(sinceDate, {
    batchSize: options.batchSize,
    stopOnError: options.stopOnError,
    dryRun: options.dryRun
  });
}

/**
 * Run filtered sync
 * @param {Object} options - Sync options
 * @returns {Object} Sync statistics
 */
async function runFilteredSync(options) {
  console.log(`🔄 Running filtered sync with filters: ${JSON.stringify(options.filters)}...\n`);
  
  return await userSyncService.syncUsersWithFilters(options.filters, {
    batchSize: options.batchSize,
    stopOnError: options.stopOnError,
    dryRun: options.dryRun
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  logger.error('Uncaught exception in user sync script', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled rejection in user sync script', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
  process.exit(1);
});

// Run the script
if (require.main === module) {
  const options = parseArguments();
  run(options);
}

module.exports = {
  parseArguments,
  showHelp,
  validateOptions,
  run,
  runFullSync,
  runDeltaSync,
  runFilteredSync
};