#!/bin/bash

# Setup Cron Jobs for MAD CRM User Sync
# This script sets up automated user synchronization from Hasura API

# Configuration
PROJECT_DIR="/path/to/mad_crm/mad_crm_backend"  # Update this path
NODE_PATH="/usr/bin/node"                      # Update node path if different
LOG_DIR="$PROJECT_DIR/logs/cron"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate configuration
validate_config() {
    print_status "Validating configuration..."
    
    # Check if node exists
    if ! command_exists node; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check if project directory exists
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "Project directory not found: $PROJECT_DIR"
        print_error "Please update PROJECT_DIR in this script"
        exit 1
    fi
    
    # Check if sync script exists
    if [ ! -f "$PROJECT_DIR/src/scripts/runUserSync.js" ]; then
        print_error "Sync script not found: $PROJECT_DIR/src/scripts/runUserSync.js"
        exit 1
    fi
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    print_status "Configuration validated successfully"
}

# Function to create wrapper script
create_wrapper_script() {
    print_status "Creating cron wrapper script..."
    
    WRAPPER_SCRIPT="$PROJECT_DIR/cron/user-sync-wrapper.sh"
    
    cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash

# User Sync Cron Wrapper
# This script is called by cron to run user synchronization

# Change to project directory
cd "$PROJECT_DIR"

# Load environment variables
if [ -f ".env" ]; then
    export \$(cat .env | grep -v '^#' | xargs)
fi

# Set NODE_ENV
export NODE_ENV=production

# Function to log with timestamp
log_with_timestamp() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1"
}

# Run sync based on argument
SYNC_TYPE=\${1:-"delta"}
LOG_FILE="$LOG_DIR/user-sync-\$(date +%Y%m%d).log"

log_with_timestamp "Starting \$SYNC_TYPE sync" >> "\$LOG_FILE"

# Run the sync
$NODE_PATH "$PROJECT_DIR/src/scripts/runUserSync.js" --type="\$SYNC_TYPE" >> "\$LOG_FILE" 2>&1

EXIT_CODE=\$?

if [ \$EXIT_CODE -eq 0 ]; then
    log_with_timestamp "\$SYNC_TYPE sync completed successfully" >> "\$LOG_FILE"
else
    log_with_timestamp "\$SYNC_TYPE sync failed with exit code \$EXIT_CODE" >> "\$LOG_FILE"
    
    # Optional: Send notification email on failure
    # mail -s "MAD CRM User Sync Failed" admin@example.com < "\$LOG_FILE"
fi

exit \$EXIT_CODE
EOF

    chmod +x "$WRAPPER_SCRIPT"
    print_status "Wrapper script created: $WRAPPER_SCRIPT"
}

# Function to setup cron jobs
setup_cron_jobs() {
    print_status "Setting up cron jobs..."
    
    # Create temporary cron file
    TEMP_CRON="/tmp/mad_crm_cron"
    
    # Get existing cron jobs (excluding MAD CRM ones)
    crontab -l 2>/dev/null | grep -v "# MAD CRM User Sync" > "$TEMP_CRON"
    
    # Add MAD CRM cron jobs
    cat >> "$TEMP_CRON" << EOF

# MAD CRM User Sync Jobs
# Full sync every day at 2:00 AM
0 2 * * * $PROJECT_DIR/cron/user-sync-wrapper.sh full

# Delta sync twice daily at 10:00 AM and 6:00 PM
0 10,18 * * * $PROJECT_DIR/cron/user-sync-wrapper.sh delta

# Log cleanup weekly on Sunday at 3:00 AM
0 3 * * 0 find $LOG_DIR -name "*.log" -type f -mtime +30 -delete

EOF

    # Install the cron jobs
    crontab "$TEMP_CRON"
    
    # Clean up
    rm "$TEMP_CRON"
    
    print_status "Cron jobs installed successfully"
}

# Function to display current cron jobs
show_cron_jobs() {
    print_status "Current cron jobs:"
    crontab -l | grep -A 10 -B 2 "MAD CRM"
}

# Function to remove cron jobs
remove_cron_jobs() {
    print_warning "Removing MAD CRM cron jobs..."
    
    TEMP_CRON="/tmp/mad_crm_cron_remove"
    crontab -l 2>/dev/null | grep -v "MAD CRM" | grep -v "user-sync-wrapper.sh" > "$TEMP_CRON"
    crontab "$TEMP_CRON"
    rm "$TEMP_CRON"
    
    print_status "MAD CRM cron jobs removed"
}

# Function to test sync manually
test_sync() {
    print_status "Testing user sync..."
    
    if [ ! -f "$PROJECT_DIR/cron/user-sync-wrapper.sh" ]; then
        print_error "Wrapper script not found. Run setup first."
        exit 1
    fi
    
    print_status "Running delta sync test..."
    "$PROJECT_DIR/cron/user-sync-wrapper.sh" delta
    
    if [ $? -eq 0 ]; then
        print_status "Test completed successfully"
    else
        print_error "Test failed"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 {setup|remove|test|status|help}"
    echo ""
    echo "Commands:"
    echo "  setup   - Set up cron jobs for user synchronization"
    echo "  remove  - Remove all MAD CRM cron jobs"
    echo "  test    - Test the sync manually"
    echo "  status  - Show current MAD CRM cron jobs"
    echo "  help    - Show this help message"
    echo ""
    echo "Cron Schedule:"
    echo "  - Full sync: Daily at 2:00 AM"
    echo "  - Delta sync: Twice daily at 10:00 AM and 6:00 PM"
    echo "  - Log cleanup: Weekly on Sunday at 3:00 AM"
}

# Main script logic
case "$1" in
    setup)
        validate_config
        create_wrapper_script
        setup_cron_jobs
        show_cron_jobs
        print_status "Setup completed successfully!"
        print_status "Logs will be stored in: $LOG_DIR"
        ;;
    remove)
        remove_cron_jobs
        ;;
    test)
        validate_config
        test_sync
        ;;
    status)
        show_cron_jobs
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Invalid command: $1"
        show_usage
        exit 1
        ;;
esac