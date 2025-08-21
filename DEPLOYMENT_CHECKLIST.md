# 🚀 MAD CRM Authentication System Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Database Migration Preparation
- [ ] **CRITICAL**: Run on staging/dev first, NOT production
- [ ] **CRITICAL**: Create database backup before migration
- [ ] Verify migrations work on dev environment
- [ ] Test rollback procedure

```bash
# Backup database (PostgreSQL)
pg_dump -h localhost -U username -d mad_crm_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations (STAGING FIRST!)
cd mad_crm_backend
npx sequelize-cli db:migrate

# If issues, rollback
npx sequelize-cli db:migrate:undo
```

### 2. Environment Configuration
- [ ] Set up `.env` file with required variables:

```bash
# Copy and configure
cp src/config/environment.example.js .env

# Required variables:
HASURA_REST_API_ENDPOINT=https://your-hasura-instance.com/api/rest
HASURA_JWT_TOKEN=your_jwt_token_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mad_crm_db
DB_USERNAME=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key
DEFAULT_PASSWORD=password
BCRYPT_SALT_ROUNDS=12
NODE_ENV=production
```

### 3. Dependencies Installation
- [ ] Install new dependencies:

```bash
cd mad_crm_backend
npm install bcryptjs
# Other dependencies should already be installed
```

### 4. File Structure Verification
- [ ] Verify all new files exist:
  - ✅ `src/services/hasuraApiService.js`
  - ✅ `src/scripts/userSyncService.js` 
  - ✅ `src/scripts/runUserSync.js`
  - ✅ `src/utils/logger.js`
  - ✅ `src/utils/passwordUtils.js`
  - ✅ `src/utils/roleUtils.js`
  - ✅ Updated `src/controllers/.../login.js`
  - ✅ Updated `src/controllers/.../updateProfilePassword.js`
  - ✅ Updated models: `models/User.js`, `models/UserPassword.js`

### 5. Permission Setup
- [ ] Create log directory and set permissions:

```bash
mkdir -p logs/cron
chmod 755 logs
chmod 755 logs/cron
```

### 6. Cron Job Setup (Choose one)

**Linux/Unix:**
```bash
# Update paths in setup script first
chmod +x cron/setup-cron.sh
./cron/setup-cron.sh setup
```

**Windows:**
```bat
# Update paths in batch file first  
cron\setup-windows-task.bat setup
```

### 7. Testing
- [ ] Run authentication flow tests:

```bash
cd mad_crm_backend
node src/tests/authFlow.test.js
```

- [ ] Test user sync manually:

```bash
# Test sync (dry run first)
node src/scripts/runUserSync.js --type=delta --dry-run

# Real sync (small batch first)
node src/scripts/runUserSync.js --type=delta --batch-size=10
```

---

## 🔄 Deployment Steps

### Step 1: Deploy Code
1. Commit all changes to version control
2. Deploy to staging environment
3. Run migrations on staging
4. Test authentication flows on staging

### Step 2: Production Migration
1. **BACKUP DATABASE FIRST** ⚠️
2. Put application in maintenance mode
3. Run database migrations
4. Deploy new code
5. Test critical flows
6. Remove maintenance mode

### Step 3: Configure Automation
1. Set up cron jobs for user sync
2. Configure log rotation
3. Set up monitoring/alerting

### Step 4: User Communication
1. Notify users about new authentication requirements
2. Provide instructions for first-time password change
3. Share support contact for assistance

---

## 🧪 Post-Deployment Testing

### Critical Test Cases
- [ ] **First-time user login** (use "password")
- [ ] **Existing user login** (with their current password)  
- [ ] **Password change flow** (from default to strong password)
- [ ] **Role-based access** (different user roles)
- [ ] **Account locking** (after failed attempts)
- [ ] **User sync** (from Hasura API)

### Test Users (Create in staging)
```sql
-- Test user 1: First-time login
INSERT INTO users (email, user_role, enabled, first_name, last_name) 
VALUES ('test1@example.com', 'Wingman', true, 'Test', 'User1');

-- Test user 2: Existing user (simulate)
INSERT INTO users (email, user_role, enabled, first_name, last_name) 
VALUES ('test2@example.com', 'Project Lead', true, 'Test', 'User2');
```

---

## 📊 Monitoring & Maintenance

### Log Monitoring
- Monitor `logs/auth-*.log` for authentication issues
- Monitor `logs/sync-*.log` for sync problems
- Monitor `logs/security-*.log` for security events

### Key Metrics to Track
- Login success/failure rates
- Password change frequency
- User sync success rates
- Account lockouts
- API response times

### Regular Maintenance Tasks
- Weekly log review
- Monthly user sync audit
- Quarterly security review
- Update JWT tokens as needed

---

## 🆘 Rollback Procedure (If Issues Occur)

### Emergency Rollback Steps:
1. **Immediately**: Revert to previous application version
2. **Database**: Restore from pre-migration backup if needed
3. **Disable**: Stop cron jobs temporarily
4. **Investigate**: Check logs for root cause
5. **Fix**: Address issues in staging environment
6. **Redeploy**: Once fixed and tested

### Rollback Commands:
```bash
# Stop cron jobs
./cron/setup-cron.sh remove

# Rollback database (if needed)
psql -h localhost -U username -d mad_crm_db < backup_YYYYMMDD_HHMMSS.sql

# Rollback migrations (if possible)
npx sequelize-cli db:migrate:undo
```

---

## 📋 Success Criteria

✅ **Deployment is successful when:**
- [ ] All existing users can log in
- [ ] New users can complete first-time setup
- [ ] Password changes work correctly
- [ ] User sync runs without errors
- [ ] No security vulnerabilities introduced
- [ ] Performance remains acceptable
- [ ] Error rates stay within normal limits

---

## 📞 Support Information

**For deployment issues:**
- Check logs in `logs/` directory
- Review environment variables
- Verify database connections
- Test API connectivity to Hasura

**Common Issues & Solutions:**
- **Login fails**: Check user role in database
- **Sync fails**: Verify Hasura API credentials
- **Password change fails**: Check UserPassword table exists
- **Logs empty**: Verify log directory permissions

---

**⚠️ REMEMBER**: Always test in staging first, backup production data, and have a rollback plan ready!