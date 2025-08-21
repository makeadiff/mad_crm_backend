const logger = require('./logger');

// Define allowed roles for platform access
const ALLOWED_ROLES = [
  'Project Associate',
  'Project Lead', 
  'Function Lead',
  'CO Full Time',
  'CO Part Time',
  'CXO',
  'CHO,CO Part Time',
  'Academic Support',
  'Wingman',
  'super_admin',
  'admin',
  'manager',
  'co'
];

// Define role hierarchy levels (higher number = more permissions)
const ROLE_HIERARCHY = {
  'super_admin': 100,
  'admin': 90,
  'CXO': 80,
  'Function Lead': 70,
  'Project Lead': 60,
  'manager': 50,
  'Project Associate': 40,
  'CO Full Time': 30,
  'CHO,CO Part Time': 25,
  'CO Part Time': 20,
  'Academic Support': 15,
  'Wingman': 10,
  'co': 5
};

// Check if user role is allowed to access platform
function isValidRole(userRole) {
  if (!userRole) return false;
  return ALLOWED_ROLES.includes(userRole);
}

// Get role level for hierarchy comparison
function getRoleLevel(userRole) {
  return ROLE_HIERARCHY[userRole] || 0;
}

// Check if user has required role level
function hasRoleLevel(userRole, requiredLevel) {
  const userLevel = getRoleLevel(userRole);
  return userLevel >= requiredLevel;
}

// Check if user can access admin features
function canAccessAdmin(userRole) {
  return hasRoleLevel(userRole, 50); // manager level and above
}

// Check if user can manage other users
function canManageUsers(userRole) {
  return hasRoleLevel(userRole, 70); // Function Lead and above
}

// Check if user can view sensitive data
function canViewSensitiveData(userRole) {
  return hasRoleLevel(userRole, 40); // Project Associate and above
}

// Middleware to check role access
function requireRole(requiredLevel) {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = user.user_role || user.role;
      
      if (!isValidRole(userRole)) {
        logger.security('Access denied - invalid role', {
          user_id: user.id || user.user_id,
          email: user.email,
          user_role: userRole,
          clientIP: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied - invalid role'
        });
      }

      if (!hasRoleLevel(userRole, requiredLevel)) {
        logger.security('Access denied - insufficient role level', {
          user_id: user.id || user.user_id,
          email: user.email,
          user_role: userRole,
          required_level: requiredLevel,
          user_level: getRoleLevel(userRole),
          clientIP: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied - insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Role validation error', {
        error: error.message,
        user_id: req.user?.id || req.user?.user_id,
        clientIP: req.ip
      });

      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
}

// Middleware to require admin access
function requireAdmin() {
  return requireRole(50); // manager level
}

// Middleware to require user management permissions
function requireUserManager() {
  return requireRole(70); // Function Lead level
}

// Get user permissions based on role
function getUserPermissions(userRole) {
  if (!isValidRole(userRole)) {
    return {
      canLogin: false,
      canAccessAdmin: false,
      canManageUsers: false,
      canViewSensitiveData: false,
      canChangePassword: false
    };
  }

  return {
    canLogin: true,
    canAccessAdmin: canAccessAdmin(userRole),
    canManageUsers: canManageUsers(userRole),
    canViewSensitiveData: canViewSensitiveData(userRole),
    canChangePassword: true,
    roleLevel: getRoleLevel(userRole)
  };
}

// Log role-based access attempt
function logRoleAccess(action, user, success, clientIP, additionalData = {}) {
  const logData = {
    action,
    user_id: user.id || user.user_id,
    email: user.email,
    user_role: user.user_role || user.role,
    success,
    clientIP,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  if (success) {
    logger.auth(`Role access granted: ${action}`, logData);
  } else {
    logger.security(`Role access denied: ${action}`, logData);
  }
}

module.exports = {
  ALLOWED_ROLES,
  ROLE_HIERARCHY,
  isValidRole,
  getRoleLevel,
  hasRoleLevel,
  canAccessAdmin,
  canManageUsers,
  canViewSensitiveData,
  requireRole,
  requireAdmin,
  requireUserManager,
  getUserPermissions,
  logRoleAccess
};