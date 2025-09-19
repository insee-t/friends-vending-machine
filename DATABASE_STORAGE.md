# Database Storage Implementation

## 📍 **Where User Data is Stored**

Your user email and password are now stored in a **SQLite database** file located at:
```
/home/ionize13/uni/friends-vending-machine/server/users.db
```

## 🗄️ **Database Structure**

### **Users Table**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- Unique user ID (UUID)
  email TEXT UNIQUE NOT NULL,    -- User's email address
  nickname TEXT NOT NULL,        -- User's display name
  password_hash TEXT NOT NULL,   -- Encrypted password (bcrypt)
  created_at DATETIME,           -- Account creation timestamp
  last_login DATETIME,           -- Last login timestamp
  is_active BOOLEAN DEFAULT 1    -- Account status
)
```

### **Game History Table**
```sql
CREATE TABLE game_history (
  id TEXT PRIMARY KEY,           -- Game session ID
  user_id TEXT NOT NULL,         -- User who played
  partner_id TEXT,               -- Partner's user ID
  partner_nickname TEXT,         -- Partner's display name
  question TEXT,                 -- Ice-breaking question
  activity TEXT,                 -- Activity assigned
  user_answer TEXT,              -- User's answer
  partner_answer TEXT,           -- Partner's answer
  created_at DATETIME            -- Game timestamp
)
```

## 🔒 **Security Features**

### **Password Protection**
- ✅ **Bcrypt Hashing**: Passwords are encrypted with bcrypt (salt rounds: 10)
- ✅ **No Plain Text**: Original passwords are never stored
- ✅ **JWT Tokens**: Secure authentication tokens (7-day expiration)

### **Data Privacy**
- ✅ **Unique IDs**: Each user has a unique UUID
- ✅ **Email Uniqueness**: One account per email address
- ✅ **Active Status**: Soft delete capability (is_active flag)

## 📊 **Current Status**

Based on the health check:
```json
{
  "status": "ok",
  "users": 0,                    // Active game sessions
  "pairs": 0,                    // Active game pairs
  "registeredUsers": 1,          // Total registered users
  "activeUsers7d": 1,            // Users active in last 7 days
  "activeUsers30d": 1,           // Users active in last 30 days
  "timestamp": "2025-09-19T09:42:25.754Z"
}
```

## 🚀 **Benefits of Database Storage**

### **✅ Persistence**
- User accounts survive server restarts
- Game history is preserved
- No data loss between sessions

### **✅ Scalability**
- Can handle multiple server instances
- Supports concurrent users
- Efficient querying and indexing

### **✅ Features**
- User profile management
- Game history tracking
- Statistics and analytics
- Account management

## 🔧 **Database Management**

### **File Location**
```bash
# Database file
/home/ionize13/uni/friends-vending-machine/server/users.db

# Backup the database
cp users.db users_backup_$(date +%Y%m%d).db
```

### **View Database Contents**
```bash
# Install SQLite CLI (if not already installed)
sudo apt install sqlite3

# Open database
sqlite3 users.db

# View users
SELECT id, email, nickname, created_at, last_login FROM users;

# View game history
SELECT * FROM game_history ORDER BY created_at DESC LIMIT 10;

# Exit
.quit
```

## 🛡️ **Security Best Practices**

### **Production Recommendations**
1. **Change JWT Secret**: Set `JWT_SECRET` environment variable
2. **Database Backup**: Regular automated backups
3. **HTTPS**: Use SSL/TLS in production
4. **Rate Limiting**: Implement API rate limiting
5. **Input Validation**: Enhanced validation for production

### **Environment Variables**
```bash
# Set in production
export JWT_SECRET="your-super-secure-secret-key"
export NODE_ENV="production"
```

## 📈 **Future Enhancements**

### **Planned Features**
- [ ] User profile pictures
- [ ] Friend connections
- [ ] Game statistics dashboard
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Admin panel
- [ ] Data export/import

### **Database Migrations**
- [ ] User preferences table
- [ ] Friend relationships table
- [ ] Game ratings table
- [ ] Notification settings table

## 🎯 **Test Account**

A test account has been created:
- **Email**: `test@example.com`
- **Password**: `123456`
- **Nickname**: `TestUser`

You can use this account to test the authentication system!

---

**Note**: The database file (`users.db`) contains all user data and should be backed up regularly. In production, consider using PostgreSQL or MySQL for better performance and reliability.
