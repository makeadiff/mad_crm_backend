const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('./logger');

// Simple constants
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
const  DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'password';

/**
 * Hash a password using bcrypt
 * @param {string} plainPassword - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(plainPassword) {
  try {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hash;
  } catch (error) {
    logger.error('Failed to hash password', { error: error.message });
    throw new Error('Password hashing failed');
  }
}

/**
 * Verify a password against a hash
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(plainPassword, hashedPassword) {
  try {
    if (!plainPassword || !hashedPassword) {
      return false;
    }

    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error('Failed to verify password', { error: error.message });
    return false;
  }
}

/**
 * Check if password is the default password
 * @param {string} plainPassword - Plain text password to check
 * @returns {boolean} True if it's the default password
 */
function isDefaultPassword(plainPassword) {
  return plainPassword === DEFAULT_PASSWORD;
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and issues
 */
function validatePasswordStrength(password) {
  const issues = [];
  
  if (!password || typeof password !== 'string') {
    return { isValid: false, issues: ['Password is required'] };
  }

  // Don't validate default password strength
  if (isDefaultPassword(password)) {
    return { isValid: true, issues: [] };
  }

  // Minimum length
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters long');
  }

  // Maximum length (prevent DoS attacks)
  if (password.length > 128) {
    issues.push('Password must be less than 128 characters');
  }

  // Contains uppercase letter
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
  }

  // Contains lowercase letter
  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter');
  }

  // Contains number
  if (!/\d/.test(password)) {
    issues.push('Password must contain at least one number');
  }

  // Contains special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    issues.push('Password must contain at least one special character');
  }

  // Common password check
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'admin123', 'letmein',
    'welcome123', 'password123', 'admin', '123456789', 'qwerty'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    issues.push('Password is too common, please choose a stronger password');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 16)
 * @returns {string} Generated password
 */
function generateSecurePassword(length = 16) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*(),.?":{}|<>';
  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';
  
  // Ensure at least one character from each category
  password += getRandomChar(lowercase);
  password += getRandomChar(uppercase);
  password += getRandomChar(numbers);
  password += getRandomChar(symbols);

  // Fill remaining length with random characters
  for (let i = 4; i < length; i++) {
    password += getRandomChar(allChars);
  }

  // Shuffle the password
  return shuffleString(password);
}

/**
 * Get a random character from a string
 * @param {string} str - String to pick from
 * @returns {string} Random character
 */
function getRandomChar(str) {
  const randomIndex = crypto.randomInt(0, str.length);
  return str.charAt(randomIndex);
}

/**
 * Shuffle a string randomly
 * @param {string} str - String to shuffle
 * @returns {string} Shuffled string
 */
function shuffleString(str) {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Generate a salt for password hashing
 * @returns {Promise<string>} Generated salt
 */
async function generateSalt() {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return salt;
  } catch (error) {
    logger.error('Failed to generate salt', { error: error.message });
    throw new Error('Salt generation failed');
  }
}

/**
 * Check if a password needs to be rehashed (if salt rounds have changed)
 * @param {string} hashedPassword - Current hashed password
 * @returns {boolean} True if rehashing is needed
 */
function needsRehashing(hashedPassword) {
  try {
    // Extract the cost factor from the hash
    const cost = parseInt(hashedPassword.substring(4, 6), 10);
    return cost !== SALT_ROUNDS;
  } catch (error) {
    logger.warn('Could not determine hash cost, assuming rehash needed', {
      error: error.message
    });
    return true;
  }
}

/**
 * Create password reset token
 * @returns {string} Reset token
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create email verification token
 * @returns {string} Verification token
 */
function generateEmailToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for secure storage
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Check if password change is allowed
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} Validation result
 */
function validatePasswordChange(currentPassword, newPassword) {
  const issues = [];

  // Can't change to the same password
  if (currentPassword === newPassword) {
    issues.push('New password must be different from current password');
  }

  // Can't change from custom password back to default
  if (!isDefaultPassword(currentPassword) && isDefaultPassword(newPassword)) {
    issues.push('Cannot change back to default password');
  }

  // Validate new password strength
  const strengthValidation = validatePasswordStrength(newPassword);
  if (!strengthValidation.isValid) {
    issues.push(...strengthValidation.issues);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Get default password (for testing purposes only)
 * @returns {string} Default password
 */
function getDefaultPassword() {
  return DEFAULT_PASSWORD;
}

/**
 * Log security event related to password
 * @param {string} event - Event type
 * @param {Object} details - Event details
 */
function logSecurityEvent(event, details = {}) {
  logger.security(`Password security event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Export all functions
module.exports = {
  hashPassword,
  verifyPassword,
  isDefaultPassword,
  validatePasswordStrength,
  generateSecurePassword,
  generateSalt,
  needsRehashing,
  generateResetToken,
  generateEmailToken,
  hashToken,
  validatePasswordChange,
  getDefaultPassword,
  logSecurityEvent
};