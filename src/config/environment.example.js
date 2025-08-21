/**
 * Environment Configuration Example for MAD CRM
 * 
 * Copy this file to .env in the project root and update the values
 * 
 * IMPORTANT: Never commit real credentials to version control
 */

// ==============================================================================
// DATABASE CONFIGURATION
// ==============================================================================

// PostgreSQL Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mad_crm_db
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DIALECT=postgres

// Database SSL Configuration (for production)
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

// ==============================================================================
// HASURA API CONFIGURATION
// ==============================================================================

// Hasura REST API Endpoint
// Example: https://your-hasura-instance.com/api/rest
HASURA_REST_API_ENDPOINT=https://your-hasura-instance.com/api/rest

// JWT Token for Hasura Authentication
// Get this token from your Hasura authentication system
HASURA_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Optional: Hasura Admin Secret (if using admin access instead of JWT)
# HASURA_ADMIN_SECRET=your_admin_secret_here

// ==============================================================================
// APPLICATION CONFIGURATION
// ==============================================================================

// Node Environment
NODE_ENV=development

// Server Port
PORT=8888

// JWT Secret for application authentication
JWT_SECRET=your_super_secret_jwt_key_here

// Session Secret
SESSION_SECRET=your_session_secret_here

// ==============================================================================
// SECURITY CONFIGURATION
// ==============================================================================

// Password Hash Salt Rounds
BCRYPT_SALT_ROUNDS=12

// Account Lockout Settings
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_TIME=30

// Default Password for first-time users
DEFAULT_PASSWORD=password

// ==============================================================================
// EMAIL CONFIGURATION (Optional)
// ==============================================================================

// SMTP Configuration for sending emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

// Email From Address
EMAIL_FROM=noreply@madcrm.com

// ==============================================================================
// FILE UPLOAD CONFIGURATION
// ==============================================================================

// Storage Type: local | s3
STORAGE_TYPE=local

// Local Storage Path
LOCAL_UPLOAD_PATH=./src/public/uploads

// AWS S3 Configuration (if using S3)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

// ==============================================================================
// LOGGING CONFIGURATION
// ==============================================================================

// Log Level: error | warn | info | debug
LOG_LEVEL=info

// Enable File Logging
LOG_TO_FILE=true

// Log Directory
LOG_DIRECTORY=./logs

// Max Log File Size (in MB)
MAX_LOG_FILE_SIZE=10

// Number of Log Files to Keep
MAX_LOG_FILES=5

// ==============================================================================
// SYNC CONFIGURATION
// ==============================================================================

// Default Sync Batch Size
SYNC_BATCH_SIZE=100

// Sync Timeout (in seconds)
SYNC_TIMEOUT=300

// Enable Sync Notifications
SYNC_NOTIFICATIONS=false

// Sync Notification Email
SYNC_NOTIFICATION_EMAIL=admin@madcrm.com

// ==============================================================================
// CORS CONFIGURATION
// ==============================================================================

// Allowed Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,https://your-frontend-domain.com

// ==============================================================================
// RATE LIMITING
// ==============================================================================

// Rate Limit Window (in minutes)
RATE_LIMIT_WINDOW=15

// Max Requests Per Window
RATE_LIMIT_MAX_REQUESTS=100

// ==============================================================================
// REDIS CONFIGURATION (Optional - for session storage)
// ==============================================================================

// Redis URL
REDIS_URL=redis://localhost:6379

// Redis Password
REDIS_PASSWORD=your_redis_password

// ==============================================================================
// MONITORING & OBSERVABILITY (Optional)
// ==============================================================================

// Application Name
APP_NAME=MAD_CRM

// Version
APP_VERSION=1.0.0

// Health Check Interval (in seconds)
HEALTH_CHECK_INTERVAL=300

// Enable Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=false

// ==============================================================================
// DEVELOPMENT ONLY
// ==============================================================================

// Enable Debug Mode
DEBUG=false

// Enable SQL Query Logging
LOG_SQL_QUERIES=false

// Disable Authentication (development only)
DISABLE_AUTH=false

// Mock Hasura API Responses
MOCK_HASURA_API=false