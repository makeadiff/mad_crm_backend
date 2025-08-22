const fs = require('fs');
const path = require('path');

// Configuration
const LOG_DIR = process.env.LOG_DIRECTORY || path.join(__dirname, '../../logs');
const ENABLE_CONSOLE = process.env.NODE_ENV !== 'production';
const ENABLE_FILE = true;
const MAX_FILE_SIZE = parseInt(process.env.MAX_LOG_FILE_SIZE) * 1024 * 1024 || 10 * 1024 * 1024; // 10MB
const MAX_FILES = parseInt(process.env.MAX_LOG_FILES) || 5;

/**
 * Ensure log directory exists
 */
function ensureLogDirectory() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Get log file path for specific type
 * @param {string} type - Log type (sync, auth, error, etc.)
 * @returns {string} Log file path
 */
function getLogFilePath(type = 'app') {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `${type}-${date}.log`);
}

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @returns {string} Formatted log message
 */
function formatMessage(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
}

/**
 * Rotate log file if it exceeds max size
 * @param {string} filePath - Path to log file
 */
async function rotateLogIfNeeded(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;

    const stats = fs.statSync(filePath);
    if (stats.size < MAX_FILE_SIZE) return;

    // Rotate files
    const baseDir = path.dirname(filePath);
    const baseName = path.basename(filePath, '.log');
    const ext = '.log';

    // Move existing rotated files
    for (let i = MAX_FILES - 1; i > 0; i--) {
      const oldFile = path.join(baseDir, `${baseName}.${i}${ext}`);
      const newFile = path.join(baseDir, `${baseName}.${i + 1}${ext}`);
      
      if (fs.existsSync(oldFile)) {
        if (i === MAX_FILES - 1) {
          fs.unlinkSync(oldFile); // Delete oldest
        } else {
          fs.renameSync(oldFile, newFile);
        }
      }
    }

    // Move current file to .1
    const rotatedFile = path.join(baseDir, `${baseName}.1${ext}`);
    fs.renameSync(filePath, rotatedFile);

  } catch (error) {
    console.error('Failed to rotate log file:', error.message);
  }
}

/**
 * Write to log file
 * @param {string} filePath - Path to log file
 * @param {string} message - Formatted message
 */
async function writeToFile(filePath, message) {
  if (!ENABLE_FILE) return;

  try { 
    // Check file size and rotate if necessary
    await rotateLogIfNeeded(filePath);
    
    // Append to log file
    fs.appendFileSync(filePath, message + '\n', 'utf8');
  } catch (error) {
    console.error(`Failed to write to log file ${filePath}:`, error.message);
  }
}

/**
 * Generic log function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} type - Log type for file naming
 */
function log(level, message, metadata = {}, type = 'app') {
  const formattedMessage = formatMessage(level, message, metadata);

  // Console output
  if (ENABLE_CONSOLE) {
    switch (level.toLowerCase()) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  // File output
  if (ENABLE_FILE) {
    ensureLogDirectory();
    const filePath = getLogFilePath(type);
    writeToFile(filePath, formattedMessage);
  }
}

/**
 * Info level logging
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} type - Log type
 */
function info(message, metadata = {}, type = 'app') {
  log('info', message, metadata, type);
}

/**
 * Error level logging
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} type - Log type
 */
function error(message, metadata = {}, type = 'error') {
  log('error', message, metadata, type);
}

/**
 * Warning level logging
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} type - Log type
 */
function warn(message, metadata = {}, type = 'app') {
  log('warn', message, metadata, type);
}

/**
 * Debug level logging
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} type - Log type
 */
function debug(message, metadata = {}, type = 'debug') {
  log('debug', message, metadata, type);
}

/**
 * Sync-specific logging
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} level - Log level
 */
function sync(message, metadata = {}, level = 'info') {
  log(level, message, metadata, 'sync');
}

/**
 * Auth-specific logging
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} level - Log level
 */
function auth(message, metadata = {}, level = 'info') {
  log(level, message, metadata, 'auth');
}

/**
 * API-specific logging
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} level - Log level
 */
function api(message, metadata = {}, level = 'info') {
  log(level, message, metadata, 'api');
}

/**
 * Security-specific logging
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @param {string} level - Log level
 */
function security(message, metadata = {}, level = 'warn') {
  log(level, message, metadata, 'security');
}

/**
 * Log sync operation start
 * @param {string} syncType - Type of sync operation
 * @param {Object} options - Sync options
 */
function logSyncStart(syncType, options = {}) {
  sync(`Starting ${syncType} sync operation`, {
    syncType,
    options,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log sync operation completion
 * @param {string} syncType - Type of sync operation
 * @param {Object} stats - Sync statistics
 */
function logSyncComplete(syncType, stats) {
  sync('Sync complete', {
    syncType,
    stats,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log detailed sync summary to dedicated file
 * @param {Object} summaryLog - Summary statistics object
 */
function logSyncSummary(summaryLog) {
  // Use exactly the same pattern as logSyncStart - write to sync log file
  sync(`Completed ${summaryLog.syncType} sync operation`, {
    syncType: summaryLog.syncType,
    stats: summaryLog,
    timestamp: new Date().toISOString()
  });
}

/**
 * Create a dedicated completion log file with custom naming
 * @param {Object} summaryLog - Summary statistics object
 */
function createCompletionLogFile(summaryLog) {
  try {
    ensureLogDirectory();
    
    // Create timestamp for filename: YYYY-MM-DD_HH-MM-SS
    const now = new Date();
    const dateTime = now.toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .replace(/\..+/, ''); // Remove milliseconds and timezone
    
    // Create filename: completed_sync_log_YYYY-MM-DD_HH-MM-SS.log
    const filename = `completed_sync_log_${dateTime}.log`;
    const filePath = path.join(LOG_DIR, filename);
    
    // Prepare detailed log content
    const logContent = [
      '='.repeat(80),
      `SYNC COMPLETION REPORT`,
      '='.repeat(80),
      `Sync Type: ${summaryLog.syncType}`,
      `Completion Time: ${now.toISOString()}`,
      `Duration: ${summaryLog.durationSeconds} seconds`,
      '',
      'SYNC STATISTICS:',
      '-'.repeat(40),
      `Total Users Processed: ${summaryLog.totalUsers}`,
      `Users Created: ${summaryLog.created}`,
      `Users Updated: ${summaryLog.updated}`,
      `Users Skipped: ${summaryLog.skipped}`,
      `Errors Encountered: ${summaryLog.errors}`,
      `Success Rate: ${summaryLog.successRate}`,
      '',
      'SYNC STATUS:',
      '-'.repeat(40),
      `Status: ${summaryLog.failed ? 'FAILED' : 'COMPLETED SUCCESSFULLY'}`,
      summaryLog.failed ? `Error Message: ${summaryLog.errorMessage}` : '',
      '',
      'DETAILED BREAKDOWN:',
      '-'.repeat(40),
      `Start Time: ${new Date(now.getTime() - (summaryLog.durationSeconds * 1000)).toISOString()}`,
      `End Time: ${now.toISOString()}`,
      `Processing Rate: ${summaryLog.totalUsers > 0 ? (summaryLog.totalUsers / summaryLog.durationSeconds).toFixed(2) : 0} users/second`,
      '',
      summaryLog.failed ? 'SYNC FAILED - CHECK ERROR LOGS FOR DETAILS' : 'SYNC COMPLETED SUCCESSFULLY',
      '='.repeat(80),
      ''
    ].filter(line => line !== false && line !== '').join('\n');
    
    // Write to dedicated completion log file
    fs.writeFileSync(filePath, logContent, 'utf8');
    
    console.log(`✅ Completion log saved: ${filename}`);
    console.log(`📁 Log file location: ${filePath}`);
    
    return {
      success: true,
      filename,
      filePath,
      size: logContent.length
    };
    
  } catch (error) {
    console.error('Failed to create completion log file:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log sync operation error
 * @param {string} syncType - Type of sync operation
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
function logSyncError(syncType, error, context = {}) {
  sync(`Failed ${syncType} sync operation`, {
    syncType,
    error: error.message,
    stack: error.stack,
    ...context
  }, 'error');
}

/**
 * Log authentication attempt
 * @param {string} email - User email
 * @param {boolean} success - Whether login was successful
 * @param {string} reason - Failure reason if applicable
 * @param {Object} metadata - Additional metadata
 */
function logAuthAttempt(email, success, reason = null, metadata = {}) {
  const message = success 
    ? `Successful login for ${email}`
    : `Failed login for ${email}: ${reason}`;
  
  auth(message, {
    email,
    success,
    reason,
    timestamp: new Date().toISOString(),
    ...metadata
  }, success ? 'info' : 'warn');
}

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
function logSecurityEvent(event, details = {}) {
  security(`Security event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
}

/**
 * Get recent logs
 * @param {string} type - Log type
 * @param {number} lines - Number of lines to read
 * @returns {Promise<string[]>} Array of log lines
 */
async function getRecentLogs(type = 'app', lines = 100) {
  const filePath = getLogFilePath(type);
  
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const allLines = data.trim().split('\n').filter(line => line.trim());
    
    // Return last N lines
    return allLines.slice(-lines);
  } catch (error) {
    console.error('Failed to read log file:', error.message);
    return [];
  }
}

/**
 * Clean old log files
 * @param {number} daysToKeep - Number of days to keep logs
 */
async function cleanOldLogs(daysToKeep = 30) {
  try {
    ensureLogDirectory();
    const files = fs.readdirSync(LOG_DIR);
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));

    for (const file of files) {
      const filePath = path.join(LOG_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        info(`Cleaned old log file: ${file}`);
      }
    }
  } catch (error) {
    error('Failed to clean old logs', { error: error.message });
  }
}

// Export all functions
module.exports = {
  log,
  info,
  error,
  warn,
  debug,
  sync,
  auth,
  api,
  security,
  logSyncStart,
  logSyncComplete,
  logSyncSummary,
  createCompletionLogFile,
  logSyncError,
  logAuthAttempt,
  logSecurityEvent,
  getRecentLogs,
  cleanOldLogs
};