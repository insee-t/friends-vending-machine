const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('./database');
const multer = require('multer');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize database
const db = new Database();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin);
    console.log('APP_ENV:', process.env.APP_ENV);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin, allowing request');
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('Localhost origin, allowing request');
      return callback(null, true);
    }
    
    // Allow your production 1domains
    const allowedOrigins = [
      'https://api.ionize13.com',
      'https://ionize13.com',
      'https://www.ionize13.com',
      'https://friends-vending-machine.vercel.app',
      'https://friends-vending-machine.netlify.app'
    ];
    
    if (allowedOrigins.includes(origin)) {
      console.log('Allowed origin:', origin);
      return callback(null, true);
    }
    
    // For production, be more restrictive
    if (process.env.APP_ENV === 'production') {
      console.log('CORS blocked origin in production:', origin);
      // Temporarily allow all origins for debugging
      console.log('Temporarily allowing origin for debugging:', origin);
      return callback(null, true);
    }
    
    // Allow all origins for development
    console.log('Development mode, allowing origin:', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));
app.use(express.json());

// Wildcard OPTIONS handler moved to end of file to avoid conflicts

// Add headers for Next.js compatibility
app.use((req, res, next) => {
  // Set proper headers for Next.js
  res.setHeader('X-Forwarded-Proto', req.headers['x-forwarded-proto'] || 'http');
  res.setHeader('X-Forwarded-For', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
  res.setHeader('X-Forwarded-Host', req.headers['x-forwarded-host'] || req.headers.host);
  next();
});

// Serve Next.js build (only in production)
if (process.env.APP_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../out')));
}

// In-memory storage for active sessions
let users = new Map();
let pairs = new Map();

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Ice-breaking questions and activities
const iceBreakingQuestions = [
  // Personality & Character
  "ถ้าคุณเป็นสัตว์ คุณจะเป็นอะไรและทำไม? 🐾",
  "ถ้าคุณมีพลังพิเศษ คุณอยากได้พลังอะไร? ⚡",
  "ถ้าคุณเป็นซูเปอร์ฮีโร่ คุณจะชื่ออะไร? 🦸‍♂️",
  "ถ้าคุณเป็นตัวละครในหนัง คุณจะเป็นใคร? 🎭",
  "ถ้าคุณมีเวลาหนึ่งวันที่จะเป็นใครก็ได้ คุณจะเป็นใคร? 👑",
  "ถ้าคุณเป็นสี คุณจะเป็นสีอะไรและทำไม? 🌈",
  "ถ้าคุณเป็นเครื่องดนตรี คุณจะเป็นอะไร? 🎸",
  // "ถ้าคุณเป็นต้นไม้ คุณจะเป็นต้นอะไร? 🌳",
  "ถ้าคุณเป็นฤดูกาล คุณจะเป็นฤดูไหน? 🍂",
  "ถ้าคุณเป็นอารมณ์ คุณจะเป็นอารมณ์ไหน? 😊",
  
  // Food & Preferences
  "อาหารโปรดของคุณคืออะไร? 🍕",
  "ถ้าคุณต้องกินอาหารชนิดเดียวตลอดชีวิต คุณจะเลือกอะไร? 🍜",
  "ขนมหวานที่คุณชอบที่สุดคืออะไร? 🍰",
  // "เครื่องดื่มที่คุณดื่มบ่อยที่สุดคืออะไร? ☕",
  // "รสชาติที่คุณชอบที่สุดคืออะไร? (เปรี้ยว, หวาน, เค็ม, เผ็ด) 🌶️",
  "ถ้าคุณเป็นเชฟ คุณจะทำอาหารอะไรให้เพื่อน? 👨‍🍳",
  "อาหารที่คุณไม่ชอบที่สุดคืออะไร? 🤢",
  "ถ้าคุณมีร้านอาหาร คุณจะเปิดร้านอะไร? 🏪",
  
  // Travel & Places
  "สถานที่ที่คุณอยากไปมากที่สุดคือที่ไหน? ✈️",
  "ประเทศที่คุณอยากไปเที่ยวคือประเทศไหน? 🌍",
  "ถ้าคุณมีบ้านในที่ไหนก็ได้ คุณจะอยู่ที่ไหน? 🏠",
  "เมืองที่คุณชอบที่สุดคือเมืองไหน? 🏙️",
  "ถ้าคุณเป็นไกด์ทัวร์ คุณจะพาไปเที่ยวที่ไหน? 🗺️",
  "สถานที่ที่คุณไปแล้วชอบมากที่สุดคือที่ไหน? 📸",
  "ถ้าคุณมีเงินไปเที่ยวที่ไหนก็ได้ คุณจะไปที่ไหน? 💰",
  // "ทะเลหรือภูเขา คุณชอบไหนมากกว่า? 🏔️",
  
  // Music & Entertainment
  "เพลงที่คุณชอบฟังตอนนี้คือเพลงอะไร? 🎵",
  "ศิลปินที่คุณชอบที่สุดคือใคร? 🎤",
  "หนังหรือซีรี่ย์ที่คุณชอบมากที่สุดคือเรื่องอะไร? 🎬",
  "หนังสือที่คุณชอบที่สุดคือเล่มไหน? 📚",
  "เกมที่คุณชอบเล่นคือเกมอะไร? 🎮",
  // "ถ้าคุณเป็นนักร้อง คุณจะร้องเพลงอะไร? 🎶",
  "หนังที่คุณดูแล้วร้องไห้คือเรื่องอะไร? 😭",
  "เพลงที่ทำให้คุณรู้สึกดีคือเพลงอะไร? 💃",
  "ถ้าคุณมีคอนเสิร์ต คุณจะจัดคอนเสิร์ตของใคร? 🎪",
  
  // Hobbies & Interests
  "งานอดิเรกที่คุณชอบทำคืออะไร? 🎨",
  "กีฬาที่คุณชอบเล่นหรือดูคืออะไร? ⚽",
  "ถ้าคุณมีเวลาว่าง คุณจะทำอะไร? 🕐",
  "สิ่งที่คุณชอบทำในวันหยุดคืออะไร? 🏖️",
  // "ถ้าคุณเป็นศิลปิน คุณจะวาดรูปอะไร? 🖼️",
  "กิจกรรมที่คุณอยากลองทำคืออะไร? 🎯",
  "ถ้าคุณมีสตูดิโอ คุณจะทำอะไร? 🎬",
  "งานฝีมือที่คุณชอบทำคืออะไร? ✂️",
  
  // Dreams & Aspirations
  "ถ้าคุณมีเวลา 1 วันที่จะทำอะไรก็ได้ คุณจะทำอะไร? ⏰",
  "ความฝันที่ใหญ่ที่สุดของคุณคืออะไร? 🌟",
  "ถ้าคุณมีเงินล้าน คุณจะทำอะไร? 💸",
  "อาชีพที่คุณอยากทำคืออะไร? 💼",
  "ถ้าคุณสามารถเปลี่ยนแปลงโลกได้ คุณจะเปลี่ยนอะไร? 🌍",
  // "สิ่งที่คุณอยากทำให้สำเร็จในชีวิตคืออะไร? 🎯",
  "ถ้าคุณมีเวลาย้อนกลับได้ คุณจะย้อนไปทำอะไร? ⏪",
  // "ความสำเร็จที่คุณภูมิใจที่สุดคืออะไร? 🏆",
  
  // Language & Communication
  "ถ้าคุณสามารถพูดภาษาใหม่ได้ คุณอยากพูดภาษาอะไร? 🗣️",
  "คำที่คุณชอบที่สุดคือคำอะไร? 💬",
  "ถ้าคุณเป็นครู คุณจะสอนวิชาอะไร? 👩‍🏫",
  "ภาษาที่คุณอยากเรียนคือภาษาอะไร? 📖",
  // "ถ้าคุณเขียนหนังสือ คุณจะเขียนเรื่องอะไร? ✍️",
  "คำพูดที่คุณชอบพูดบ่อยๆ คืออะไร? 🗨️",
  
  // Fun & Random
  "ถ้าคุณเป็นสี คุณจะเป็นสีอะไรและทำไม? 🌈",
  "ถ้าคุณมีสัตว์เลี้ยง คุณจะเลี้ยงอะไร? 🐕",
  // "ถ้าคุณเป็นผัก คุณจะเป็นผักอะไร? 🥕",
  "ถ้าคุณเป็นผลไม้ คุณจะเป็นผลไม้อะไร? 🍎",
  "ถ้าคุณเป็นเครื่องใช้ไฟฟ้า คุณจะเป็นอะไร? 📱",
  "ถ้าคุณเป็นยานพาหนะ คุณจะเป็นอะไร? 🚗",
  // "ถ้าคุณเป็นเครื่องแต่งกาย คุณจะเป็นอะไร? 👕",
  // "ถ้าคุณเป็นเครื่องประดับ คุณจะเป็นอะไร? 💍",
  // "ถ้าคุณเป็นเครื่องเขียน คุณจะเป็นอะไร? ✏️",
  "ถ้าคุณเป็นของเล่น คุณจะเป็นอะไร? 🧸",
  
  // Deep & Thoughtful
  "สิ่งที่ทำให้คุณมีความสุขที่สุดคืออะไร? 😊",
  "ถ้าคุณมีคำแนะนำให้กับตัวเองในอดีต คุณจะพูดอะไร? 💭",
  // "สิ่งที่คุณขอบคุณมากที่สุดในชีวิตคืออะไร? 🙏",
  "ถ้าคุณมีพลังช่วยเหลือคนอื่น คุณจะช่วยอะไร? 🤝",
  "สิ่งที่คุณเรียนรู้จากความผิดพลาดคืออะไร? 📚",
  "ถ้าคุณมีเวลาพูดกับคนที่คุณรัก คุณจะพูดอะไร? 💕",
  "สิ่งที่คุณอยากให้คนอื่นรู้เกี่ยวกับคุณคืออะไร? 🌟",
  "ถ้าคุณมีโอกาสเปลี่ยนแปลงอะไรในโลก คุณจะเปลี่ยนอะไร? 🌍"
];

const iceBreakingActivities = [
  // Music & Performance (Distance-Friendly)
  "🎨 วาดรูปของกันและกัน (คนละรูป)",
  "✏️ เขียนบทกวีสั้นๆ ให้กัน",
  "🎭 แต่งเรื่องสั้นๆ ด้วยกัน (คนละส่วน)",
  "🎨 วาดรูปด้วยกัน (คนละส่วนของรูป)",
  "🎭 แต่งเพลงสั้นๆ ด้วยกัน (คนละท่อน)",
  
  // Communication & Sharing (Perfect for Online)
  "📚 แนะนำหนังสือที่คุณชอบให้กัน",
  "🎬 แนะนำหนังที่คุณชอบให้กัน",
  "🎵 แนะนำเพลงที่คุณชอบให้กัน",
  "🍕 แนะนำอาหารที่คุณชอบให้กัน",
  "🏖️ แนะนำสถานที่ที่คุณชอบให้กัน",
  "🎮 แนะนำเกมที่คุณชอบให้กัน",
  "📱 แนะนำแอปที่คุณชอบให้กัน",
  
  // Additional Online-Specific Activities
  "🎵 แชร์เพลงที่กำลังฟังให้กันฟัง",
  "🎮 แชร์เกมที่กำลังเล่นให้กันดู",
  "🐕 แชร์สัตว์เลี้ยงให้กันดู (ถ้ามี)"
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
    const { nickname, socialMediaHandle, userId } = data;
    const user = {
      id: socket.id,
      userId: userId || null, // Store the actual user ID if available
      nickname: nickname.trim(),
      socialMediaHandle: socialMediaHandle || null,
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

  // Handle activity answer submission
  socket.on('submit-activity-answer', (data) => {
    const { pairId, userId, answer, fileUrl } = data;
    const pair = pairs.get(pairId);
    
    if (pair) {
      console.log(`Activity answer submitted by ${userId} for pair ${pairId}: ${answer}`);
      console.log(`File URL in activity answer:`, fileUrl);
      
      // Find the partner's socket ID
      const partnerId = pair.user1.id === userId ? pair.user2.id : pair.user1.id;
      const partnerSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.id === partnerId);
      
      if (partnerSocket) {
        // Send the answer to the partner
        const dataToSend = {
          userId: userId,
          answer: answer,
          fileUrl: fileUrl
        };
        console.log(`Sending activity answer to partner ${partnerId}:`, dataToSend);
        partnerSocket.emit('receive-activity-answer', dataToSend);
        console.log(`Activity answer sent to partner ${partnerId}`);
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

// Authentication middleware
const authenticateToken = (req, res, next) => {
  // Skip authentication for OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('Skipping authentication for OPTIONS request:', req.path);
    return next();
  }
  
  console.log('Authentication middleware called for:', req.path);
  console.log('Authorization header:', req.headers['authorization']);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  console.log('Token found, verifying...');
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    console.log('Token verified successfully for user:', user);
    req.user = user;
    next();
  });
};

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ 
      status: 'ok', 
      users: users.size,
      pairs: pairs.size,
      registeredUsers: stats.total_users,
      activeUsers7d: stats.active_users_7d,
      activeUsers30d: stats.active_users_30d,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({ 
      status: 'ok', 
      users: users.size,
      pairs: pairs.size,
      registeredUsers: 0,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values());
  res.json({ users: userList });
});

// Handle preflight requests for file upload
app.options('/api/upload', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.sendStatus(200);
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    // Set CORS headers for Safari compatibility
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Use HTTPS in production, HTTP in development
    const protocol = process.env.APP_ENV === 'production' ? 'https' : req.protocol;
    const host = process.env.APP_ENV === 'production' ? 'api.ionize13.com' : req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    console.log('File uploaded successfully:', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      fileUrl: fileUrl,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ success: true, fileUrl });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ success: false, message: 'File upload failed' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Authentication routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    // Validate input
    if (!email || !password || !nickname) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and nickname are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Create user in database
    const userId = uuidv4();
    const user = await db.createUser({
      id: userId,
      email,
      nickname: nickname.trim(),
      password
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: user
    });

  } catch (error) {
    console.error('Signup error:', error);
    if (error.message === 'User already exists') {
      res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Verify user credentials
    const user = await db.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await db.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Return user data (without password)
    const userData = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      socialMediaHandle: user.social_media_handle,
      createdAt: user.created_at
    };
    
    res.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// User profile routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const user = await db.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get user's game history
    const gameHistory = await db.getUserGameHistory(user.id, 10);

    const userData = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      socialMediaHandle: user.social_media_handle,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      gameHistory: gameHistory
    };
    
    res.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update social media handle
app.put('/api/user/social-media-handle', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { socialMediaHandle } = req.body;

    // Validate input
    if (socialMediaHandle && socialMediaHandle.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Social media handle must be 100 characters or less' 
      });
    }

    // Update social media handle
    await db.updateSocialMediaHandle(userId, socialMediaHandle);

    // Get updated user data
    const user = await db.getUserByEmail(req.user.email);
    
    const userData = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      socialMediaHandle: user.social_media_handle,
      createdAt: user.created_at
    };
    
    res.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('Update social media handle error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Test CORS endpoint
app.options('/api/test-cors', (req, res) => {
  console.log('Test CORS preflight request from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.sendStatus(200);
});

app.get('/api/test-cors', (req, res) => {
  console.log('Test CORS request from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.json({ 
    success: true, 
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Test friend endpoint without authentication
app.options('/api/test-friend', (req, res) => {
  console.log('Test friend preflight request from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.sendStatus(200);
});

app.post('/api/test-friend', (req, res) => {
  console.log('Test friend request received from:', req.headers.origin);
  console.log('Request body:', req.body);
  console.log('Authorization header:', req.headers['authorization']);
  
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.json({ 
    success: true, 
    message: 'Friend test successful',
    origin: req.headers.origin,
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Test OPTIONS endpoint specifically
app.options('/api/test-options', (req, res) => {
  console.log('Test OPTIONS request from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.sendStatus(200);
});

app.get('/api/test-options', (req, res) => {
  console.log('Test OPTIONS GET request from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.json({ 
    success: true, 
    message: 'OPTIONS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Handle preflight requests for friend endpoints
app.options('/api/friends/*', (req, res) => {
  try {
    console.log('Friend endpoint preflight request from:', req.headers.origin);
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.sendStatus(200);
  } catch (error) {
    console.error('Error in friend OPTIONS handler:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Specific OPTIONS handler for accept-request endpoint
app.options('/api/friends/accept-request', (req, res) => {
  try {
    console.log('Accept friend request preflight from:', req.headers.origin);
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.sendStatus(200);
  } catch (error) {
    console.error('Error in OPTIONS handler:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Friend system routes
app.post('/api/friends/send-request', authenticateToken, async (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    const { userId } = req.user;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Friend ID is required' 
      });
    }

    if (userId === friendId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot send friend request to yourself' 
      });
    }

    // Check if already friends
    const areFriends = await db.areFriends(userId, friendId);
    if (areFriends) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already friends with this user' 
      });
    }

    // Check if there's already a pending request
    const hasPendingRequest = await db.hasPendingRequest(userId, friendId);
    if (hasPendingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'Friend request already sent' 
      });
    }

    const result = await db.sendFriendRequest(userId, friendId);
    res.json({
      success: true,
      message: 'Friend request sent successfully',
      request: result
    });

  } catch (error) {
    console.error('Send friend request error:', error);
    if (error.message === 'Friend request already exists') {
      res.status(400).json({ 
        success: false, 
        message: 'Friend request already exists' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
});

app.post('/api/friends/accept-request', authenticateToken, async (req, res) => {
  try {
    console.log('Accept friend request received from:', req.headers.origin);
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    const { userId } = req.user;
    const { friendId } = req.body;

    if (!friendId) {
      console.log('Missing friendId in request body');
      return res.status(400).json({ 
        success: false, 
        message: 'Friend ID is required' 
      });
    }

    console.log('Attempting to accept friend request:', { userId, friendId });
    const result = await db.acceptFriendRequest(userId, friendId);
    console.log('Friend request accepted successfully:', result);
    
    res.json({
      success: true,
      message: 'Friend request accepted successfully',
      friendship: result
    });

  } catch (error) {
    console.error('Accept friend request error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      friendId: req.body?.friendId
    });
    
    if (error.message === 'No pending friend request found') {
      res.status(400).json({ 
        success: false, 
        message: 'No pending friend request found' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message // Include error message for debugging
      });
    }
  }
});

app.post('/api/friends/reject-request', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Friend ID is required' 
      });
    }

    const result = await db.rejectFriendRequest(userId, friendId);
    res.json({
      success: true,
      message: 'Friend request rejected successfully'
    });

  } catch (error) {
    console.error('Reject friend request error:', error);
    if (error.message === 'No pending friend request found') {
      res.status(400).json({ 
        success: false, 
        message: 'No pending friend request found' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  }
});

app.delete('/api/friends/remove', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Friend ID is required' 
      });
    }

    const result = await db.removeFriend(userId, friendId);
    res.json({
      success: true,
      message: 'Friend removed successfully'
    });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const friends = await db.getFriends(userId);
    res.json({
      success: true,
      friends: friends
    });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

app.get('/api/friends/requests', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const requests = await db.getFriendRequests(userId);
    res.json({
      success: true,
      requests: requests
    });

  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

app.get('/api/friends/sent-requests', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const sentRequests = await db.getSentFriendRequests(userId);
    res.json({
      success: true,
      sentRequests: sentRequests
    });

  } catch (error) {
    console.error('Get sent friend requests error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Serve the Next.js app (only in production)
if (process.env.APP_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../out/index.html'));
  });
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize database and start server
async function startServer() {
  try {
    // Try to initialize database, but don't fail if it doesn't work
    try {
      await db.init();
      console.log('✅ Database initialized successfully');
    } catch (dbError) {
      console.warn('⚠️ Database initialization failed, continuing without database:', dbError.message);
    }
    
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
      console.log(`👥 Users API: http://${HOST}:${PORT}/api/users`);
      console.log(`💾 Database: SQLite (users.db)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  try {
    db.close();
  } catch (error) {
    console.warn('Database close error:', error.message);
  }
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Wildcard OPTIONS handler - must be last to avoid conflicts with specific handlers
app.options('*', (req, res) => {
  try {
    console.log('Wildcard OPTIONS request for:', req.path, 'from:', req.headers.origin);
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  } catch (error) {
    console.error('Error in wildcard OPTIONS handler:', error);
    res.status(500).send('Internal Server Error');
  }
});

startServer();