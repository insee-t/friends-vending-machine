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

  // Server URL - Update this to your VPS IP/domain
  const SERVER_URL = process.env.NODE_ENV === 'production' 
    ? 'https://ionize13.com' 
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
    if (socketRef.current) {
      socketRef.current.emit('join-waiting', { nickname })
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

        {gamePhase === 'activity' && currentPair && (
          <ActivityScreen 
            pair={currentPair}
            onNewGame={startNewGame}
            onLeave={leaveGame}
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
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">👋</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          ยินดีต้อนรับ!
        </h2>
        <p className="text-white opacity-80">
          กรอกชื่อเล่นของคุณเพื่อเริ่มต้น
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-10 text-white placeholder-white placeholder-opacity-60 focus:border-opacity-60 focus:outline-none text-center text-lg"
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
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="text-6xl mb-6">⏳</div>
        <h2 className="text-2xl font-bold text-white mb-4">
          ห้องรอ
        </h2>
        <p className="text-lg text-white opacity-80 mb-6">
          {waitingMessage}
        </p>

        {/* Current User */}
        <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-white text-lg">
            คุณ: {currentUser?.nickname || 'กำลังเชื่อมต่อ...'}
          </h3>
          <p className="text-white opacity-80">
            กำลังรอเพื่อนใหม่... ({waitingUsers.length} คนในห้องรอ)
          </p>
        </div>

        {/* Other Users */}
        {otherWaitingUsers.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-white font-semibold">ผู้เข้าร่วมคนอื่น:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherWaitingUsers.map(user => (
                <div key={user.id} className="bg-white bg-opacity-20 rounded-lg p-3">
                  <span className="text-white font-medium">
                    {user.nickname}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-400 bg-opacity-20 rounded-lg p-4 mb-6">
          <p className="text-blue-200 text-sm">
            💡 <strong>วิธีทดสอบ:</strong> เปิดเว็บไซต์นี้บนอุปกรณ์อื่นหรือให้เพื่อนเปิดเว็บไซต์เดียวกัน 
            กรอกชื่อเล่นแล้วรอในห้องรอ จะมีการจับคู่อัตโนมัติ!
          </p>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-400 bg-opacity-20 rounded-lg p-4 mb-6">
          <p className="text-gray-200 text-xs">
            <strong>Debug:</strong> Total users: {allUsers.length}, Waiting: {waitingUsers.length}
          </p>
          <p className="text-gray-200 text-xs mt-1">
            <strong>Users:</strong> {allUsers.map(u => `${u.nickname}(${u.status})`).join(', ')}
          </p>
          <p className="text-gray-200 text-xs mt-1">
            <strong>Connection:</strong> {connectionStatus}
          </p>
        </div>

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
            className="bg-red-400 bg-opacity-20 text-red-200 px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all"
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
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-6">
          พบเพื่อนใหม่แล้ว!
        </h2>

        <div className="space-y-6">
          {/* Users */}
          <div className="flex justify-center items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">👤</div>
              <h3 className="font-semibold text-white text-lg">
                {pair.user1.nickname}
              </h3>
            </div>

            <div className="text-4xl">💕</div>

            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">👤</div>
              <h3 className="font-semibold text-white text-lg">
                {pair.user2.nickname}
              </h3>
            </div>
          </div>

          <div className="bg-yellow-400 bg-opacity-20 rounded-lg p-4">
            <p className="text-yellow-200 text-lg">
              กำลังเตรียมกิจกรรมสนุกๆ ให้คุณ...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Activity Screen Component
function ActivityScreen({ 
  pair, 
  onNewGame,
  onLeave
}: { 
  pair: Pair
  onNewGame: () => void
  onLeave: () => void
}) {
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          🎪 กิจกรรมสนุกๆ
        </h2>
        <p className="text-lg text-white opacity-80">
          {pair.user1.nickname} และ {pair.user2.nickname}
        </p>
      </div>

      {/* Question Card */}
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">❓</div>
          <h3 className="text-xl font-semibold text-white mb-4">
            คำถามละลายน้ำแข็ง
          </h3>
        </div>

        <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-6">
          <p className="text-white text-lg text-center">
            {pair.question}
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-105"
          >
            {showAnswer ? 'ซ่อนคำตอบ' : 'ดูคำตอบ'} 👀
          </button>
        </div>

        {showAnswer && (
          <div className="mt-6 bg-yellow-400 bg-opacity-20 rounded-lg p-4">
            <p className="text-yellow-200 text-center">
              💡 ลองตอบคำถามนี้ด้วยกันและฟังคำตอบของกันและกัน!
            </p>
          </div>
        )}
      </div>

      {/* Activity Card */}
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-white mb-4">
            กิจกรรมสนุก
          </h3>
        </div>

        <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-6">
          <p className="text-white text-lg text-center">
            {pair.activity}
          </p>
        </div>

        <div className="text-center">
          <div className="bg-green-400 bg-opacity-20 rounded-lg p-4 mb-4">
            <p className="text-green-200">
              🎉 ทำกิจกรรมนี้ด้วยกันและสนุกไปกับเพื่อนใหม่!
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onNewGame}
          className="bg-gradient-to-r from-blue-400 to-purple-400 text-white font-semibold py-3 px-8 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all transform hover:scale-105"
        >
          🔄 หาเพื่อนใหม่
        </button>
        
        <button
          onClick={onLeave}
          className="bg-gradient-to-r from-gray-400 to-gray-600 text-white font-semibold py-3 px-8 rounded-lg hover:from-gray-500 hover:to-gray-700 transition-all transform hover:scale-105"
        >
          🏠 กลับหน้าแรก
        </button>
      </div>
    </div>
  )
}
