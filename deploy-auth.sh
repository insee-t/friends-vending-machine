#!/bin/bash

# VPS Authentication Deployment Script
# This script fixes the authentication issues on VPS

echo "🔐 Deploying Authentication System to VPS..."

# Check if we're on the VPS
if [ ! -d "/var/www/friends-vending" ]; then
    echo "❌ This script should be run on the VPS, not locally"
    echo "Please upload your code to VPS first, then run this script"
    exit 1
fi

# Navigate to project directory
cd /var/www/friends-vending

echo "📁 Current directory: $(pwd)"

# Stop existing processes
echo "🛑 Stopping existing processes..."
pm2 stop friends-vending 2>/dev/null || true
pm2 delete friends-vending 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."

# Frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Server dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Set environment variables
echo "⚙️ Setting environment variables..."
export NODE_ENV=production
export JWT_SECRET="your-super-secure-secret-key-$(date +%s)"

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p server/uploads

# Fix permissions
echo "🔧 Fixing permissions..."
chmod -R 755 .
chmod -R 777 server/uploads

# Start server
echo "🚀 Starting server..."
cd server
pm2 start server.js --name "friends-vending" --env production
pm2 save

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Test server
echo "🧪 Testing server..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Server is running!"
else
    echo "❌ Server failed to start. Check logs:"
    pm2 logs friends-vending --lines 20
    exit 1
fi

# Test authentication
echo "🔐 Testing authentication..."

# Test registration
echo "Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","nickname":"TestUser"}')

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
    echo "✅ User registration works!"
else
    echo "❌ User registration failed:"
    echo "$REGISTER_RESPONSE"
fi

# Test login
echo "Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}')

if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
    echo "✅ User login works!"
else
    echo "❌ User login failed:"
    echo "$LOGIN_RESPONSE"
fi

# Check database
echo "💾 Checking database..."
if [ -f "server/users.db" ]; then
    echo "✅ Database file exists"
    echo "Database size: $(du -h server/users.db | cut -f1)"
else
    echo "❌ Database file not found"
fi

# Show status
echo ""
echo "📊 Deployment Status:"
echo "===================="
pm2 status
echo ""
echo "🌐 Your app should be available at: http://your-vps-ip"
echo "📊 Health check: http://your-vps-ip/api/health"
echo ""
echo "🔧 Useful commands:"
echo "  pm2 status                    - Check server status"
echo "  pm2 logs friends-vending      - View server logs"
echo "  pm2 restart friends-vending   - Restart server"
echo ""
echo "✅ Authentication deployment complete!"
