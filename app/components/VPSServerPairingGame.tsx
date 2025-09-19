'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'



interface User {
  id: string
  userId?: string | null
  nickname: string
  socialMediaHandle?: string
  joinedAt: number
  status: 'waiting' | 'paired'
  socketId: string
}

interface Pair {
  id: string
  user1: User
  user2: User
  question: string
  activity: string
  createdAt: number
}

export default function VPSServerPairingGame() {
  const { user: authUser, isAuthenticated } = useAuth()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [currentPair, setCurrentPair] = useState<Pair | null>(null)
  const [gamePhase, setGamePhase] = useState<'nickname' | 'waiting' | 'paired' | 'activity'>('nickname')
  const [waitingMessage, setWaitingMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [userManuallyLeft, setUserManuallyLeft] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // Server URL
  const SERVER_URL = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
    ? 'https://api.ionize13.com'
    : 'http://localhost:3000'

  // Auto-login with authenticated user's nickname
  useEffect(() => {
    if (isAuthenticated && authUser && connectionStatus === 'connected' && gamePhase === 'nickname' && !userManuallyLeft) {
      // Automatically use the logged-in user's nickname
      handleNicknameSubmit(authUser.nickname)
    }
  }, [isAuthenticated, authUser, connectionStatus, gamePhase, userManuallyLeft])

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('Connected to server')
      setConnectionStatus('connected')
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnectionStatus('disconnected')
    })

    socket.on('users-updated', (data) => {
      setAllUsers(data.users)
    })

    socket.on('user-paired', (data) => {
      setCurrentPair(data.pair)
      setGamePhase('paired')
      setTimeout(() => {
        setGamePhase('activity')
      }, 3000)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Update waiting messages
  useEffect(() => {
    if (gamePhase === 'waiting') {
      const messages = [
        "กำลังหาคู่ให้คุณ... 🔍",
        "มีคนอื่นๆ กำลังเข้ามา... 👥",
        "อีกสักครู่จะได้เจอเพื่อนใหม่! ⏰",
        "กำลังเตรียมความสนุกให้คุณ... 🎉"
      ]
      
      let messageIndex = 0
      const messageInterval = setInterval(() => {
        setWaitingMessage(messages[messageIndex])
        messageIndex = (messageIndex + 1) % messages.length
      }, 2000)
      
      return () => clearInterval(messageInterval)
    }
  }, [gamePhase])

  const handleNicknameSubmit = (nickname: string) => {
    if (socketRef.current && socketRef.current.id) {
      const socialMediaHandle = authUser?.socialMediaHandle || null
      const userId = authUser?.id || null
      socketRef.current.emit('join-waiting', { nickname, socialMediaHandle, userId })
      setCurrentUser({
        id: socketRef.current.id,
        nickname,
        socialMediaHandle: socialMediaHandle || undefined,
        joinedAt: Date.now(),
        status: 'waiting',
        socketId: socketRef.current.id
      })
      setGamePhase('waiting')
      setUserManuallyLeft(false) // Reset the flag when user starts a new game
    }
  }

  const startNewGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('start-new-game')
    }
    
    setCurrentUser(null)
    setAllUsers([])
    setCurrentPair(null)
    setGamePhase('nickname')
    setWaitingMessage('')
    setUserManuallyLeft(false) // Reset the flag when user starts a new game
  }

  const leaveGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-waiting')
    }
    
    setCurrentUser(null)
    setAllUsers([])
    setCurrentPair(null)
    setGamePhase('nickname')
    setWaitingMessage('')
    setUserManuallyLeft(true) // Prevent auto-login after manual leave
  }

  return (
    <div className="simple-game-container min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🎯 เกมจับคู่เพื่อน
          </h1>
          <p className="text-lg text-white opacity-90">
            มาหาเพื่อนใหม่และสนุกด้วยกันเถอะ!
          </p>
        </div>

        {/* Connection Status */}
        <div className="text-center mb-4">
          <div className={`inline-block px-4 py-2 rounded-lg ${
            connectionStatus === 'connected' ? 'bg-green-400 bg-opacity-20 text-green-200' :
            connectionStatus === 'connecting' ? 'bg-yellow-400 bg-opacity-20 text-yellow-200' :
            'bg-red-400 bg-opacity-20 text-red-200'
          }`}>
            {connectionStatus === 'connected' ? '🟢 เชื่อมต่อเซิร์ฟเวอร์แล้ว' :
             connectionStatus === 'connecting' ? '🟡 กำลังเชื่อมต่อเซิร์ฟเวอร์...' :
             '🔴 เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'}
          </div>
        </div>

        {/* Game Content */}
        {gamePhase === 'nickname' && (
          <NicknameInput 
            onSubmit={handleNicknameSubmit} 
            isAuthenticated={isAuthenticated}
            authUser={authUser}
            userManuallyLeft={userManuallyLeft}
            onBackToHome={() => {
              setUserManuallyLeft(false)
              // This will trigger the parent component to go back to home
              window.location.href = '/'
            }}
          />
        )}

        {gamePhase === 'waiting' && (
          <WaitingRoom 
            currentUser={currentUser}
            allUsers={allUsers}
            waitingMessage={waitingMessage}
            onLeave={leaveGame}
            connectionStatus={connectionStatus}
          />
        )}

        {gamePhase === 'paired' && currentPair && (
          <PairingResult pair={currentPair} />
        )}

        {gamePhase === 'activity' && currentPair && socketRef.current && (
          <ActivityScreen 
            pair={currentPair}
            onNewGame={startNewGame}
            onLeave={leaveGame}
            currentUser={currentUser}
            socketRef={socketRef}
            isAuthenticated={isAuthenticated}
            authUser={authUser}
          />
        )}
      </div>
    </div>
  )
}

// Nickname Input Component
function NicknameInput({ 
  onSubmit, 
  isAuthenticated, 
  authUser,
  userManuallyLeft,
  onBackToHome
}: { 
  onSubmit: (nickname: string) => void
  isAuthenticated: boolean
  authUser: any
  userManuallyLeft: boolean
  onBackToHome: () => void
}) {
  const [nickname, setNickname] = useState('')
  const [useCustomName, setUseCustomName] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (nickname.trim()) {
      onSubmit(nickname.trim())
    }
  }

  return (
    <div className="bg-white backdrop-blur-lg rounded-2xl p-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">👋</div>
        <h2 className="text-2xl font-bold text-black mb-2">
          {isAuthenticated && !useCustomName 
            ? `สวัสดี ${authUser?.nickname}!` 
            : isAuthenticated && useCustomName
            ? 'ใช้ชื่ออื่น'
            : 'ยินดีต้อนรับ!'
          }
        </h2>
        <p className="text-black opacity-80">
          {isAuthenticated && !useCustomName
            ? 'กำลังเข้าสู่เกมด้วยชื่อของคุณ...' 
            : 'กรอกชื่อเล่นของคุณเพื่อเริ่มต้น'
          }
        </p>
      </div>

      {isAuthenticated && !useCustomName ? (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {authUser?.nickname?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-blue-900">{authUser?.nickname}</p>
                <p className="text-sm text-blue-700">กำลังเข้าสู่เกม...</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>กำลังเชื่อมต่อ...</span>
            </div>
          </div>
          <div className="text-center">
            <button
              onClick={() => setUseCustomName(true)}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              ใช้ชื่ออื่นแทน
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-10 text-black placeholder-black placeholder-opacity-60 focus:border-opacity-60 focus:outline-none text-center text-lg"
              placeholder="ชื่อเล่นของคุณ"
              maxLength={20}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-400 to-blue-400 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-500 hover:to-blue-500 transition-all transform hover:scale-105"
          >
            🚀 เริ่มต้น
          </button>
        </form>
      )}
      
      {isAuthenticated && useCustomName && (
        <div className="text-center mt-4">
          <button
            onClick={() => setUseCustomName(false)}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            กลับไปใช้ชื่อบัญชี ({authUser?.nickname})
          </button>
        </div>
      )}
      
      {userManuallyLeft && (
        <div className="text-center mt-4">
          <button
            onClick={onBackToHome}
            className="text-sm text-gray-600 hover:text-gray-700 underline"
          >
            🏠 กลับหน้าแรก
          </button>
        </div>
      )}
    </div>
  )
}

// Waiting Room Component
function WaitingRoom({ 
  currentUser, 
  allUsers, 
  waitingMessage,
  onLeave,
  connectionStatus
}: { 
  currentUser: User | null
  allUsers: User[]
  waitingMessage: string
  onLeave: () => void
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
}) {
  const waitingUsers = allUsers.filter(user => user.status === 'waiting')
  const otherWaitingUsers = waitingUsers.filter(user => user.id !== currentUser?.id)
  
  return (
    <div className="bg-white backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="text-6xl mb-6">⏳</div>
        <h2 className="text-2xl font-bold text-black mb-4">
          กำลังสุ่มหาเพื่อนให้คุณ...
        </h2>
        <p className="text-lg text-black opacity-80 mb-6">
          {waitingMessage}
        </p>

        {/* Current User */}
        <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-black text-lg">
            คุณ: {currentUser?.nickname || 'กำลังเชื่อมต่อ...'}
          </h3>
          <p className="text-black opacity-80">
            กำลังรอเพื่อนใหม่... ({waitingUsers.length} คนในห้องรอ)
          </p>
        </div>

        {/* Other Users */}
        {otherWaitingUsers.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-black font-semibold">ผู้เข้าร่วมคนอื่น:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherWaitingUsers.map(user => (
                <div key={user.id} className="bg-white bg-opacity-20 rounded-lg p-3">
                  <span className="text-black font-medium">
                    {user.nickname}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {/* <div className="bg-blue-400 bg-opacity-20 rounded-lg p-4 mb-6">
          <p className="text-black text-sm">
            💡 <strong>วิธีทดสอบ:</strong> เปิดเว็บไซต์นี้บนอุปกรณ์อื่นหรือให้เพื่อนเปิดเว็บไซต์เดียวกัน 
            กรอกชื่อเล่นแล้วรอในห้องรอ จะมีการจับคู่อัตโนมัติ!
          </p>
        </div> */}

        {/* Debug Info */}
        {/* <div className="bg-gray-400 bg-opacity-20 rounded-lg p-4 mb-6">
          <p className="text-gray-200 text-xs">
            <strong>Debug:</strong> Total users: {allUsers.length}, Waiting: {waitingUsers.length}
          </p>
          <p className="text-gray-200 text-xs mt-1">
            <strong>Users:</strong> {allUsers.map(u => `${u.nickname}(${u.status})`).join(', ')}
          </p>
          <p className="text-gray-200 text-xs mt-1">
            <strong>Connection:</strong> {connectionStatus}
          </p>
        </div> */}

        {/* Loading Animation */}
        <div className="mt-8">
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        {/* Leave Button */}
        <div className="mt-6">
          <button
            onClick={() => {
              if (window.confirm('คุณแน่ใจหรือไม่ที่จะออกจากห้องรอ?')) {
                onLeave()
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            🚪 ออกจากห้องรอ
          </button>
        </div>
      </div>
    </div>
  )
}

// Pairing Result Component
function PairingResult({ pair }: { pair: Pair }) {
  return (
    <div className="bg-white backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-black mb-6">
          พบเพื่อนใหม่แล้ว!
        </h2>

        <div className="space-y-6">
          {/* Users */}
          <div className="flex justify-center items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">👤</div>
              <h3 className="font-semibold text-black text-lg">
                {pair.user1.nickname}
              </h3>
              {pair.user1.socialMediaHandle && (
                <p className="text-sm text-gray-600 mt-1">
                  📱 {pair.user1.socialMediaHandle}
                </p>
              )}
            </div>

            <div className="text-4xl">🤗</div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">👤</div>
              <h3 className="font-semibold text-black text-lg">
                {pair.user2.nickname}
              </h3>
              {pair.user2.socialMediaHandle && (
                <p className="text-sm text-gray-600 mt-1">
                  📱 {pair.user2.socialMediaHandle}
                </p>
              )}
            </div>
          </div>

          <div className="bg-yellow-400 bg-opacity-20 rounded-lg p-4">
            <p className="text-black text-lg">
              กำลังเตรียมกิจกรรมสนุกๆ ให้คุณ...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityScreen({
  pair,
  onNewGame,
  onLeave,
  currentUser,
  socketRef,
  isAuthenticated,
  authUser
}: {
  pair: Pair;
  onNewGame: () => void;
  onLeave: () => void;
  currentUser: User | null;
  socketRef: React.MutableRefObject<Socket | null>;
  isAuthenticated: boolean;
  authUser: any;
}) {
  console.log('ActivityScreen props:', { pair, currentUser, socketRef });
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [partnerAnswer, setPartnerAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false); // Track submission status
  
  // Activity form states
  const [showActivityAnswer, setShowActivityAnswer] = useState(false);
  const [userActivityAnswer, setUserActivityAnswer] = useState('');
  const [partnerActivityAnswer, setPartnerActivityAnswer] = useState('');
  const [isActivitySubmitted, setIsActivitySubmitted] = useState(false);
  const [userFile, setUserFile] = useState<File | null>(null);
  const [partnerFile, setPartnerFile] = useState<string | null>(null);
  const [userFileUrl, setUserFileUrl] = useState<string | null>(null);
  const [partnerFileUrl, setPartnerFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    const handleReceiveAnswer = (data: { userId: string; answer: string }) => {
      console.log('Received answer data:', data);
      console.log('Current pair:', pair);
      console.log('Current user:', currentUser);
      console.log('Checking if answer is from partner...');
      
      if (
        (pair.user1.id === data.userId && pair.user2.id === currentUser?.id) ||
        (pair.user2.id === data.userId && pair.user1.id === currentUser?.id)
      ) {
        console.log('Answer is from partner, setting partner answer:', data.answer);
        setPartnerAnswer(data.answer);
      } else {
        console.log('Answer is not from partner, ignoring');
      }
    };

    const handleReceiveActivityAnswer = (data: { userId: string; answer: string; fileUrl?: string }) => {
      console.log('Received activity answer data:', data);
      console.log('Current user ID:', currentUser?.id);
      console.log('Pair user1 ID:', pair.user1.id);
      console.log('Pair user2 ID:', pair.user2.id);
      console.log('Data user ID:', data.userId);
      
      if (
        (pair.user1.id === data.userId && pair.user2.id === currentUser?.id) ||
        (pair.user2.id === data.userId && pair.user1.id === currentUser?.id)
      ) {
        console.log('Activity answer is from partner, setting partner activity answer:', data.answer);
        setPartnerActivityAnswer(data.answer);
        if (data.fileUrl) {
          console.log('Setting partner file URL:', data.fileUrl);
          setPartnerFileUrl(data.fileUrl);
        } else {
          console.log('No file URL in partner data');
        }
      } else {
        console.log('Activity answer is not from partner, ignoring');
      }
    };

    socket.on('receive-answer', handleReceiveAnswer);
    socket.on('receive-activity-answer', handleReceiveActivityAnswer);

    return () => {
      socket.off('receive-answer', handleReceiveAnswer);
      socket.off('receive-activity-answer', handleReceiveActivityAnswer);
    };
  }, [pair, currentUser, socketRef]);

  const handleAnswerSubmit = () => {
    if (socketRef.current && userAnswer.trim() && currentUser && !isSubmitted) {
      const submitData = {
        pairId: pair.id,
        userId: currentUser.id,
        answer: userAnswer.trim()
      };
      console.log('Submitting answer:', submitData);
      socketRef.current.emit('submit-answer', submitData);
      setIsSubmitted(true); // Mark as submitted
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    if (file) {
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      setUserFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setUserFileUrl(url);
      console.log('File preview URL created:', url);
    } else {
      console.log('No file selected');
      setUserFile(null);
      setUserFileUrl(null);
    }
  };

  const handleActivitySubmit = async () => {
    if (socketRef.current && userActivityAnswer.trim() && currentUser && !isActivitySubmitted) {
      let fileUrl = null;
      
      // Upload file if selected
      if (userFile) {
        console.log('Uploading file:', userFile.name, userFile.type, userFile.size);
        try {
          const formData = new FormData();
          formData.append('file', userFile);
          formData.append('pairId', pair.id);
          formData.append('userId', currentUser.id);
          
          console.log('Sending file upload request to:', '/api/upload');
          
          // Test if server is reachable first
          try {
            const healthResponse = await fetch('https://api.ionize13.com/api/health');
            console.log('Server health check:', healthResponse.status);
          } catch (healthError) {
            console.error('Server not reachable:', healthError);
          }
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          console.log('File upload response status:', response.status);
          if (response.ok) {
            const result = await response.json();
            console.log('File upload result:', result);
            fileUrl = result.fileUrl;
            console.log('File URL set to:', fileUrl);
          } else {
            const errorText = await response.text();
            console.error('File upload failed with status:', response.status, errorText);
          }
        } catch (error) {
          console.error('File upload failed:', error);
        }
      } else {
        console.log('No file selected for upload');
      }

      const submitData = {
        pairId: pair.id,
        userId: currentUser.id,
        answer: userActivityAnswer.trim(),
        fileUrl: fileUrl
      };
      
      console.log('Submitting activity answer:', submitData);
      console.log('File URL being sent:', fileUrl);
      console.log('Socket connected:', socketRef.current?.connected);
      console.log('Current user ID:', currentUser.id);
      console.log('Pair ID:', pair.id);
      socketRef.current.emit('submit-activity-answer', submitData);
      setIsActivitySubmitted(true);
    }
  };

  console.log(partnerAnswer)
  console.log('Partner file URL state:', partnerFileUrl)
  console.log('User file state:', userFile)
  console.log('User file URL state:', userFileUrl)

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="text-center">
        <div className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-4 mb-6 animate-pulse">
          <div className="text-5xl">🎪</div>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          กิจกรรมสนุกๆ
        </h2>
        <div className="flex items-center justify-center space-x-4 mb-6">
          <div className="bg-white bg-opacity-20 rounded-full px-4 py-2 text-center">
            <div className="text-white font-semibold">👤 {pair.user1.nickname}</div>
            {pair.user1.socialMediaHandle && (
              <div className="text-xs text-gray-200">📱 {pair.user1.socialMediaHandle}</div>
            )}
          </div>
          <div className="text-2xl animate-bounce">🤗
          </div>
          <div className="bg-white bg-opacity-20 rounded-full px-4 py-2 text-center">
            <div className="text-white font-semibold">👤 {pair.user2.nickname}</div>
            {pair.user2.socialMediaHandle && (
              <div className="text-xs text-gray-200">📱 {pair.user2.socialMediaHandle}</div>
            )}
          </div>
        </div>
      </div>

      {/* Question Section */}
      <div className="bg-white backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white border-opacity-20">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-4 mb-4">
            <div className="text-4xl">❓</div>
          </div>
          <h3 className="text-2xl font-bold text-black mb-2">
            คำถาม Ice-Breaking
          </h3>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 mx-auto rounded-full"></div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 mb-8 border border-blue-200">
          <p className="text-black text-xl text-center leading-relaxed font-medium">
            {pair.question}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-black font-semibold mb-3 text-lg">
              💭 คำตอบของคุณ
            </label>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 bg-white bg-opacity-50 text-black placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 text-lg resize-none transition-all duration-300"
              placeholder="แบ่งปันความคิดของคุณที่นี่..."
              maxLength={200}
              rows={4}
              disabled={isSubmitted}
            />
            <div className="text-right mt-2">
              <span className="text-sm text-gray-500">{userAnswer.length}/200</span>
            </div>
          </div>


          <div className="text-center">
            <button
              onClick={handleAnswerSubmit}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform ${
                isSubmitted
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : userAnswer.trim() && socketRef.current?.connected
                  ? 'bg-gradient-to-r from-green-400 to-blue-400 text-white hover:from-green-500 hover:to-blue-500 hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!userAnswer.trim() || !socketRef.current?.connected || isSubmitted}
            >
              {isSubmitted ? '✅ ส่งคำตอบแล้ว' : '📤 ส่งคำตอบ'}
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-semibold py-3 px-8 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            {showAnswer ? '🙈 ซ่อนคำตอบ' : '👀 ดูคำตอบทั้งคู่'}
          </button>
        </div>

        {showAnswer && (
          <div className="mt-8 space-y-6 animate-fadeIn">
            <div className="text-center">
              <h4 className="text-xl font-bold text-black mb-4">💬 คำตอบของทั้งคู่</h4>
            </div>
            
            {/* User's own answer */}
            {userAnswer && (
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl p-6 border-l-4 border-blue-500">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 rounded-full p-2">
                    <span className="text-white text-lg">👤</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-blue-800 text-lg mb-2">{currentUser?.nickname} (คุณ)</h5>
                    <p className="text-blue-700 text-lg leading-relaxed">{userAnswer}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Partner's answer */}
            {partnerAnswer ? (
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 border-l-4 border-yellow-500">
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-500 rounded-full p-2">
                    <span className="text-white text-lg">👤</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-yellow-800 text-lg mb-2">
                      {pair.user1.id === currentUser?.id ? pair.user2.nickname : pair.user1.nickname}
                      {(pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle) && (
                        <span className="text-sm text-yellow-600 ml-2">
                          📱 {pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle}
                        </span>
                      )}
                    </h5>
                    <p className="text-yellow-700 text-lg leading-relaxed">{partnerAnswer}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-gray-700 text-lg">
                  {pair.user1.id === currentUser?.id ? pair.user2.nickname : pair.user1.nickname}
                  {(pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle) && (
                    <span className="text-sm text-gray-500 ml-2">
                      📱 {pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle}
                    </span>
                  )} ยังไม่ได้ส่งคำตอบ
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity Section */}
      <div className="bg-white backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white border-opacity-20">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-4 mb-4">
            <div className="text-4xl">🎯</div>
          </div>
          <h3 className="text-2xl font-bold text-black mb-2">
            กิจกรรมสนุก
          </h3>
          <div className="w-24 h-1 bg-gradient-to-r from-green-400 to-emerald-400 mx-auto rounded-full"></div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 mb-8 border border-green-200">
          <p className="text-black text-xl text-center leading-relaxed font-medium">
            {pair.activity}
          </p>
        </div>

        {/* Activity Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-black font-semibold mb-3 text-lg">
            💭 คำตอบของคุณ
            </label>
            <textarea
              value={userActivityAnswer}
              onChange={(e) => setUserActivityAnswer(e.target.value)}
              className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 bg-white bg-opacity-50 text-black placeholder-gray-500 focus:border-green-400 focus:outline-none focus:ring-4 focus:ring-green-100 text-lg resize-none transition-all duration-300"
              placeholder="แบ่งปันความคิดของคุณที่นี่..."
              maxLength={300}
              rows={4}
              disabled={isActivitySubmitted}
            />
            <div className="text-right mt-2">
              <span className="text-sm text-gray-500">{userActivityAnswer.length}/300</span>
            </div>
          </div>

          {/* File Upload for Activity */}
          <div>
            <label className="block text-black font-semibold mb-3 text-lg">
              📎 แนบไฟล์
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white bg-opacity-50 text-black focus:border-green-400 focus:outline-none focus:ring-4 focus:ring-green-100 transition-all duration-300"
              disabled={isActivitySubmitted}
            />
            {userFileUrl && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">ไฟล์ที่เลือก:</p>
                {userFile?.type.startsWith('image/') ? (
                  <img src={userFileUrl} alt="Preview" className="max-w-xs rounded-lg" />
                ) : (
                  <p className="text-sm text-green-600">{userFile?.name}</p>
                )}
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={handleActivitySubmit}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform ${
                isActivitySubmitted
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : userActivityAnswer.trim() && socketRef.current?.connected
                  ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white hover:from-green-500 hover:to-emerald-500 hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!userActivityAnswer.trim() || !socketRef.current?.connected || isActivitySubmitted}
            >
              {isActivitySubmitted ? '✅ ส่งคำตอบแล้ว' : '📤 ส่งคำตอบ'}
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => setShowActivityAnswer(!showActivityAnswer)}
            className="bg-gradient-to-r from-green-400 to-emerald-400 text-white font-semibold py-3 px-8 rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            {showActivityAnswer ? '🙈 ซ่อนคำตอบ' : '👀 ดูคำตอบทั้งคู่'}
          </button>
        </div>

        {showActivityAnswer && (
          <div className="mt-8 space-y-6 animate-fadeIn">
            <div className="text-center">
              <h4 className="text-xl font-bold text-black mb-4">🎯 คำตอบของทั้งคู่</h4>
            </div>
            
            {/* User's own activity answer */}
            {userActivityAnswer && (
              <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-2xl p-6 border-l-4 border-green-500">
                <div className="flex items-start space-x-3">
                  <div className="bg-green-500 rounded-full p-2">
                    <span className="text-white text-lg">👤</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-green-800 text-lg mb-2">{currentUser?.nickname} (คุณ)</h5>
                    <p className="text-green-700 text-lg leading-relaxed">{userActivityAnswer}</p>
                    {userFileUrl && (
                      <div className="mt-3">
                        {userFile?.type.startsWith('image/') ? (
                          <img src={userFileUrl} alt="User file" className="max-w-xs rounded-lg" />
                        ) : (
                          <a href={userFileUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 underline">
                            📎 ดูไฟล์ที่แนบ
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Partner's activity answer */}
            {partnerActivityAnswer ? (
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 border-l-4 border-yellow-500">
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-500 rounded-full p-2">
                    <span className="text-white text-lg">👤</span>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-yellow-800 text-lg mb-2">
                      {pair.user1.id === currentUser?.id ? pair.user2.nickname : pair.user1.nickname}
                      {(pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle) && (
                        <span className="text-sm text-yellow-600 ml-2">
                          📱 {pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle}
                        </span>
                      )}
                    </h5>
                    <p className="text-yellow-700 text-lg leading-relaxed">{partnerActivityAnswer}</p>
                    {partnerFileUrl && (
                      <div className="mt-3">
                        {partnerFileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img src={partnerFileUrl} alt="Partner's file" className="max-w-xs rounded-lg" onError={(e) => console.error('Image failed to load:', partnerFileUrl, e)} />
                        ) : (
                          <a href={partnerFileUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-600 underline">
                            📎 ดูไฟล์ที่แนบ
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-gray-700 text-lg">
                  {pair.user1.id === currentUser?.id ? pair.user2.nickname : pair.user1.nickname}
                  {(pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle) && (
                    <span className="text-sm text-gray-500 ml-2">
                      📱 {pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle}
                    </span>
                  )} ยังไม่ได้ส่งคำตอบ
                </p>
              </div>
            )}
          </div>
        )}

        
      </div>

      {/* Friend Request Section - Only show if both users are authenticated */}
      {isAuthenticated && authUser && (
        <FriendRequestSection 
          currentUser={currentUser}
          pair={pair}
          authUser={authUser}
        />
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onNewGame}
          className="bg-blue-400 text-white font-semibold py-4 px-8 rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
        >
          🔄 หาเพื่อนใหม่
        </button>
        {/* <button
          onClick={onLeave}
          className="bg-orange-400 text-white font-semibold py-3 px-8 rounded-lg hover:from-yellow-500 hover:to-orange-500 transition-all transform hover:scale-105"
        >
          🏠 กลับหน้าแรก
        </button> */}
      </div>
    </div>
  );
}

// Friend Request Section Component
function FriendRequestSection({ 
  currentUser, 
  pair, 
  authUser 
}: { 
  currentUser: User | null
  pair: Pair
  authUser: any
}) {
  const { sendFriendRequest } = useAuth()
  const [friendRequestStatus, setFriendRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Get the partner's user ID and nickname
  const partner = pair.user1.id === currentUser?.id ? pair.user2 : pair.user1
  const partnerId = partner.userId || partner.id // Use actual user ID if available, fallback to socket ID
  const partnerNickname = partner.nickname

  const handleSendFriendRequest = async () => {
    if (!currentUser || !authUser) return

    setFriendRequestStatus('sending')
    setErrorMessage('')

    try {
      // Use the actual user ID if available, otherwise fallback to socket ID
      const success = await sendFriendRequest(partnerId)
      
      if (success) {
        setFriendRequestStatus('sent')
      } else {
        setFriendRequestStatus('error')
        setErrorMessage('ไม่สามารถส่งคำขอเป็นเพื่อนได้')
      }
    } catch (error) {
      setFriendRequestStatus('error')
      setErrorMessage('เกิดข้อผิดพลาดในการส่งคำขอเป็นเพื่อน')
    }
  }

  return (
    <div className="bg-white backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white border-opacity-20">
      <div className="text-center mb-6">
        <div className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-4 mb-4">
          <div className="text-4xl">👥</div>
        </div>
        <h3 className="text-2xl font-bold text-black mb-2">
          เพิ่มเพื่อน
        </h3>
        <div className="w-24 h-1 bg-gradient-to-r from-pink-400 to-purple-400 mx-auto rounded-full"></div>
      </div>

      <div className="text-center">
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 mb-6 border border-pink-200">
          <p className="text-black text-lg mb-4">
            คุณสนุกกับการเล่นกับ <strong>{partnerNickname}</strong> หรือไม่?
          </p>
          <p className="text-gray-600 text-sm">
            เพิ่มเป็นเพื่อนเพื่อติดต่อกันได้ในอนาคต!
          </p>
        </div>

        {friendRequestStatus === 'idle' && (
          <button
            onClick={handleSendFriendRequest}
            className="bg-gradient-to-r from-pink-400 to-purple-400 text-white font-semibold py-3 px-8 rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            👥 ส่งคำขอเป็นเพื่อน
          </button>
        )}

        {friendRequestStatus === 'sending' && (
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
            <span className="text-black">กำลังส่งคำขอ...</span>
          </div>
        )}

        {friendRequestStatus === 'sent' && (
          <div className="bg-green-100 border border-green-300 rounded-xl p-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="text-green-600 text-2xl">✅</div>
              <span className="text-green-800 font-semibold">ส่งคำขอเป็นเพื่อนแล้ว!</span>
            </div>
            <p className="text-green-700 text-sm mt-2">
              รอให้ {partnerNickname} ยอมรับคำขอของคุณ
            </p>
          </div>
        )}

        {friendRequestStatus === 'error' && (
          <div className="bg-red-100 border border-red-300 rounded-xl p-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="text-red-600 text-2xl">❌</div>
              <span className="text-red-800 font-semibold">เกิดข้อผิดพลาด</span>
            </div>
            <p className="text-red-700 text-sm mt-2">
              {errorMessage}
            </p>
            <button
              onClick={() => setFriendRequestStatus('idle')}
              className="mt-3 text-red-600 hover:text-red-700 underline text-sm"
            >
              ลองใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

