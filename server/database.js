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

      const createFriendsTable = `
        CREATE TABLE IF NOT EXISTS friends (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          friend_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (friend_id) REFERENCES users (id),
          UNIQUE(user_id, friend_id)
        )
      `;

      this.db.serialize(() => {
        this.db.run(createUsersTable, (err) => {
          if (err) {
            console.error('Error creating users table:', err);
            reject(err);
          } else {
            console.log('✅ Users table created/verified');
            // Add social_media_handle column if it doesn't exist
            this.db.run(`ALTER TABLE users ADD COLUMN social_media_handle TEXT`, (alterErr) => {
              if (alterErr && !alterErr.message.includes('duplicate column name')) {
                console.error('Error adding social_media_handle column:', alterErr);
              } else if (!alterErr) {
                console.log('✅ Added social_media_handle column to users table');
              }
            });
          }
        });

        this.db.run(createGameHistoryTable, (err) => {
          if (err) {
            console.error('Error creating game_history table:', err);
            reject(err);
          } else {
            console.log('✅ Game history table created/verified');
          }
        });

        this.db.run(createFriendsTable, (err) => {
          if (err) {
            console.error('Error creating friends table:', err);
            reject(err);
          } else {
            console.log('✅ Friends table created/verified');
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
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT') {
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

  async getUserGameHistory(userId, limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM game_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [userId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async sendFriendRequest(userId, friendId) {
    return new Promise((resolve, reject) => {
      const { v4: uuidv4 } = require('uuid');
      const requestId = uuidv4();
      
      const sql = `
        INSERT INTO friends (id, user_id, friend_id, status)
        VALUES (?, ?, ?, 'pending')
      `;
      
      this.db.run(sql, [requestId, userId, friendId], function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            reject(new Error('Friend request already exists'));
          } else {
            reject(err);
          }
        } else {
          resolve({ id: requestId, status: 'pending' });
        }
      });
    });
  }

  async acceptFriendRequest(userId, friendId) {
    return new Promise((resolve, reject) => {
      const { v4: uuidv4 } = require('uuid');
      const requestId = uuidv4();
      
      // First, update the existing request to accepted
      const updateSql = `
        UPDATE friends 
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND friend_id = ? AND status = 'pending'
      `;
      
      const db = this.db;
      this.db.run(updateSql, [friendId, userId], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('No pending friend request found'));
        } else {
          // Check if reciprocal friendship already exists
          const checkSql = `
            SELECT id FROM friends 
            WHERE user_id = ? AND friend_id = ? AND status = 'accepted'
          `;
          
          db.get(checkSql, [userId, friendId], function(checkErr, row) {
            if (checkErr) {
              reject(checkErr);
            } else if (row) {
              // Reciprocal friendship already exists, just resolve
              resolve({ id: row.id, status: 'accepted' });
            } else {
              // Create the reciprocal friendship
              const insertSql = `
                INSERT INTO friends (id, user_id, friend_id, status)
                VALUES (?, ?, ?, 'accepted')
              `;
              
              db.run(insertSql, [requestId, userId, friendId], function(insertErr) {
                if (insertErr) {
                  reject(insertErr);
                } else {
                  resolve({ id: requestId, status: 'accepted' });
                }
              });
            }
          });
        }
      });
    });
  }

  async rejectFriendRequest(userId, friendId) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM friends 
        WHERE user_id = ? AND friend_id = ? AND status = 'pending'
      `;
      
      this.db.run(sql, [friendId, userId], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('No pending friend request found'));
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  async removeFriend(userId, friendId) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM friends 
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `;
      
      this.db.run(sql, [userId, friendId, friendId, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true, changes: this.changes });
        }
      });
    });
  }

  async getFriends(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT u.id, u.nickname, u.social_media_handle, f.created_at, f.status
        FROM friends f
        JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = ? AND f.status = 'accepted'
        ORDER BY f.created_at DESC
      `;
      
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getFriendRequests(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT u.id, u.nickname, u.social_media_handle, f.created_at
        FROM friends f
        JOIN users u ON f.user_id = u.id
        WHERE f.friend_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
      `;
      
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getSentFriendRequests(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT u.id, u.nickname, u.social_media_handle, f.created_at, f.status
        FROM friends f
        JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
      `;
      
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async areFriends(userId, friendId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT status FROM friends 
        WHERE user_id = ? AND friend_id = ? AND status = 'accepted'
      `;
      
      this.db.get(sql, [userId, friendId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  async hasPendingRequest(userId, friendId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT status FROM friends 
        WHERE user_id = ? AND friend_id = ? AND status = 'pending'
      `;
      
      this.db.get(sql, [userId, friendId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
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
