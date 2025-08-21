const { User } = require('../../models');
const hasuraApi = require('../services/hasuraApiService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Sync statistics tracking
let syncStats = {
  total: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  startTime: null,
  endTime: null
};

/**
 * Initialize sync statistics
 */
function initSyncStats() {
  syncStats = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    startTime: new Date(),
    endTime: null
  };
}

/**
 * Log sync progress
 * @param {string} message - Log message
 * @param {string} level - Log level (info, warn, error)
 */
function logSync(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logPrefix = `[UserSync ${timestamp}]`;
  
  switch (level) {
    case 'error':
      console.error(`${logPrefix} ERROR: ${message}`);
      break;
    case 'warn':
      console.warn(`${logPrefix} WARN: ${message}`);
      break;
    default:
      console.log(`${logPrefix} INFO: ${message}`);
  }
}

/**
 * Validate user data before sync
 * @param {Object} userData - Transformed user data
 * @returns {Object} Validation result with isValid and errors
 */
// in src/scripts/userSyncService.js
function validateUserData(userData) {
  const errors = [];

  if (!userData.email) {
    errors.push('email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) errors.push('invalid email format');
  }

  // no numeric checks for user_id/reporting_manager_user_id
  if (userData.contact && userData.contact.length > 20) {
    errors.push('contact number too long');
  }

  return { isValid: errors.length === 0, errors };
}


/**
 * Check if user data needs to be updated
 * @param {Object} existingUser - User from database
 * @param {Object} newData - New user data from Hasura
 * @returns {boolean} True if update is needed
 */
function checkIfUpdateNeeded(existingUser, newData) {
  // Compare key fields that might change
  const fieldsToCompare = [
    'email', 'city', 'state', 'center', 'contact', 'user_role',
    'user_login', 'user_display_name', 'reporting_manager_user_id',
    'reporting_manager_role_code', 'reporting_manager_user_login'
  ];

  for (const field of fieldsToCompare) {
    const existingValue = existingUser[field];
    const newValue = newData[field];
    
    // Handle null/undefined comparison
    if (existingValue !== newValue) {
      return true;
    }
  }

  // Compare timestamps if available
  if (newData.user_updated_datetime && existingUser.user_updated_datetime) {
    const existingTime = new Date(existingUser.user_updated_datetime);
    const newTime = new Date(newData.user_updated_datetime);
    return newTime > existingTime;
  }

  return false;
}

/**
 * Upsert a single user record
 * @param {Object} userData - Transformed user data from Hasura
 * @returns {Object} Sync result with action taken
 */
async function upsertUser(userData) {
  try {
    // Validate user data
    const validation = validateUserData(userData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if user exists by user_id (primary identifier from Hasura)
    const existingUser = await User.findOne({
      where: { user_id: userData.user_id }
    });

    if (existingUser) {
      // Check if update is needed (compare timestamps or key fields)
      const needsUpdate = checkIfUpdateNeeded(existingUser, userData);
      
      if (needsUpdate) {
        await existingUser.update(userData);
        logSync(`Updated user: ${userData.email} (ID: ${userData.user_id})`);
        return { action: 'updated', user: existingUser };
      } else {
        logSync(`Skipped user (no changes): ${userData.email} (ID: ${userData.user_id})`);
        return { action: 'skipped', user: existingUser };
      }
    } else {
      // Check for existing user by email to avoid duplicates
      const emailUser = await User.findOne({
        where: { email: userData.email }
      });

      if (emailUser) {
        // User exists by email but not by user_id - update with Hasura data
        await emailUser.update(userData);
        logSync(`Merged user by email: ${userData.email} (ID: ${userData.user_id})`);
        return { action: 'updated', user: emailUser };
      } else {
        // Create new user
        const newUser = await User.create(userData);
        logSync(`Created new user: ${userData.email} (ID: ${userData.user_id})`);
        return { action: 'created', user: newUser };
      }
    }
  } catch (error) {
    logSync(`Failed to upsert user ${userData.email || 'unknown'}: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Sync all users from Hasura API
 * @param {Object} options - Sync options
 * @returns {Object} Sync summary
 */
// ...top of file unchanged

async function syncAllUsers(options = {}) {
  initSyncStats();
  logSync('Starting user synchronization from Hasura REST API');

  try {
    // Health check first
    const health = await hasuraApi.healthCheck();
    if (health.status !== 'healthy') {
      throw new Error(`Hasura API is not healthy: ${health.error}`);
    }
    logSync(`Hasura API is healthy. Response time: ${health.responseTime}ms`);

    // === NEW: fetch all at once (no pagination) ===
    logSync('Fetching all users from Hasura (no pagination)');
    const allUsers = await hasuraApi.fetchAllUsers();

    syncStats.total = allUsers.length;
    logSync(`Total users to sync: ${syncStats.total}`);

    for (let i = 0; i < allUsers.length; i++) {
      const apiUser = allUsers[i];
      try {
        const userData = hasuraApi.transformUserData(apiUser);
        const result = await upsertUser(userData);

        switch (result.action) {
          case 'created': syncStats.created++; break;
          case 'updated': syncStats.updated++; break;
          case 'skipped': syncStats.skipped++; break;
        }

        if ((i + 1) % 10 === 0) {
          logSync(`Progress: ${i + 1}/${syncStats.total} users processed`);
        }
      } catch (error) {
        syncStats.errors++;
        logSync(`Error processing user ${apiUser.email || apiUser.user_id}: ${error.message}`, 'error');
        if (options.stopOnError) throw error;
      }
    }

    syncStats.endTime = new Date();
    logSyncSummary();
    return syncStats;

  } catch (error) {
    syncStats.endTime = new Date();
    logSync(`Sync failed: ${error.message}`, 'error');
    throw error;
  }
}


/**
 * Sync users with specific filters
 * @param {Object} filters - Filters to apply
 * @param {Object} options - Sync options
 * @returns {Object} Sync summary
 */
async function syncUsersWithFilters(filters, options = {}) {
  initSyncStats();
  logSync(`Starting filtered user sync with filters: ${JSON.stringify(filters)}`);

  try {
    const users = await hasuraApi.fetchUsersWithFilters(filters);
    syncStats.total = users.length;
    
    logSync(`Total filtered users to sync: ${syncStats.total}`);

    for (let i = 0; i < users.length; i++) {
      const apiUser = users[i];
      
      try {
        const userData = hasuraApi.transformUserData(apiUser);
        const result = await upsertUser(userData);
        
        switch (result.action) {
          case 'created':
            syncStats.created++;
            break;
          case 'updated':
            syncStats.updated++;
            break;
          case 'skipped':
            syncStats.skipped++;
            break;
        }

      } catch (error) {
        syncStats.errors++;
        logSync(`Error processing user ${apiUser.email || apiUser.user_id}: ${error.message}`, 'error');
        
        if (options.stopOnError) {
          throw error;
        }
      }
    }

    syncStats.endTime = new Date();
    logSyncSummary();

    return syncStats;

  } catch (error) {
    syncStats.endTime = new Date();
    logSync(`Filtered sync failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Sync only recently updated users (delta sync)
 * @param {Date} since - Only sync users updated after this date
 * @param {Object} options - Sync options
 * @returns {Object} Sync summary
 */
async function syncRecentUsers(since, options = {}) {
  const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
  
  logSync(`Starting delta sync for users updated since: ${sinceDate.toISOString()}`);
  
  return await syncUsersWithFilters({
    updated_after: sinceDate.toISOString()
  }, options);
}

/**
 * Log sync summary
 */
function logSyncSummary() {
  const duration = syncStats.endTime - syncStats.startTime;
  const durationSeconds = Math.round(duration / 1000);
  
  logSync('=== SYNC SUMMARY ===');
  logSync(`Duration: ${durationSeconds} seconds`);
  logSync(`Total Users: ${syncStats.total}`);
  logSync(`Created: ${syncStats.created}`);
  logSync(`Updated: ${syncStats.updated}`);
  logSync(`Skipped: ${syncStats.skipped}`);
  logSync(`Errors: ${syncStats.errors}`);
  logSync(`Success Rate: ${syncStats.total > 0 ? Math.round(((syncStats.total - syncStats.errors) / syncStats.total) * 100) : 100}%`);
  logSync('===================');
}

/**
 * Get sync statistics
 * @returns {Object} Current sync statistics
 */
function getSyncStats() {
  return { ...syncStats };
}

// Export all functions
module.exports = {
  syncAllUsers,
  syncUsersWithFilters,
  syncRecentUsers,
  getSyncStats
};