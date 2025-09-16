# 🌐 Multi-Device Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get Free API Key
1. Go to [jsonbin.io](https://jsonbin.io)
2. Sign up for free account
3. Create a new bin
4. Copy your API key

### Step 2: Update the Code
Replace these values in `MultiDevicePairingGame.tsx`:

```typescript
const BIN_ID = 'your-bin-id-here' // From jsonbin.io
const API_KEY = 'your-api-key-here' // From jsonbin.io
```

### Step 3: Test
1. Deploy to Vercel/Netlify or use ngrok for local testing
2. Open on different devices
3. Test pairing!

## Alternative: Use ngrok for Local Testing

### Install ngrok
```bash
npm install -g ngrok
```

### Run your app
```bash
npm run dev
```

### In another terminal, run ngrok
```bash
ngrok http 3000
```

### Use the ngrok URL
- Copy the https URL from ngrok
- Open it on different devices
- Test the pairing game!

## How It Works

### Real Multi-Device Communication
- **JSONBin.io**: Free cloud storage for shared data
- **Polling**: Checks for updates every 2 seconds
- **Cross-device**: Works on phones, tablets, computers
- **Real-time**: Users see each other join and get paired

### Features
- ✅ **Multi-device support** - Works across different devices
- ✅ **Real-time updates** - See users join in real-time
- ✅ **Automatic pairing** - Pairs users when 2+ join
- ✅ **Connection status** - Shows if connected to server
- ✅ **Free hosting** - Uses free services

## Testing Steps

1. **Deploy your app** (Vercel/Netlify/ngrok)
2. **Device 1**: Open the URL, enter "Alice"
3. **Device 2**: Open the URL, enter "Bob"
4. **Both devices**: Should see each other and get paired
5. **Both devices**: Should see the same question and activity

## Troubleshooting

### Connection Issues
- Check your API key is correct
- Make sure BIN_ID is correct
- Verify internet connection

### Users Not Appearing
- Wait a few seconds (polling every 2 seconds)
- Check connection status indicator
- Try refreshing both devices

### Pairing Not Working
- Make sure both users are in "waiting" status
- Check debug info shows correct user counts
- Verify both devices are connected

## Production Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect to Vercel
3. Deploy automatically
4. Share the public URL

### Netlify
1. Push code to GitHub
2. Connect to Netlify
3. Deploy automatically
4. Share the public URL

## Cost
- **JSONBin.io**: Free tier (1000 requests/month)
- **Vercel/Netlify**: Free tier
- **Total cost**: $0 for small events!

## Next Steps for Larger Scale

For events with 100+ people, consider:
1. **WebSocket server** (Socket.io + Node.js)
2. **Database** (MongoDB, PostgreSQL)
3. **Dedicated hosting** (AWS, Google Cloud)
4. **Load balancing** for high traffic
