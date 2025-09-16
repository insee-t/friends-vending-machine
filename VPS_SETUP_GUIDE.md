# 🖥️ VPS Setup Guide

## Quick Setup (10 minutes)

### Step 1: Prepare Your VPS
1. **Get your VPS IP address** (e.g., 192.168.1.100)
2. **SSH into your VPS**:
   ```bash
   ssh root@your-vps-ip
   ```

### Step 2: Upload Your Code
```bash
# On your local machine
scp -r /path/to/friends-vending root@your-vps-ip:/var/www/
```

### Step 3: Run Deployment Script
```bash
# On your VPS
cd /var/www/friends-vending
chmod +x deploy.sh
./deploy.sh
```

### Step 4: Update Configuration
1. **Update Nginx config**:
   ```bash
   sudo nano /etc/nginx/sites-available/friends-vending
   ```
   Replace `your-domain.com` with your VPS IP or domain

2. **Update frontend code**:
   ```bash
   nano app/components/VPSServerPairingGame.tsx
   ```
   Replace `https://your-vps-domain.com` with your VPS IP/domain

3. **Restart services**:
   ```bash
   sudo systemctl reload nginx
   pm2 restart friends-vending
   ```

## Manual Setup (Alternative)

### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### Setup Project
```bash
# Create project directory
sudo mkdir -p /var/www/friends-vending
sudo chown -R $USER:$USER /var/www/friends-vending
cd /var/www/friends-vending

# Copy your project files here
# Install dependencies
npm install
cd server && npm install && cd ..

# Build Next.js app
npm run build
```

### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/friends-vending
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-vps-ip;  # Replace with your VPS IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable Site and Start Services
```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/friends-vending /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Start the application
cd server
pm2 start server.js --name "friends-vending"
pm2 save
pm2 startup

# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

## Testing

### Check if everything is running
```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check if app is accessible
curl http://localhost:3000/api/health
```

### Test from different devices
1. **Open browser** on your phone/tablet
2. **Go to** `http://your-vps-ip`
3. **Enter nickname** and test pairing

## SSL Setup (Optional)

### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Get SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

## Monitoring

### View Logs
```bash
# Application logs
pm2 logs friends-vending

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart application
pm2 restart friends-vending

# Restart Nginx
sudo systemctl restart nginx
```

## Troubleshooting

### Common Issues

1. **Port 3000 not accessible**
   ```bash
   sudo ufw allow 3000
   ```

2. **Nginx configuration error**
   ```bash
   sudo nginx -t
   ```

3. **PM2 not starting**
   ```bash
   pm2 logs friends-vending
   ```

4. **Socket.io connection issues**
   - Check firewall settings
   - Verify Nginx proxy configuration
   - Check browser console for errors

### Performance Monitoring
```bash
# Check system resources
htop

# Check PM2 monitoring
pm2 monit

# Check Nginx status
sudo systemctl status nginx
```

## Security

### Basic Security
```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Disable root login (optional)
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh
```

## Backup

### Backup Script
```bash
#!/bin/bash
# Create backup
tar -czf friends-vending-backup-$(date +%Y%m%d).tar.gz /var/www/friends-vending
```

## Cost
- **VPS**: $5-20/month depending on provider
- **Domain**: $10-15/year (optional)
- **SSL**: Free with Let's Encrypt
- **Total**: Very affordable for a real-time multiplayer game!
