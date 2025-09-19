#!/bin/bash

# Environment Setup Script
# This script sets up the environment variables for the Friends Vending Machine

echo "🔧 Setting up environment variables..."

# Set the new environment variable
export APP_ENV=production
export JWT_SECRET="friends-vending-secret-$(date +%s)"

# Make it permanent
echo 'export APP_ENV=production' >> ~/.bashrc
echo 'export JWT_SECRET="friends-vending-secret-$(date +%s)"' >> ~/.bashrc

echo "✅ Environment variables set:"
echo "   APP_ENV=$APP_ENV"
echo "   JWT_SECRET=$JWT_SECRET"
echo ""
echo "🔄 To apply changes, run:"
echo "   source ~/.bashrc"
echo ""
echo "🚀 To start the server with new environment:"
echo "   cd /var/www/friends-vending/server"
echo "   pm2 restart friends-vending"


