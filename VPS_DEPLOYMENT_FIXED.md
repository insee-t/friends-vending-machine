# 🚀 VPS Deployment Guide (Fixed)

## Quick Fix for Origin Header Error

The "Missing 'origin' header" error has been fixed! Here's how to deploy:

### Step 1: Update Your Code
Make sure you have the latest code with these fixes:
- ✅ Updated `next.config.js` (disabled Server Actions)
- ✅ Updated `server/server.js` (proper headers)
- ✅ Updated deployment script

### Step 2: Deploy to VPS
```bash
# Upload your code to VPS
scp -r /home/ionize13/uni/friends-vending root@your-vps-ip:/var/www/

# SSH into VPS
ssh root@your-vps-ip

# Run deployment
cd /var/www/friends-vending
chmod +x deploy.sh
./deploy.sh
```

### Step 3: Update Configuration
1. **Update your VPS IP** in the frontend:
   ```bash
   nano app/components/VPSServerPairingGame.tsx
   ```
   Change:
   ```typescript
   const SERVER_URL = 'http://your-vps-ip'  // Replace with your VPS IP
   ```

2. **Update Nginx config**:
   ```bash
   sudo nano /etc/nginx/sites-available/friends-vending
   ```
   Replace `your-domain.com` with your VPS IP

3. **Restart services**:
   ```bash
   sudo systemctl reload nginx
   pm2 restart friends-vending
   ```

## What Was Fixed

### 1. Next.js Configuration
- **Disabled Server Actions** - Prevents origin header issues
- **Added proper headers** - Security and compatibility
- **Standalone output** - Better for VPS deployment

### 2. Server Configuration
- **Proper CORS setup** - Allows all origins
- **Forwarded headers** - Next.js compatibility
- **Static file serving** - Serves built Next.js app

### 3. Deployment Process
- **Proper build process** - Copies files correctly
- **Nginx configuration** - Handles WebSocket and static files
- **PM2 process management** - Keeps server running

## Testing

### Check if everything is working:
```bash
# Check server status
pm2 status

# Check health endpoint
curl http://your-vps-ip/api/health

# Check if app loads
curl http://your-vps-ip
```

### Test the game:
1. **Open browser** to `http://your-vps-ip`
2. **Enter nickname** and test pairing
3. **Open on different device** and test cross-device pairing

## Troubleshooting

### If you still get origin errors:
```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check PM2 logs
pm2 logs friends-vending

# Restart everything
pm2 restart friends-vending
sudo systemctl restart nginx
```

### If WebSocket doesn't work:
- Check firewall: `sudo ufw status`
- Check Nginx config has WebSocket proxy
- Verify port 3000 is accessible

## Performance

### Expected Performance:
- **Instant pairing** - Real-time WebSocket communication
- **Cross-device sync** - Works on any device
- **Scalable** - Can handle many concurrent users
- **Reliable** - No external dependencies

## Security

### Basic Security Setup:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Set up SSL (optional)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring

### Check Status:
```bash
# Server status
pm2 status

# System resources
htop

# Nginx status
sudo systemctl status nginx

# Application logs
pm2 logs friends-vending
```

## Cost
- **VPS**: $5-20/month
- **Domain**: $10-15/year (optional)
- **SSL**: Free with Let's Encrypt
- **Total**: Very affordable!

The origin header error should now be completely resolved! 🎉
