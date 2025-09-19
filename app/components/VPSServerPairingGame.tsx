'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface User {
  id: string
  nickname: string
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
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [currentPair, setCurrentPair] = useState<Pair | null>(null)
  const [gamePhase, setGamePhase] = useState<'nickname' | 'waiting' | 'paired' | 'activity'>('nickname')
  const [waitingMessage, setWaitingMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const socketRef = useRef<Socket | null>(null)

  // Server URL
  const SERVER_URL = process.env.NODE_ENV === 'production' 
    ? 'https://api.ionize13.com'
    : 'http://localhost:3000'

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
      socketRef.current.emit('join-waiting', { nickname })
      setCurrentUser({
        id: socketRef.current.id,
        nickname,
        joinedAt: Date.now(),
        status: 'waiting',
        socketId: socketRef.current.id
      })
      setGamePhase('waiting')
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
          <NicknameInput onSubmit={handleNicknameSubmit} />
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
          />
        )}
      </div>
    </div>
  )
}

// Nickname Input Component
function NicknameInput({ onSubmit }: { onSubmit: (nickname: string) => void }) {
  const [nickname, setNickname] = useState('')

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
          ยินดีต้อนรับ!
        </h2>
        <p className="text-black opacity-80">
          กรอกชื่อเล่นของคุณเพื่อเริ่มต้น
        </p>
      </div>

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
          ห้องรอ
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
            onClick={onLeave}
            className="bg-red-400 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all"
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
            </div>

            <div className="text-4xl">🤗</div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">👤</div>
              <h3 className="font-semibold text-black text-lg">
                {pair.user2.nickname}
              </h3>
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
  socketRef
}: {
  pair: Pair;
  onNewGame: () => void;
  onLeave: () => void;
  currentUser: User | null;
  socketRef: React.MutableRefObject<Socket | null>;
}) {
  console.log('ActivityScreen props:', { pair, currentUser, socketRef });
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [partnerAnswer, setPartnerAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false); // Track submission status

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

    socket.on('receive-answer', handleReceiveAnswer);

    return () => {
      socket.off('receive-answer', handleReceiveAnswer);
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
  console.log(partnerAnswer)

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
          <div className="bg-white bg-opacity-20 rounded-full px-4 py-2">
            <span className="text-white font-semibold">👤 {pair.user1.nickname}</span>
          </div>
          <div className="text-2xl animate-bounce">🤗
          </div>
          <div className="bg-white bg-opacity-20 rounded-full px-4 py-2">
            <span className="text-white font-semibold">👤 {pair.user2.nickname}</span>
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
                    </h5>
                    <p className="text-yellow-700 text-lg leading-relaxed">{partnerAnswer}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-gray-700 text-lg">
                  {pair.user1.id === currentUser?.id ? pair.user2.nickname : pair.user1.nickname} ยังไม่ได้ส่งคำตอบ
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

        <div className="text-center">
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 border border-green-200">
            <div className="text-3xl mb-3">🎉</div>
            <p className="text-green-800 text-lg font-semibold">
              ทำกิจกรรมนี้ด้วยกันและสนุกไปกับเพื่อนใหม่!
            </p>
          </div>
        </div>
      </div>

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

