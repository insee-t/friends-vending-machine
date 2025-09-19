const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}));
app.use(express.json());

// Add headers for Next.js compatibility
app.use((req, res, next) => {
  // Set proper headers for Next.js
  res.setHeader('X-Forwarded-Proto', req.headers['x-forwarded-proto'] || 'http');
  res.setHeader('X-Forwarded-For', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
  res.setHeader('X-Forwarded-Host', req.headers['x-forwarded-host'] || req.headers.host);
  next();
});

app.use(express.static(path.join(__dirname, '../out'))); // Serve Next.js build

// In-memory storage (for production, use Redis or database)
let users = new Map();
let pairs = new Map();

// Ice-breaking questions and activities
const iceBreakingQuestions = [
  "ถ้าคุณเป็นสัตว์ คุณจะเป็นอะไรและทำไม? 🐾",
  "อาหารโปรดของคุณคืออะไร? 🍕",
  "ถ้าคุณมีพลังพิเศษ คุณอยากได้พลังอะไร? ⚡",
  "สถานที่ที่คุณอยากไปมากที่สุดคือที่ไหน? ✈️",
  "เพลงที่คุณชอบฟังตอนนี้คือเพลงอะไร? 🎵",
  "ถ้าคุณเป็นซูเปอร์ฮีโร่ คุณจะชื่ออะไร? 🦸‍♂️",
  "งานอดิเรกที่คุณชอบทำคืออะไร? 🎨",
  "ถ้าคุณสามารถพูดภาษาใหม่ได้ คุณอยากพูดภาษาอะไร? 🗣️",
  "หนังหรือซีรี่ย์ที่คุณชอบมากที่สุดคือเรื่องอะไร? 🎬",
  "ถ้าคุณมีเวลา 1 วันที่จะทำอะไรก็ได้ คุณจะทำอะไร? ⏰"
];

const iceBreakingActivities = [
  "🎤 ร้องเพลงด้วยกัน 1 เพลง",
  "🎭 เล่นเกม charades (ทายคำ)",
  "📸 ถ่ายรูป selfie ด้วยกัน",
  "💃 แสดงท่าเต้นที่คุณชอบ",
  "🎨 วาดรูปของกันและกัน",
  "🤝 ทำ handshake แบบพิเศษ",
  "😄 เล่าเรื่องตลกให้กันฟัง",
  "🎪 เล่นเกม rock-paper-scissors",
  "🌟 แสดงความสามารถพิเศษของคุณ",
  "🎵 ฮัมเพลงให้อีกคนทาย"
];

// Clean up old users every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  for (const [userId, user] of users.entries()) {
    if (user.joinedAt < fiveMinutesAgo) {
      users.delete(userId);
      console.log(`Cleaned up old user: ${user.nickname}`);
    }
  }
}, 5 * 60 * 1000);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins the waiting room
  socket.on('join-waiting', (data) => {
    const { nickname } = data;
    const user = {
      id: socket.id,
      nickname: nickname.trim(),
      joinedAt: Date.now(),
      status: 'waiting',
      socketId: socket.id
    };

    users.set(socket.id, user);
    
    // Send updated user list to all clients
    const userList = Array.from(users.values());
    io.emit('users-updated', { users: userList });
    
    console.log(`User joined: ${nickname} (${socket.id})`);
    
    // Check for pairing
    checkForPairing();
  });

  // User leaves
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`User left: ${user.nickname} (${socket.id})`);
      users.delete(socket.id);
      
      // Send updated user list to all clients
      const userList = Array.from(users.values());
      io.emit('users-updated', { users: userList });
    }
  });

  // User manually leaves
  socket.on('leave-waiting', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`User left manually: ${user.nickname} (${socket.id})`);
      users.delete(socket.id);
      
      // Send updated user list to all clients
      const userList = Array.from(users.values());
      io.emit('users-updated', { users: userList });
    }
  });

  // Start new game
  socket.on('start-new-game', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`User starting new game: ${user.nickname} (${socket.id})`);
      users.delete(socket.id);
      
      // Send updated user list to all clients
      const userList = Array.from(users.values());
      io.emit('users-updated', { users: userList });
    }
  });

  // Handle answer submission
  socket.on('submit-answer', (data) => {
    const { pairId, userId, answer } = data;
    const pair = pairs.get(pairId);
    
    if (pair) {
      console.log(`Answer submitted by ${userId} for pair ${pairId}: ${answer}`);
      
      // Find the partner's socket ID
      const partnerId = pair.user1.id === userId ? pair.user2.id : pair.user1.id;
      const partnerSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.id === partnerId);
      
      if (partnerSocket) {
        // Send the answer to the partner
        partnerSocket.emit('receive-answer', {
          userId: userId,
          answer: answer
        });
        console.log(`Answer sent to partner ${partnerId}`);
      } else {
        console.log(`Partner ${partnerId} not found`);
      }
    } else {
      console.log(`Pair ${pairId} not found`);
    }
  });
});

// Function to check for pairing
function checkForPairing() {
  const waitingUsers = Array.from(users.values()).filter(user => user.status === 'waiting');
  
  if (waitingUsers.length >= 2) {
    // Create a pair
    const shuffled = waitingUsers.sort(() => Math.random() - 0.5);
    const user1 = shuffled[0];
    const user2 = shuffled[1];
    
    const randomQuestion = iceBreakingQuestions[Math.floor(Math.random() * iceBreakingQuestions.length)];
    const randomActivity = iceBreakingActivities[Math.floor(Math.random() * iceBreakingActivities.length)];
    
    const pair = {
      id: uuidv4(),
      user1,
      user2,
      question: randomQuestion,
      activity: randomActivity,
      createdAt: Date.now()
    };
    
    // Update user statuses
    user1.status = 'paired';
    user2.status = 'paired';
    users.set(user1.id, user1);
    users.set(user2.id, user2);
    
    // Store the pair
    pairs.set(pair.id, pair);
    
    // Send pair to both users
    io.to(user1.socketId).emit('user-paired', { pair });
    io.to(user2.socketId).emit('user-paired', { pair });
    
    // Send updated user list to all clients
    const userList = Array.from(users.values());
    io.emit('users-updated', { users: userList });
    
    console.log(`Paired users: ${user1.nickname} & ${user2.nickname}`);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    users: users.size,
    pairs: pairs.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values());
  res.json({ users: userList });
});

// Serve the Next.js app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../out/index.html'));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`👥 Users API: http://${HOST}:${PORT}/api/users`);
});
