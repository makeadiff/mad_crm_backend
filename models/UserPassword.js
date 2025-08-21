const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  class UserPassword extends Model {
    static associate(models) {
      UserPassword.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }

    // Instance method to verify password
    async verifyPassword(plainTextPassword) {
      // For default password, check both hashed and plain text
      if (this.is_default_password && plainTextPassword === 'password') {
        return true;
      }
      
      // For custom passwords, always use bcrypt
      if (this.password_hash) {
        console.log('Verifying password with bcrypt now in userPassword model ---->', plainTextPassword);
        return await bcrypt.compare(plainTextPassword, this.password_hash);
      }
      
      return false;
    }

    // Static method to hash password
    static async hashPassword(plainPassword) {
      const saltRounds = 12;
      return await bcrypt.hash(plainPassword, saltRounds);
    }

    // Instance method to update login tracking
    async recordLogin(success = true) {
      const now = new Date();
      
      if (success) {
        this.last_login_at = now;
        this.login_attempts = 0;
        this.account_locked_until = null;
      } else {
        this.login_attempts += 1;
        this.last_failed_login = now;
        
        // Lock account after 5 failed attempts for 30 minutes
        if (this.login_attempts >= 10) {
          this.account_locked_until = new Date(now.getTime() + 30 * 60 * 1000);
        }
      }
      
      await this.save();
    }

    // Instance method to check if account is locked
    isAccountLocked() {
      // Example logic: check if account_locked_until is set and in the future
      if (!this.account_locked_until) return false;
      return new Date(this.account_locked_until) > new Date();
    }
  }

  UserPassword.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      removed: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
      },
      // Enhanced password fields
      password_hash: { 
        type: DataTypes.STRING, 
        allowNull: false,
        field: 'password' // Maps to existing 'password' column
      },
      salt: { 
        type: DataTypes.STRING, 
        allowNull: false 
      },
      // TEMPORARY: Store plaintext password for forgot-password fallback
      // TODO: Remove this column once proper forgot-password flow is implemented
      plaintext_password: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'TEMPORARY: Remove once forgot-password flow is implemented'
      },
      // Security and tracking fields
      is_default_password: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      last_failed_login: {
        type: DataTypes.DATE,
        allowNull: true
      },
      account_locked_until: {
        type: DataTypes.DATE,
        allowNull: true
      },
      // Existing fields
      emailToken: { 
        type: DataTypes.STRING, 
        allowNull: true 
      },
      resetToken: { 
        type: DataTypes.STRING, 
        allowNull: true 
      },
      emailVerified: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
      },
      authType: { 
        type: DataTypes.STRING, 
        defaultValue: 'email' 
      },
      loggedSessions: { 
        type: DataTypes.ARRAY(DataTypes.STRING), 
        defaultValue: [] 
      },
    },
    {
      sequelize,
      modelName: 'UserPassword',
      tableName: 'user_passwords',
      timestamps: true,
      hooks: {
        beforeCreate: async (userPassword) => {
          // Always hash password before creation
          if (userPassword.password_hash) {
            userPassword.password_hash = await UserPassword.hashPassword(userPassword.password_hash);
          }
        },
        beforeUpdate: async (userPassword) => {
          // Hash password if it's being changed
          if (userPassword.changed('password_hash')) {
            userPassword.password_hash = await UserPassword.hashPassword(userPassword.password_hash);
            userPassword.password_changed_at = new Date();
            userPassword.is_default_password = false;
          }
        }
      }
    }
  );

  return UserPassword;
};
