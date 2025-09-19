const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

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

// Serve Next.js build (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../out')));
}

// In-memory storage (for production, use Redis or database)
let users = new Map();
let pairs = new Map();
let registeredUsers = new Map(); // For authentication

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images, videos, audio, and documents
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|mp3|wav|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, audio, and documents are allowed.'));
    }
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
  // "🎤 ร้องเพลงให้กันฟัง (คนละ 1 เพลง)",
  // "🎵 ฮัมเพลงให้อีกคนทาย",
  // "🎶 ร้องเพลงคาราโอเกะพร้อมกัน (คนละเพลง)",
  // "🎸 เล่นเครื่องดนตรีหรือทำเสียงดนตรีให้กันฟัง",
  // "🎪 แสดงคอนเสิร์ตเล็กๆ ให้กันฟัง",
  // "🎭 แสดงละครสั้นๆ เรื่องราวที่คุณแต่งขึ้น",
  // "💃 แสดงท่าเต้นที่คุณชอบให้กันดู",
  // "🕺 สอนท่าเต้นให้กันและกัน (ผ่านวิดีโอ)",
  "🎨 วาดรูปของกันและกัน (คนละรูป)",
  // "🎪 เล่นเกม rock-paper-scissors (นับ 1-2-3 พร้อมกัน)",
  
  // Games & Challenges (Online-Friendly)
  // "🎭 เล่นเกม charades (ทายคำ) ผ่านข้อความ",
  // "🧩 เล่นเกมทายคำจากภาพ (ส่งรูปให้กันทาย)",
  // "🎯 เล่นเกมทายคำจากเสียง (ทำเสียงให้กันทาย)",
  // "🎲 เล่นเกมทายตัวเลข 1-10 (คนละตัวเลข)",
  // "🎪 เล่นเกมทายคำจากท่าทาง (ผ่านวิดีโอ)",
  // "🎮 เล่นเกมทายคำจากคำใบ้ (ส่งข้อความ)",
  // "🎯 เล่นเกมทายคำจากรูปภาพ (ส่งรูปให้กันทาย)",
  // "🎪 เล่นเกมทายคำจากเสียง (ทำเสียงให้กันทาย)",
  // "🎲 เล่นเกมทายคำจากตัวเลข (คนละตัวเลข)",
  // "🎯 เล่นเกมทายคำจากสี (บอกสีให้กันทาย)",
  
  // Creative & Art (Remote Collaboration)
  // "🎨 วาดรูปของกันและกัน (คนละรูป)",
  "✏️ เขียนบทกวีสั้นๆ ให้กัน",
  "🎭 แต่งเรื่องสั้นๆ ด้วยกัน (คนละส่วน)",
  "🎨 วาดรูปด้วยกัน (คนละส่วนของรูป)",
  // "✂️ ทำ origami ด้วยกัน (คนละตัว)",
  // "🎨 วาดรูปด้วยนิ้ว (คนละรูป)",
  // "✏️ เขียนจดหมายให้กัน",
  "🎭 แต่งเพลงสั้นๆ ด้วยกัน (คนละท่อน)",
  // "🎨 วาดรูปด้วยสีเทียน (คนละรูป)",
  // "✏️ เขียนเรื่องราวด้วยกัน (คนละส่วน)",
  
  // Virtual Physical & Movement
  // "🤝 ทำท่าทาง handshake แบบพิเศษให้กันดู",
  // "🤗 ทำท่าทางกอดกันแบบเพื่อนให้กันดู",
  // "👋 ทำท่าทางทักทายแบบใหม่ให้กันดู",
  // "💃 แสดงท่าเต้นที่คุณชอบให้กันดู",
  // "🕺 สอนท่าเต้นให้กันและกัน (ผ่านวิดีโอ)",
  // "🤸‍♀️ แสดงท่าทางที่คุณทำได้ให้กันดู",
  // "🏃‍♀️ ทำท่าทางวิ่งแข่งกันสั้นๆ",
  // "🤸‍♂️ แสดงท่าทางที่คุณทำได้ให้กันดู",
  // "💪 แสดงท่าทางที่คุณทำได้ให้กันดู",
  // "🤸‍♀️ แสดงท่าทางที่คุณทำได้ให้กันดู",
  
  // Communication & Sharing (Perfect for Online)
  // "😄 เล่าเรื่องตลกให้กันฟัง",
  // "📖 เล่าเรื่องราวที่คุณชอบให้กันฟัง",
  // "🎭 เล่าเรื่องราวที่คุณแต่งขึ้นให้กันฟัง",
  "📚 แนะนำหนังสือที่คุณชอบให้กัน",
  "🎬 แนะนำหนังที่คุณชอบให้กัน",
  "🎵 แนะนำเพลงที่คุณชอบให้กัน",
  "🍕 แนะนำอาหารที่คุณชอบให้กัน",
  "🏖️ แนะนำสถานที่ที่คุณชอบให้กัน",
  "🎮 แนะนำเกมที่คุณชอบให้กัน",
  "📱 แนะนำแอปที่คุณชอบให้กัน",
  
  // Fun & Silly (Online-Friendly)
  // "🌟 แสดงความสามารถพิเศษของคุณให้กันดู",
  // "😄 ทำหน้าตลกให้กันดู (ผ่านวิดีโอ)",
  // "🎭 เล่นเกมทายคำจากท่าทาง (ผ่านวิดีโอ)",
  // "🎪 เล่นเกมทายคำจากเสียง (ทำเสียงให้กันทาย)",
  // "🎲 เล่นเกมทายคำจากตัวเลข (คนละตัวเลข)",
  // "🎯 เล่นเกมทายคำจากสี (บอกสีให้กันทาย)",
  // "🎪 เล่นเกมทายคำจากรูปภาพ (ส่งรูปให้กันทาย)",
  // "🎭 เล่นเกมทายคำจากท่าทาง (ผ่านวิดีโอ)",
  // "🎵 เล่นเกมทายคำจากเสียง (ทำเสียงให้กันทาย)",
  // "🎲 เล่นเกมทายคำจากตัวเลข (คนละตัวเลข)",
  
  // Memory & Learning (Perfect for Online)
  // "🧠 ทดสอบความจำด้วยกัน (ถามตอบ)",
  // "📚 สอนสิ่งใหม่ให้กันและกัน",
  // "🎯 ทดสอบความรู้ด้วยกัน (ถามตอบ)",
  // "🧩 แก้ปริศนาด้วยกัน (ร่วมกันคิด)",
  // "🎪 เล่นเกมทายคำจากท่าทาง (ผ่านวิดีโอ)",
  // "🎭 เล่นเกมทายคำจากเสียง (ทำเสียงให้กันทาย)",
  // "🎲 เล่นเกมทายคำจากตัวเลข (คนละตัวเลข)",
  // "🎯 เล่นเกมทายคำจากสี (บอกสีให้กันทาย)",
  // "🎪 เล่นเกมทายคำจากรูปภาพ (ส่งรูปให้กันทาย)",
  // "🎭 เล่นเกมทายคำจากท่าทาง (ผ่านวิดีโอ)",
  
  // Virtual Photo & Memory
  // "📸 ถ่ายรูป selfie ให้กันดู (คนละรูป)",
  // "📷 ถ่ายรูปในท่าทางต่างๆ ให้กันดู",
  // "📱 ถ่ายวิดีโอสั้นๆ ให้กันดู (คนละวิดีโอ)",
  // "📸 ถ่ายรูปในท่าทางตลกให้กันดู",
  // "📷 ถ่ายรูปในท่าทางสวยงามให้กันดู",
  // "📱 ถ่ายวิดีโอสั้นๆ ให้กันดู (คนละวิดีโอ)",
  // "📸 ถ่ายรูปในท่าทางต่างๆ ให้กันดู",
  // "📷 ถ่ายรูปในท่าทางตลกให้กันดู",
  // "📱 ถ่ายวิดีโอสั้นๆ ให้กันดู (คนละวิดีโอ)",
  // "📸 ถ่ายรูปในท่าทางสวยงามให้กันดู",
  
  // Virtual Special & Unique
  // "🎁 แนะนำของขวัญเล็กๆ ให้กัน (คนละอย่าง)",
  // "💌 เขียนจดหมายให้กัน (ส่งข้อความ)",
  // "🎂 ฉลองวันเกิดด้วยกัน (แม้ไม่ใช่วันเกิด) - ร้องเพลงให้กัน",
  // "🎉 ฉลองอะไรก็ได้ด้วยกัน (คนละอย่าง)",
  // "🎊 ฉลองความสำเร็จด้วยกัน (คนละความสำเร็จ)",
  // "🎈 ฉลองวันพิเศษด้วยกัน (คนละวันพิเศษ)",
  // "🎁 แนะนำของขวัญเล็กๆ ให้กัน (คนละอย่าง)",
  // "💌 เขียนจดหมายให้กัน (ส่งข้อความ)",
  // "🎂 ฉลองวันเกิดด้วยกัน (แม้ไม่ใช่วันเกิด) - ร้องเพลงให้กัน",
  // "🎉 ฉลองอะไรก็ได้ด้วยกัน (คนละอย่าง)",
  
  // Additional Online-Specific Activities
  // "🌍 แชร์ตำแหน่งที่อยู่ปัจจุบันให้กันดู",
  // "☁️ แชร์สภาพอากาศที่บ้านให้กันฟัง",
  // "🍽️ แชร์อาหารที่กำลังกินให้กันดู",
  // "📚 แชร์หนังสือที่กำลังอ่านให้กันดู",
  "🎵 แชร์เพลงที่กำลังฟังให้กันฟัง",
  // "🎬 แชร์หนังที่กำลังดูให้กันดู",
  "🎮 แชร์เกมที่กำลังเล่นให้กันดู",
  // "📱 แชร์แอปที่กำลังใช้ให้กันดู",
  // "🏠 แชร์ห้องที่อยู่ให้กันดู",
  "🐕 แชร์สัตว์เลี้ยงให้กันดู (ถ้ามี)",
  // "🌱 แชร์ต้นไม้ที่ปลูกให้กันดู (ถ้ามี)",
  // "🎨 แชร์งานศิลปะที่ทำให้กันดู",
  // "✍️ แชร์งานเขียนที่เขียนให้กันดู",
  // "🎭 แชร์การแสดงที่ทำให้กันดู",
  // "🎪 แชร์ความสนุกที่ทำให้กันดู"
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
    const { pairId, userId, answer, fileUrl } = data;
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
          answer: answer,
          fileUrl: fileUrl
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
      
      // Find the partner's socket ID
      const partnerId = pair.user1.id === userId ? pair.user2.id : pair.user1.id;
      const partnerSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.id === partnerId);
      
      if (partnerSocket) {
        // Send the activity answer to the partner
        partnerSocket.emit('receive-activity-answer', {
          userId: userId,
          answer: answer,
          fileUrl: fileUrl
        });
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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    users: users.size,
    pairs: pairs.size,
    registeredUsers: registeredUsers.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values());
  res.json({ users: userList });
});

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

    // Check if user already exists
    if (registeredUsers.has(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    const user = {
      id: userId,
      email,
      nickname: nickname.trim(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    registeredUsers.set(email, user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
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

    // Find user
    const user = registeredUsers.get(email);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
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

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  try {
    const { email } = req.user;
    const user = registeredUsers.get(email);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// File upload route
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      fileUrl: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the Next.js app (only in production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../out/index.html'));
  });
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`👥 Users API: http://${HOST}:${PORT}/api/users`);
});
