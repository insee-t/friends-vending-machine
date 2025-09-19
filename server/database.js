const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, 'users.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          nickname TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          social_media_handle TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          is_active BOOLEAN DEFAULT 1
        )
      `;

      const createGameHistoryTable = `
        CREATE TABLE IF NOT EXISTS game_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          partner_id TEXT,
          partner_nickname TEXT,
          question TEXT,
          activity TEXT,
          user_answer TEXT,
          partner_answer TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `;

      this.db.serialize(() => {
        this.db.run(createUsersTable, (err) => {
          if (err) {
            console.error('Error creating users table:', err);
            reject(err);
          } else {
            console.log('✅ Users table created/verified');
          }
        });

        this.db.run(createGameHistoryTable, (err) => {
          if (err) {
            console.error('Error creating game_history table:', err);
            reject(err);
          } else {
            console.log('✅ Game history table created/verified');
            resolve();
          }
        });
      });
    });
  }

  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const { id, email, nickname, password, socialMediaHandle } = userData;
      const hashedPassword = bcrypt.hashSync(password, 10);

      const sql = `
        INSERT INTO users (id, email, nickname, password_hash, social_media_handle)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [id, email, nickname, hashedPassword, socialMediaHandle || null], function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            reject(new Error('User already exists'));
          } else {
            reject(err);
          }
        } else {
          resolve({
            id,
            email,
            nickname,
            socialMediaHandle: socialMediaHandle || null,
            createdAt: new Date().toISOString()
          });
        }
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ? AND is_active = 1';
      
      this.db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async verifyPassword(email, password) {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await this.getUserByEmail(email);
        if (!user) {
          resolve(null);
          return;
        }

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (isValid) {
          await this.updateLastLogin(user.id);
          resolve({
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            socialMediaHandle: user.social_media_handle,
            createdAt: user.created_at
          });
        } else {
          resolve(null);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(sql, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async updateSocialMediaHandle(userId, socialMediaHandle) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET social_media_handle = ? WHERE id = ?';
      
      this.db.run(sql, [socialMediaHandle, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN last_login > datetime('now', '-7 days') THEN 1 END) as active_users_7d,
          COUNT(CASE WHEN last_login > datetime('now', '-30 days') THEN 1 END) as active_users_30d
        FROM users 
        WHERE is_active = 1
      `;

      this.db.get(sql, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('✅ Database connection closed');
        }
      });
    }
  }
}

module.exports = Database;
