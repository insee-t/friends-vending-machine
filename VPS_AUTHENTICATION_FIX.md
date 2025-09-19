# 🔐 VPS Authentication Fix Guide

## Problem: Authentication Works in Development but Not on VPS

The issue is that the server is not starting properly on the VPS due to directory and dependency issues.

## 🚀 Quick Fix

### Step 1: Fix Server Directory Issue

The error shows the server is trying to run from the wrong directory. Here's the fix:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to the project directory
cd /var/www/friends-vending

# Stop any running processes
pm2 stop friends-vending
pm2 delete friends-vending

# Make sure we're in the right directory
pwd  # Should show /var/www/friends-vending

# Check if server directory exists
ls -la server/

# Install dependencies in server directory
cd server
npm install
cd ..

# Start the server properly
cd server
pm2 start server.js --name "friends-vending"
pm2 save
```

### Step 2: Verify Database Setup

```bash
# Check if database file exists
ls -la server/users.db

# If it doesn't exist, the server will create it automatically
# Check server logs
pm2 logs friends-vending
```

### Step 3: Test Authentication

```bash
# Test the health endpoint
curl http://localhost:3000/api/health

# Test user registration
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","nickname":"TestUser"}'

# Test user login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

## 🔧 Complete VPS Setup

### 1. Upload Code to VPS

```bash
# From your local machine
scp -r /home/ionize13/uni/friends-vending root@your-vps-ip:/var/www/
```

### 2. Install Dependencies

```bash
# SSH into VPS
ssh root@your-vps-ip

# Navigate to project
cd /var/www/friends-vending

# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Build the frontend
npm run build
```

### 3. Configure Environment

```bash
# Set production environment
export APP_ENV=production

# Set JWT secret (important for security)
export JWT_SECRET="your-super-secure-secret-key-change-this"

# Make it permanent
echo 'export APP_ENV=production' >> ~/.bashrc
echo 'export JWT_SECRET="your-super-secure-secret-key-change-this"' >> ~/.bashrc
```

### 4. Start Services

```bash
# Start the server with PM2
cd server
pm2 start server.js --name "friends-vending" --env production
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs friends-vending
```

### 5. Configure Nginx

```bash
# Create Nginx config
sudo tee /etc/nginx/sites-available/friends-vending > /dev/null <<EOF
server {
    listen 80;
    server_name your-vps-ip;  # Replace with your VPS IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/friends-vending /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 🧪 Testing Authentication on VPS

### 1. Test Registration

```bash
curl -X POST http://your-vps-ip/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","nickname":"TestUser"}'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "nickname": "TestUser",
    "createdAt": "2025-09-19T..."
  }
}
```

### 2. Test Login

```bash
curl -X POST http://your-vps-ip/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

### 3. Test Frontend

1. Open browser to `http://your-vps-ip`
2. Click "เข้าสู่ระบบ" (Login)
3. Try to create an account
4. Try to login with existing account

## 🔍 Troubleshooting

### If Authentication Still Doesn't Work:

#### 1. Check Server Logs
```bash
pm2 logs friends-vending
```

#### 2. Check Database
```bash
# Check if database file exists
ls -la server/users.db

# Check database contents (if sqlite3 is installed)
sqlite3 server/users.db "SELECT * FROM users;"
```

#### 3. Check Network
```bash
# Test if server is responding
curl http://localhost:3000/api/health

# Test from outside
curl http://your-vps-ip/api/health
```

#### 4. Check Dependencies
```bash
# Reinstall dependencies
cd server
rm -rf node_modules package-lock.json
npm install
```

#### 5. Check File Permissions
```bash
# Fix permissions
sudo chown -R $USER:$USER /var/www/friends-vending
chmod -R 755 /var/www/friends-vending
```

### Common Issues:

1. **"Cannot find module"** - Dependencies not installed in server directory
2. **"Database locked"** - Multiple server instances running
3. **"Permission denied"** - File permission issues
4. **"Port already in use"** - Another process using port 3000

## 🎯 Expected Results

After following this guide:

✅ **User Registration**: Users can create accounts on VPS
✅ **User Login**: Users can login with their credentials  
✅ **Database Storage**: User data persists in SQLite database
✅ **Cross-Device**: Authentication works from any device
✅ **Security**: Passwords are properly hashed and stored

## 📊 Monitoring

```bash
# Check server status
pm2 status

# Check database stats
curl http://your-vps-ip/api/health

# View real-time logs
pm2 logs friends-vending --lines 50
```

The authentication should now work perfectly on your VPS! 🎉
