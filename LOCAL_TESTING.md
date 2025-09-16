# 🧪 Local Testing Guide

## Quick Start

### Step 1: Start the Servers
```bash
# Terminal 1: Start the backend server
cd server
npm start

# Terminal 2: Start the frontend
npm run dev
```

### Step 2: Test the Application
1. **Open browser** to `http://localhost:3000`
2. **Click "เริ่มต้น"** to enter the game
3. **Enter a nickname** (e.g., "Alice")
4. **Open another browser tab** to `http://localhost:3000`
5. **Enter another nickname** (e.g., "Bob")
6. **Watch them pair automatically!** 🎉

## What's Running

### Backend Server (Port 3000)
- **WebSocket server** with Socket.io
- **Real-time user management**
- **Automatic pairing logic**
- **API endpoints** for health checks

### Frontend (Port 3000)
- **Next.js development server**
- **Real-time WebSocket client**
- **Beautiful Thai UI**
- **Debug information**

## Testing Scenarios

### Scenario 1: Basic Pairing
1. **Tab 1**: Enter "Alice" → Should show "1 คนในห้องรอ"
2. **Tab 2**: Enter "Bob" → Should show "2 คนในห้องรอ" in BOTH tabs
3. **Both tabs**: Should automatically pair and show the same question/activity

### Scenario 2: Multiple Users
1. **3+ tabs**: Enter different nicknames
2. **System**: Should pair 2 users randomly
3. **Remaining users**: Continue waiting for more users

### Scenario 3: User Leaves
1. **User joins** and waits
2. **User closes tab** or clicks "ออกจากห้องรอ"
3. **Other users**: Should see updated count

## Debug Information

The app shows real-time debug info:
- **Connection status**: 🟢 Connected / 🟡 Connecting / 🔴 Disconnected
- **User counts**: Total users and waiting users
- **User list**: All users with their status
- **Server connection**: WebSocket connection status

## Troubleshooting

### Server Not Starting
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### WebSocket Connection Issues
- Check browser console for errors
- Verify server is running on port 3000
- Check firewall settings

### Users Not Pairing
- Check debug info shows correct user counts
- Verify both users are in "waiting" status
- Check server logs for errors

## Server Logs

### View Server Logs
```bash
# In the server terminal, you'll see:
# - User connections
# - User joins/leaves
# - Pairing events
# - Error messages
```

### Example Server Output
```
🚀 Server running on http://0.0.0.0:3000
User connected: abc123
User joined: Alice (abc123)
User connected: def456
User joined: Bob (def456)
Paired users: Alice & Bob
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Users List
```bash
curl http://localhost:3000/api/users
```

## Next Steps

Once local testing works:
1. **Deploy to VPS** using the deployment guide
2. **Update SERVER_URL** in VPSServerPairingGame.tsx
3. **Test with real devices** on your network
4. **Share with friends** for real testing!

## Performance

### Local Performance
- **Instant pairing** - No delays
- **Real-time updates** - Immediate synchronization
- **Low latency** - Local network communication
- **Stable connections** - No network issues

### Expected Behavior
- **2+ users join** → Automatic pairing within 1-2 seconds
- **Users leave** → Immediate count updates
- **Multiple pairs** → Each pair gets unique questions/activities
- **Cross-tab sync** → All tabs show same information
