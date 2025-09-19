#!/bin/bash

# VPS Deployment Script for Friends Vending Machine
# Run this script on your VPS

echo "🚀 Deploying Friends Vending Machine to VPS..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt install -y nginx
fi

# Create project directory
PROJECT_DIR="/var/www/friends-vending"
echo "📁 Creating project directory: $PROJECT_DIR"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# Copy project files
echo "📋 Copying project files..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd server && npm install && cd ..

# Build Next.js app
echo "🔨 Building Next.js app..."
npm run build

# Copy the built files to server directory for serving
echo "📋 Copying built files..."
cp -r out/* server/../out/ 2>/dev/null || mkdir -p server/../out && cp -r out/* server/../out/

# # Configure Nginx
# echo "⚙️ Configuring Nginx..."
# sudo tee /etc/nginx/sites-available/friends-vending > /dev/null <<EOF
# server {
#     listen 80;
#     server_name your-domain.com;  # Replace with your domain or IP
# 
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade \$http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#         proxy_cache_bypass \$http_upgrade;
#     }
# 
#     location /socket.io/ {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade \$http_upgrade;
#         proxy_set_header Connection "upgrade";
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#     }
# }
# EOF
# 
# # Enable the site
# sudo ln -sf /etc/nginx/sites-available/friends-vending /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx

# Start the application with PM2
echo "🚀 Starting application with PM2..."
cd server
pm2 start server.js --name "friends-vending" --cwd /var/www/friends-vending/server
pm2 save
pm2 startup

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: http://your-domain.com"
echo "📊 Check status with: pm2 status"
echo "📝 View logs with: pm2 logs friends-vending"
echo ""
echo "🔧 Next steps:"
echo "1. Update your domain/IP in the Nginx config"
echo "2. Update SERVER_URL in VPSServerPairingGame.tsx"
echo "3. Set up SSL certificate with Let's Encrypt (optional)"
