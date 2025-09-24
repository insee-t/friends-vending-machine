'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

interface User {
  id: string
  userId?: string | null
  nickname: string
  socialMediaHandle?: string | null
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
  questions: string[]
  type: 'pair'
  createdAt: number
}

interface Group {
  id: string
  members: User[]
  questions: string[]
  type: 'group'
  createdAt: number
}

export default function VPSServerPairingGame() {
  const { user: authUser, isAuthenticated } = useAuth()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [currentPair, setCurrentPair] = useState<Pair | null>(null)
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null)
  const [gamePhase, setGamePhase] = useState<'nickname' | 'waiting' | 'paired' | 'activity'>('nickname')
  const [waitingMessage, setWaitingMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [userManuallyLeft, setUserManuallyLeft] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // Server URL
  const SERVER_URL = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
    ? 'https://api.ionize13.com'
    : 'http://localhost:3000'

  const handleNicknameSubmit = useCallback((nickname: string, socialMediaHandle?: string) => {
    if (socketRef.current && nickname.trim() && socketRef.current.id) {
      const user = {
        id: socketRef.current.id,
        nickname: nickname.trim(),
        socialMediaHandle: socialMediaHandle || null,
        joinedAt: Date.now(),
        status: 'waiting' as const,
        socketId: socketRef.current.id
      }
      
      setCurrentUser(user)
      setGamePhase('waiting')
      
      // Send user data to server
      socketRef.current.emit('join-waiting', {
        nickname: nickname.trim(),
        socialMediaHandle: socialMediaHandle || null,
        userId: isAuthenticated ? authUser?.id : null
      })
    }
  }, [isAuthenticated, authUser])

  // Auto-login with authenticated user's nickname
  useEffect(() => {
    if (isAuthenticated && authUser && connectionStatus === 'connected' && gamePhase === 'nickname' && !userManuallyLeft) {
      try {
        // Automatically use the logged-in user's nickname and social media handle
        handleNicknameSubmit(authUser.nickname, authUser.socialMediaHandle)
      } catch (error) {
        console.error('Auto-login error:', error)
        // If auto-login fails, just continue with manual nickname input
      }
    }
  }, [isAuthenticated, authUser, connectionStatus, gamePhase, userManuallyLeft, handleNicknameSubmit])

  // Initialize socket connection
  useEffect(() => {
    try {
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

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        setConnectionStatus('disconnected')
      })

      socket.on('users-updated', (data) => {
        setAllUsers(data.users)
      })

      socket.on('user-paired', (data) => {
        if (data.pair) {
          setCurrentPair(data.pair)
          setCurrentGroup(null)
        } else if (data.group) {
          setCurrentGroup(data.group)
          setCurrentPair(null)
        }
        setGamePhase('paired')
        setTimeout(() => {
          setGamePhase('activity')
        }, 3000)
      })

      return () => {
        socket.disconnect()
      }
    } catch (error) {
      console.error('Socket initialization error:', error)
      setConnectionStatus('disconnected')
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
            🎯 ตู้ขายเพื่อน
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

        {gamePhase === 'paired' && (currentPair || currentGroup) && (
          <PairingResult pair={currentPair} group={currentGroup} />
        )}

        {gamePhase === 'activity' && (currentPair || currentGroup) && socketRef.current && (
          <ActivityScreen 
            pair={currentPair}
            group={currentGroup}
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
  onSubmit: (nickname: string, socialMediaHandle?: string) => void
  isAuthenticated: boolean
  authUser: any
  userManuallyLeft: boolean
  onBackToHome: () => void
}) {
  const [nickname, setNickname] = useState('')
  const [socialMediaHandle, setSocialMediaHandle] = useState('')
  const [useCustomName, setUseCustomName] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (nickname.trim()) {
      onSubmit(nickname.trim(), socialMediaHandle.trim() || undefined)
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
                {authUser?.socialMediaHandle && (
                  <p className="text-sm text-blue-700">📱 {authUser.socialMediaHandle}</p>
                )}
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

          <div>
            <input
              type="text"
              value={socialMediaHandle}
              onChange={(e) => setSocialMediaHandle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-10 text-black placeholder-black placeholder-opacity-60 focus:border-opacity-60 focus:outline-none text-center text-lg"
              placeholder="IG / Facebook (ไม่บังคับ)"
              maxLength={100}
            />
            <p className="text-xs text-black opacity-60 mt-1 text-center">
              เช่น @username หรือ username
            </p>
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
  connectionStatus: string
}) {
  const otherWaitingUsers = allUsers.filter(user => user.id !== currentUser?.id)

  return (
    <div className="bg-white backdrop-blur-lg rounded-2xl p-8 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold text-black mb-2">กำลังหาคู่ให้คุณ</h2>
        <p className="text-black opacity-80">{waitingMessage}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - User Info */}
        <div className="space-y-6">
          {/* Current User */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {currentUser?.nickname?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-blue-900">{currentUser?.nickname}</p>
                {currentUser?.socialMediaHandle && (
                  <p className="text-sm text-blue-700">📱 {currentUser.socialMediaHandle}</p>
                )}
                <p className="text-sm text-blue-700">คุณ</p>
              </div>
            </div>
          </div>

          {/* Other Waiting Users */}
          {otherWaitingUsers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-black mb-3 text-center">
                คนอื่นๆ ที่กำลังรอ ({otherWaitingUsers.length} คน)
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {otherWaitingUsers.map(user => (
                  <div key={user.id} className="bg-white bg-opacity-20 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {user.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-black font-medium">
                          {user.nickname}
                        </span>
                        {user.socialMediaHandle && (
                          <p className="text-xs text-gray-600">📱 {user.socialMediaHandle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Status */}
          <div className="text-center">
            <div className={`inline-block px-4 py-2 rounded-lg ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {connectionStatus === 'connected' ? '🟢 เชื่อมต่อแล้ว' :
               connectionStatus === 'connecting' ? '🟡 กำลังเชื่อมต่อ...' :
               '🔴 เชื่อมต่อไม่ได้'}
            </div>
          </div>

          {/* Leave Button */}
          <div className="text-center">
            <button
              onClick={onLeave}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              ออกจากเกม
            </button>
          </div>
        </div>

        {/* Right Column - Minigames */}
        <div className="space-y-6">
          <WaitingRoomMinigames />
        </div>
      </div>
    </div>
  )
}

// Waiting Room Minigames Component
function WaitingRoomMinigames() {
  const [activeGame, setActiveGame] = useState<'menu' | 'reaction' | 'memory' | 'typing' | 'facts'>('menu')
  
  return (
    <div className="bg-white bg-opacity-10 rounded-2xl p-6">
      <h3 className="text-xl font-bold text-black mb-4 text-center">🎮 minigame ระหว่างรอ</h3>
      
      {activeGame === 'menu' && (
        <div className="space-y-3">
          <button
            onClick={() => setActiveGame('reaction')}
            className="w-full bg-gradient-to-r from-red-400 to-pink-400 text-white font-semibold py-3 px-4 rounded-lg hover:from-red-500 hover:to-pink-500 transition-all transform hover:scale-105"
          >
            ⚡ ทดสอบความเร็ว
          </button>
          <button
            onClick={() => setActiveGame('memory')}
            className="w-full bg-gradient-to-r from-blue-400 to-purple-400 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all transform hover:scale-105"
          >
            🧠 เกมความจำ
          </button>
          <button
            onClick={() => setActiveGame('typing')}
            className="w-full bg-gradient-to-r from-green-400 to-teal-400 text-white font-semibold py-3 px-4 rounded-lg hover:from-green-500 hover:to-teal-500 transition-all transform hover:scale-105"
          >
            ⌨️ ทดสอบการพิมพ์
          </button>
          <button
            onClick={() => setActiveGame('facts')}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-semibold py-3 px-4 rounded-lg hover:from-yellow-500 hover:to-orange-500 transition-all transform hover:scale-105"
          >
            📚 ความรู้สนุกๆ
          </button>
        </div>
      )}
      
      {activeGame === 'reaction' && <ReactionTimeGame onBack={() => setActiveGame('menu')} />}
      {activeGame === 'memory' && <MemoryGame onBack={() => setActiveGame('menu')} />}
      {activeGame === 'typing' && <TypingGame onBack={() => setActiveGame('menu')} />}
      {activeGame === 'facts' && <FunFacts onBack={() => setActiveGame('menu')} />}
    </div>
  )
}

// Reaction Time Game
function ReactionTimeGame({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<'waiting' | 'ready' | 'click' | 'result'>('waiting')
  const [startTime, setStartTime] = useState<number>(0)
  const [reactionTime, setReactionTime] = useState<number>(0)
  const [bestTime, setBestTime] = useState<number>(0)
  const [attempts, setAttempts] = useState<number>(0)

  const startGame = () => {
    setGameState('waiting')
    setAttempts(prev => prev + 1)
    
    // Random delay between 1-4 seconds
    const delay = Math.random() * 3000 + 1000
    setTimeout(() => {
      setGameState('ready')
      setStartTime(Date.now())
    }, delay)
  }

  const handleClick = () => {
    if (gameState === 'ready') {
      const time = Date.now() - startTime
      setReactionTime(time)
      setGameState('result')
      
      if (bestTime === 0 || time < bestTime) {
        setBestTime(time)
      }
    } else if (gameState === 'waiting') {
      // Too early!
      setGameState('result')
      setReactionTime(-1)
    }
  }

  const resetGame = () => {
    setGameState('waiting')
    setReactionTime(0)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-black">⚡ ทดสอบความเร็ว</h4>
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          ← กลับ
        </button>
      </div>
      
      <div className="text-center">
        <button
          onClick={handleClick}
          disabled={gameState === 'waiting'}
          className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-300 ${
            gameState === 'waiting' ? 'bg-gray-400 cursor-not-allowed' :
            gameState === 'ready' ? 'bg-green-500 animate-pulse cursor-pointer hover:scale-105' :
            'bg-blue-500 cursor-pointer'
          }`}
        >
          {gameState === 'waiting' && 'รอ...'}
          {gameState === 'ready' && 'คลิก!'}
          {gameState === 'result' && reactionTime > 0 && `${reactionTime}ms`}
          {gameState === 'result' && reactionTime < 0 && 'เร็วเกิน!'}
        </button>
      </div>
      
      <div className="text-center space-y-2">
        {gameState === 'waiting' && (
          <button
            onClick={startGame}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            เริ่มเกม
          </button>
        )}
        
        {gameState === 'ready' && (
          <div className="text-green-600 font-semibold">
            คลิกเมื่อกล่องเปลี่ยนเป็นสีเขียว!
          </div>
        )}
        
        {gameState === 'result' && (
          <div className="space-y-2">
            <div className="text-lg">
              {reactionTime > 0 ? (
                <span className="text-green-600">เวลาตอบสนอง: {reactionTime}ms</span>
              ) : (
                <span className="text-red-600">คลิกเร็วเกินไป!</span>
              )}
            </div>
            {bestTime > 0 && (
              <div className="text-sm text-gray-600">
                เวลาดีที่สุด: {bestTime}ms
              </div>
            )}
            <div className="flex justify-center space-x-2">
              <button
                onClick={resetGame}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                ลองใหม่
              </button>
              <button
                onClick={startGame}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                เกมใหม่
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Memory Game
function MemoryGame({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<'waiting' | 'showing' | 'guessing' | 'result'>('waiting')
  const [sequence, setSequence] = useState<string[]>([])
  const [userSequence, setUserSequence] = useState<string[]>([])
  const [currentLevel, setCurrentLevel] = useState<number>(1)
  const [score, setScore] = useState<number>(0)

  const colors = ['🔴', '🟡', '🟢', '🔵']
  const [highlightedColor, setHighlightedColor] = useState<string>('')

  const startGame = () => {
    const newSequence = Array.from({ length: currentLevel }, () => 
      colors[Math.floor(Math.random() * colors.length)]
    )
    setSequence(newSequence)
    setUserSequence([])
    setGameState('showing')
    showSequence(newSequence, 0)
  }

  const showSequence = (seq: string[], index: number) => {
    if (index >= seq.length) {
      setGameState('guessing')
      setHighlightedColor('')
      return
    }
    
    setHighlightedColor(seq[index])
    setTimeout(() => {
      setHighlightedColor('')
      setTimeout(() => {
        showSequence(seq, index + 1)
      }, 200)
    }, 600)
  }

  const handleColorClick = (color: string) => {
    if (gameState !== 'guessing') return
    
    const newUserSequence = [...userSequence, color]
    setUserSequence(newUserSequence)
    
    if (newUserSequence.length === sequence.length) {
      if (JSON.stringify(newUserSequence) === JSON.stringify(sequence)) {
        setScore(score + currentLevel)
        setCurrentLevel(currentLevel + 1)
        setGameState('result')
      } else {
        setGameState('result')
      }
    }
  }

  const resetGame = () => {
    setCurrentLevel(1)
    setScore(0)
    setSequence([])
    setUserSequence([])
    setGameState('waiting')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-black">🧠 เกมความจำ</h4>
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          ← กลับ
        </button>
      </div>
      
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-2">
          ระดับ: {currentLevel} | คะแนน: {score}
        </div>
        
        {gameState === 'waiting' && (
          <button
            onClick={startGame}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            เริ่มเกม
          </button>
        )}
        
        {gameState === 'showing' && (
          <div className="text-lg text-blue-600">
            จำลำดับสีที่แสดง
          </div>
        )}
        
        {gameState === 'guessing' && (
          <div className="text-lg text-green-600">
            คลิกตามลำดับที่จำได้
          </div>
        )}
        
        {gameState === 'result' && (
          <div className="text-lg">
            {userSequence.length === sequence.length && 
             JSON.stringify(userSequence) === JSON.stringify(sequence) ? (
              <span className="text-green-600">ถูกต้อง! ไประดับต่อไป</span>
            ) : (
              <span className="text-red-600">ผิด! เกมจบ</span>
            )}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => handleColorClick(color)}
            disabled={gameState !== 'guessing'}
            className={`w-16 h-16 text-2xl rounded-lg transition-all duration-200 ${
              highlightedColor === color 
                ? 'scale-110 shadow-lg' 
                : gameState === 'guessing'
                ? 'hover:scale-105 hover:shadow-md'
                : 'opacity-50'
            }`}
          >
            {color}
          </button>
        ))}
      </div>
      
      {gameState === 'result' && (
        <div className="text-center space-x-2">
          <button
            onClick={resetGame}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            เริ่มใหม่
          </button>
          {userSequence.length === sequence.length && 
           JSON.stringify(userSequence) === JSON.stringify(sequence) && (
            <button
              onClick={startGame}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              ระดับต่อไป
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Typing Game
function TypingGame({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'result'>('waiting')
  const [currentText, setCurrentText] = useState<string>('')
  const [userInput, setUserInput] = useState<string>('')
  const [startTime, setStartTime] = useState<number>(0)
  const [wpm, setWpm] = useState<number>(0)
  const [accuracy, setAccuracy] = useState<number>(0)

  const texts = [
    "สวัสดีครับ ยินดีที่ได้รู้จัก",
    "วันนี้อากาศดีมากเลยนะ",
    "คุณชอบกินอะไรเป็นพิเศษ",
    "ประเทศไทยสวยมากจริงๆ",
    "มาเล่นเกมสนุกๆ กันเถอะ"
  ]

  const startGame = () => {
    const randomText = texts[Math.floor(Math.random() * texts.length)]
    setCurrentText(randomText)
    setUserInput('')
    setGameState('playing')
    setStartTime(Date.now())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setUserInput(input)
    
    if (input === currentText) {
      const endTime = Date.now()
      const timeInMinutes = (endTime - startTime) / 60000
      const words = currentText.split(' ').length
      const calculatedWpm = Math.round(words / timeInMinutes)
      
      // Calculate accuracy
      let correctChars = 0
      for (let i = 0; i < Math.min(input.length, currentText.length); i++) {
        if (input[i] === currentText[i]) correctChars++
      }
      const calculatedAccuracy = Math.round((correctChars / currentText.length) * 100)
      
      setWpm(calculatedWpm)
      setAccuracy(calculatedAccuracy)
      setGameState('result')
    }
  }

  const resetGame = () => {
    setGameState('waiting')
    setUserInput('')
    setWpm(0)
    setAccuracy(0)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-black">⌨️ ทดสอบการพิมพ์</h4>
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          ← กลับ
        </button>
      </div>
      
      {gameState === 'waiting' && (
        <div className="text-center">
          <button
            onClick={startGame}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            เริ่มทดสอบ
          </button>
        </div>
      )}
      
      {gameState === 'playing' && (
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-lg text-gray-800 leading-relaxed">{currentText}</p>
          </div>
          <input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-lg"
            placeholder="พิมพ์ข้อความข้างบนที่นี่..."
            autoFocus
          />
          <div className="text-sm text-gray-600 text-center">
            ความยาว: {userInput.length}/{currentText.length}
          </div>
        </div>
      )}
      
      {gameState === 'result' && (
        <div className="text-center space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h5 className="text-lg font-bold text-green-800 mb-2">ผลการทดสอบ</h5>
            <div className="space-y-1">
              <div className="text-green-700">ความเร็ว: {wpm} คำ/นาที</div>
              <div className="text-green-700">ความแม่นยำ: {accuracy}%</div>
            </div>
          </div>
          <button
            onClick={resetGame}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            ทดสอบใหม่
          </button>
        </div>
      )}
    </div>
  )
}

// Fun Facts Component
function FunFacts({ onBack }: { onBack: () => void }) {
  const [currentFactIndex, setCurrentFactIndex] = useState<number>(0)
  
  const facts = [
    "🐙 ปลาหมึกยักษ์มี 3 หัวใจ!",
    "🌙 ดวงจันทร์กำลังเคลื่อนห่างจากโลกปีละ 3.8 เซนติเมตร",
    "🦒 ยีราฟสามารถอยู่ได้โดยไม่ดื่มน้ำนานถึง 3 สัปดาห์",
    "🐝 ผึ้งต้องบินไป 90,000 ไมล์เพื่อผลิตน้ำผึ้ง 1 ปอนด์",
    "🧠 สมองมนุษย์มีน้ำหนักประมาณ 1.4 กิโลกรัม",
    "🌊 มหาสมุทรแปซิฟิกกว้างกว่าดวงจันทร์ถึง 2 เท่า",
    "🐧 เพนกวินจักรพรรดิสามารถดำน้ำได้ลึกถึง 500 เมตร",
    "🌍 โลกหมุนรอบตัวเองด้วยความเร็ว 1,000 ไมล์ต่อชั่วโมง",
    "🦋 ผีเสื้อมีรสชาติด้วยเท้า",
    "⚡ ฟ้าผ่ามีอุณหภูมิสูงกว่าพื้นผิวของดวงอาทิตย์ถึง 5 เท่า"
  ]

  const nextFact = () => {
    setCurrentFactIndex((prev) => (prev + 1) % facts.length)
  }

  const prevFact = () => {
    setCurrentFactIndex((prev) => (prev - 1 + facts.length) % facts.length)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-black">📚 ความรู้สนุกๆ</h4>
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          ← กลับ
        </button>
      </div>
      
      <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-lg text-center">
        <div className="text-4xl mb-4">🤓</div>
        <p className="text-lg text-gray-800 leading-relaxed mb-4">
          {facts[currentFactIndex]}
        </p>
        <div className="text-sm text-gray-600 mb-4">
          {currentFactIndex + 1} / {facts.length}
        </div>
        <div className="flex justify-center space-x-2">
          <button
            onClick={prevFact}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← ก่อนหน้า
          </button>
          <button
            onClick={nextFact}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            ถัดไป →
          </button>
        </div>
      </div>
      
      <div className="text-center">
        <button
          onClick={() => setCurrentFactIndex(Math.floor(Math.random() * facts.length))}
          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          🎲 ข้อความสุ่ม
        </button>
      </div>
    </div>
  )
}

// Pairing Result Component
function PairingResult({ pair, group }: { pair: Pair | null, group: Group | null }) {
  if (pair) {
    return (
      <div className="bg-white backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-black mb-2">พบคู่แล้ว!</h2>
          <p className="text-black opacity-80">คุณได้คู่แล้ว กำลังเตรียมความสนุกให้คุณ...</p>
        </div>

        <div className="flex justify-center space-x-8">
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">👤</div>
            <h3 className="font-semibold text-black text-lg">
              {pair.user1.nickname}
            </h3>
            {pair.user1.socialMediaHandle && (
              <p className="text-sm text-gray-600">📱 {pair.user1.socialMediaHandle}</p>
            )}
          </div>

          <div className="text-4xl self-center">🤝</div>

          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">👤</div>
            <h3 className="font-semibold text-black text-lg">
              {pair.user2.nickname}
            </h3>
            {pair.user2.socialMediaHandle && (
              <p className="text-sm text-gray-600">📱 {pair.user2.socialMediaHandle}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (group) {
    return (
      <div className="bg-white backdrop-blur-lg rounded-2xl p-8 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-black mb-2">พบกลุ่มแล้ว!</h2>
          <p className="text-black opacity-80">คุณได้เข้ากลุ่มแล้ว กำลังเตรียมความสนุกให้คุณ...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {group.members.map((member, index) => (
            <div key={member.id} className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">👤</div>
              <h3 className="font-semibold text-black text-lg">
                {member.nickname}
              </h3>
              {member.socialMediaHandle && (
                <p className="text-sm text-gray-600">📱 {member.socialMediaHandle}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

// Activity Screen Component
function ActivityScreen({ 
  pair, 
  group,
  onNewGame, 
  onLeave, 
  currentUser, 
  socketRef, 
  isAuthenticated, 
  authUser 
}: {
  pair: Pair | null
  group: Group | null
  onNewGame: () => void
  onLeave: () => void
  currentUser: User | null
  socketRef: React.RefObject<Socket>
  isAuthenticated: boolean
  authUser: any
}) {
  const [userAnswers, setUserAnswers] = useState<string[]>(new Array(6).fill(''))
  const [partnerAnswers, setPartnerAnswers] = useState<{[userId: string]: string[]}>({})
  const [userActivityAnswer, setUserActivityAnswer] = useState('')
  const [partnerActivityAnswers, setPartnerActivityAnswers] = useState<{[userId: string]: {answer: string, fileUrl?: string}}>({})
  const [partnerFileUrl, setPartnerFileUrl] = useState<string | null>(null)
  const [currentPhase, setCurrentPhase] = useState<'question' | 'activity'>('question')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false)
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean[]>(new Array(6).fill(false))
  const [activitySubmitted, setActivitySubmitted] = useState(false)
  const { sendFriendRequest } = useAuth()
  const [friendRequestStatus, setFriendRequestStatus] = useState<{[userId: string]: 'idle' | 'sending' | 'sent' | 'error'}>({})
  const [errorMessages, setErrorMessages] = useState<{[userId: string]: string}>({})

  // Early return if no pair or group
  if (!pair && !group) {
    return null
  }

  // Helper function to get questions
  const getQuestions = () => {
    if (pair) return pair.questions || [pair.question]
    if (group) return group.questions
    return []
  }

  const questions = getQuestions()

  // Get the partner's user ID and nickname (for pairs only)
  const partner = pair ? (pair.user1.id === currentUser?.id ? pair.user2 : pair.user1) : null
  const partnerId = partner?.userId || partner?.id // Use actual user ID if available, fallback to socket ID
  const partnerNickname = partner?.nickname

  // Helper function to get partner answers for current question
  const getPartnerAnswersForCurrentQuestion = () => {
    const answers: {userId: string, nickname: string, answer: string, socialMediaHandle?: string}[] = []
    
    if (pair) {
      const partner = pair.user1.id === currentUser?.id ? pair.user2 : pair.user1
      const partnerAnswer = partnerAnswers[partner.id]?.[currentQuestionIndex]
      if (partnerAnswer) {
        answers.push({
          userId: partner.id,
          nickname: partner.nickname,
          answer: partnerAnswer,
          socialMediaHandle: partner.socialMediaHandle || undefined
        })
      }
    } else if (group) {
      const otherMembers = group.members.filter(member => member.id !== currentUser?.id)
      otherMembers.forEach(member => {
        const memberAnswer = partnerAnswers[member.id]?.[currentQuestionIndex]
        if (memberAnswer) {
          answers.push({
            userId: member.id,
            nickname: member.nickname,
            answer: memberAnswer,
            socialMediaHandle: member.socialMediaHandle || undefined
          })
        }
      })
    }
    
    return answers
  }

  // Helper function to get partner activity answers
  const getPartnerActivityAnswers = () => {
    const answers: {userId: string, nickname: string, answer: string, fileUrl?: string, socialMediaHandle?: string}[] = []
    
    if (pair) {
      const partner = pair.user1.id === currentUser?.id ? pair.user2 : pair.user1
      const partnerActivity = partnerActivityAnswers[partner.id]
      if (partnerActivity) {
        answers.push({
          userId: partner.id,
          nickname: partner.nickname,
          answer: partnerActivity.answer,
          fileUrl: partnerActivity.fileUrl,
          socialMediaHandle: partner.socialMediaHandle || undefined
        })
      }
    } else if (group) {
      const otherMembers = group.members.filter(member => member.id !== currentUser?.id)
      otherMembers.forEach(member => {
        const memberActivity = partnerActivityAnswers[member.id]
        if (memberActivity) {
          answers.push({
            userId: member.id,
            nickname: member.nickname,
            answer: memberActivity.answer,
            fileUrl: memberActivity.fileUrl,
            socialMediaHandle: member.socialMediaHandle || undefined
          })
        }
      })
    }
    
    return answers
  }

  const handleSendFriendRequest = async (targetUserId?: string) => {
    if (!isAuthenticated || !authUser) {
      alert('กรุณาเข้าสู่ระบบก่อนเพิ่มเพื่อน')
      return
    }
    if (!currentUser || !authUser) return

    const userIdToSend = targetUserId || partnerId
    if (!userIdToSend) {
      setFriendRequestStatus(prev => ({ ...prev, [userIdToSend as string]: 'error' }))
      setErrorMessages(prev => ({ ...prev, [userIdToSend as string]: 'ไม่พบข้อมูลผู้ใช้' }))
      return
    }

    setFriendRequestStatus(prev => ({ ...prev, [userIdToSend]: 'sending' }))
    setErrorMessages(prev => ({ ...prev, [userIdToSend]: '' }))

    try {
      // Use the actual user ID if available, otherwise fallback to socket ID
      console.log('Sending friend request to user:', {
        targetUserId: userIdToSend,
        currentUserId: authUser.id
      })
      const success = await sendFriendRequest(userIdToSend)
      
      if (success) {
        setFriendRequestStatus(prev => ({ ...prev, [userIdToSend]: 'sent' }))
      } else {
        setFriendRequestStatus(prev => ({ ...prev, [userIdToSend]: 'error' }))
        setErrorMessages(prev => ({ ...prev, [userIdToSend]: 'ไม่สามารถส่งคำขอเป็นเพื่อนได้' }))
      }
    } catch (error) {
      setFriendRequestStatus(prev => ({ ...prev, [userIdToSend]: 'error' }))
      setErrorMessages(prev => ({ ...prev, [userIdToSend]: 'เกิดข้อผิดพลาดในการส่งคำขอเป็นเพื่อน' }))
    }
  }

  useEffect(() => {
    if (!socketRef.current) return

    const socket = socketRef.current

    const handleReceiveAnswer = (data: { userId: string, answer: string, questionIndex: number }) => {
      if (data.userId !== currentUser?.id) {
        setPartnerAnswers(prev => {
          const newAnswers = { ...prev }
          if (!newAnswers[data.userId]) {
            newAnswers[data.userId] = new Array(6).fill('')
          }
          newAnswers[data.userId][data.questionIndex] = data.answer
          return newAnswers
        })
        // Show notification that partner's answer was received
        console.log('Partner answer received!')
      }
    }

    const handleReceiveActivityAnswer = (data: { userId: string, answer: string, fileUrl?: string }) => {
      if (data.userId !== currentUser?.id) {
        setPartnerActivityAnswers(prev => ({
          ...prev,
          [data.userId]: {
            answer: data.answer,
            fileUrl: data.fileUrl
          }
        }))
        // Show notification that partner's activity was received
        console.log('Partner activity received!')
      }
    }

    socket.on('receive-answer', handleReceiveAnswer)
    socket.on('receive-activity-answer', handleReceiveActivityAnswer)

    return () => {
      socket.off('receive-answer', handleReceiveAnswer)
      socket.off('receive-activity-answer', handleReceiveActivityAnswer)
    }
  }, [currentUser, socketRef])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'

      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        return data.fileUrl
      }
      return null
    } catch (error) {
      console.error('Upload error:', error)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const submitAnswer = () => {
    if (socketRef.current && userAnswers[currentQuestionIndex].trim()) {
      setIsSubmittingAnswer(true)
      socketRef.current.emit('submit-answer', {
        pairId: pair?.id || group?.id,
        userId: currentUser?.id,
        answer: userAnswers[currentQuestionIndex].trim(),
        questionIndex: currentQuestionIndex
      })
      
      // Simulate submission delay and then show success
      setTimeout(() => {
        setIsSubmittingAnswer(false)
        setAnswerSubmitted(prev => {
          const newSubmitted = [...prev]
          newSubmitted[currentQuestionIndex] = true
          return newSubmitted
        })
      }, 1000)
    }
  }

  const submitActivityAnswer = async () => {
    if (socketRef.current && userActivityAnswer.trim()) {
      setIsSubmittingActivity(true)
      
      let uploadedFileUrl = null
      if (file) {
        uploadedFileUrl = await uploadFile()
        if (uploadedFileUrl) {
          setFileUrl(uploadedFileUrl)
        }
      }

      socketRef.current.emit('submit-activity-answer', {
        pairId: pair?.id || group?.id,
        userId: currentUser?.id,
        answer: userActivityAnswer.trim(),
        fileUrl: uploadedFileUrl
      })
      
      // Simulate submission delay and then show success
      setTimeout(() => {
        setIsSubmittingActivity(false)
        setActivitySubmitted(true)
      }, 1000)
    }
  }

  const getPartnerName = () => {
    if (pair) {
      return pair.user1.id === currentUser?.id ? pair.user2.nickname : pair.user1.nickname
    }
    if (group) {
      const otherMembers = group.members.filter(member => member.id !== currentUser?.id)
      return otherMembers.length > 0 ? otherMembers.map(m => m.nickname).join(', ') : 'สมาชิกกลุ่ม'
    }
    return 'เพื่อน'
  }

  const getPartnerSocialMediaHandle = () => {
    if (pair) {
      return pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle
    }
    if (group) {
      const otherMembers = group.members.filter(member => member.id !== currentUser?.id)
      const handles = otherMembers
        .filter(member => member.socialMediaHandle)
        .map(member => `${member.nickname}: ${member.socialMediaHandle}`)
      return handles.length > 0 ? handles.join('\n') : null
    }
    return null
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < 5) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const canProceedToActivity = () => {
    if (!userAnswers.every(answer => answer.trim() !== '')) {
      return false
    }
    
    if (pair) {
      const partner = pair.user1.id === currentUser?.id ? pair.user2 : pair.user1
      const partnerAnswersList = partnerAnswers[partner.id] || []
      return partnerAnswersList.every(answer => answer.trim() !== '')
    } else if (group) {
      const otherMembers = group.members.filter(member => member.id !== currentUser?.id)
      return otherMembers.every(member => {
        const memberAnswers = partnerAnswers[member.id] || []
        return memberAnswers.every(answer => answer.trim() !== '')
      })
    }
    
    return false
  }

  const hasAllPartnersAnsweredQuestion = (questionIndex: number) => {
    if (pair) {
      const partner = pair.user1.id === currentUser?.id ? pair.user2 : pair.user1
      const partnerAnswersList = partnerAnswers[partner.id] || []
      return partnerAnswersList[questionIndex] && partnerAnswersList[questionIndex].trim() !== ''
    } else if (group) {
      const otherMembers = group.members.filter(member => member.id !== currentUser?.id)
      return otherMembers.every(member => {
        const memberAnswers = partnerAnswers[member.id] || []
        return memberAnswers[questionIndex] && memberAnswers[questionIndex].trim() !== ''
      })
    }
    return false
  }




  return (
    
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white backdrop-blur-lg rounded-2xl p-6 text-center">
        <h2 className="text-2xl font-bold text-black mb-4">
          {currentPhase === 'question' ? 'คำถาม' : 'ข้อมูลติดต่อ'}
        </h2>
        {pair ? (
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="bg-white bg-opacity-20 rounded-full px-4 py-2">
              <span className="font-semibold">👤 {pair.user1.nickname}</span>
              {pair.user1.socialMediaHandle && (
                <span className="text-sm ml-2">📱 {pair.user1.socialMediaHandle}</span>
              )}
            </div>
            <div className="text-2xl animate-bounce">🤗</div>
            <div className="bg-white bg-opacity-20 rounded-full px-4 py-2">
              <span className="font-semibold">👤 {pair.user2.nickname}</span>
              {pair.user2.socialMediaHandle && (
                <span className="text-sm ml-2">📱 {pair.user2.socialMediaHandle}</span>
              )}
            </div>
          </div>
        ) : group ? (
          <div className="flex items-center justify-center space-x-2 mb-6 flex-wrap">
            {group.members.map((member, index) => (
              <div key={member.id} className="bg-white bg-opacity-20 rounded-full px-4 py-2">
                <span className="font-semibold">👤 {member.nickname}</span>
                {member.socialMediaHandle && (
                  <span className="text-sm ml-2">📱 {member.socialMediaHandle}</span>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {currentPhase === 'question' ? (
        <div className="space-y-6">
          {/* Question Navigation */}
          <div className="bg-white backdrop-blur-lg rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">คำถาม</h3>
              <div className="text-sm text-gray-600">
                {currentQuestionIndex + 1} / 6
              </div>
            </div>
            <p className="text-lg text-black leading-relaxed">
              {questions[currentQuestionIndex]}
            </p>
          </div>

          {/* Answer Input */}
          <div className="bg-white backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-xl font-bold text-black mb-4">คำตอบของคุณ</h3>
            <textarea
              value={userAnswers[currentQuestionIndex]}
              onChange={(e) => {
                const newAnswers = [...userAnswers]
                newAnswers[currentQuestionIndex] = e.target.value
                setUserAnswers(newAnswers)
              }}
              className="w-full h-32 px-4 py-3 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-10 text-black placeholder-black placeholder-opacity-60 focus:border-opacity-60 focus:outline-none resize-none"
              placeholder="เขียนคำตอบของคุณที่นี่..."
            />
            <button
              onClick={submitAnswer}
              disabled={!userAnswers[currentQuestionIndex].trim() || isSubmittingAnswer || answerSubmitted[currentQuestionIndex]}
              className={`mt-4 px-6 py-2 rounded-lg transition-colors ${
                answerSubmitted[currentQuestionIndex]
                  ? 'bg-green-500 text-white cursor-not-allowed' 
                  : isSubmittingAnswer
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {answerSubmitted[currentQuestionIndex] ? '✅ ส่งแล้ว' : isSubmittingAnswer ? '⏳ กำลังส่ง...' : 'ส่งคำตอบ'}
            </button>
            
            
            {answerSubmitted[currentQuestionIndex] && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm text-center">
                  ✅ คำตอบของคุณถูกส่งแล้ว! รอคู่ของคุณส่งคำตอบ
                </p>
              </div>
            )}
          </div>

          {/* Partner's Answer */}
          {(() => {
            const partnerAnswersForQuestion = getPartnerAnswersForCurrentQuestion()
            return partnerAnswersForQuestion.length > 0 ? (
              <div className="space-y-4">
                {partnerAnswersForQuestion.map((partnerAnswer, index) => (
                  <div key={partnerAnswer.userId} className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 animate-pulse">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        👤
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-yellow-800 text-lg mb-2">
                          {partnerAnswer.nickname}
                          {partnerAnswer.socialMediaHandle && (
                            <span className="text-yellow-700 text-sm ml-2">📱 {partnerAnswer.socialMediaHandle}</span>
                          )}
                        </h5>
                        <p className="text-yellow-700 text-lg leading-relaxed">{partnerAnswer.answer}</p>
                        <div className="mt-2 text-xs text-yellow-600">
                          ✨ คำตอบใหม่จาก{group ? 'สมาชิกกลุ่ม' : 'คู่ของคุณ'}!
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-gray-700 text-lg">
                  {group ? 'สมาชิกกลุ่มยังไม่ได้ส่งคำตอบ' : `${getPartnerName()}ยังไม่ได้ส่งคำตอบ`}
                </p>
              </div>
            )
          })()}

          {/* Question Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-2 rounded-lg transition-colors ${
                currentQuestionIndex === 0
                  ? 'bg-green-300 text-white cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              ← คำถามก่อนหน้า
            </button>
            
            <div className="flex space-x-2">
              {Array.from({ length: 6 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQuestionIndex(i)}
                  className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                    i === currentQuestionIndex
                      ? 'bg-blue-500 text-white'
                      : answerSubmitted[i] && hasAllPartnersAnsweredQuestion(i)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            
            <button
              onClick={nextQuestion}
              disabled={currentQuestionIndex === 5}
              className={`px-6 py-2 rounded-lg transition-colors ${
                currentQuestionIndex === 5
                  ? 'bg-green-300 text-white cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              คำถามถัดไป →
            </button>
          </div>

          {/* Next Phase Button */}
          {canProceedToActivity() && (
            <div className="text-center">
              <button
                onClick={() => setCurrentPhase('activity')}
                className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors text-lg font-semibold"
              >
                จบเกม →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-white backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-xl font-bold text-black mb-4">📱 IG / Facebook</h3>
            
            {/* Contact Information */}
            {group ? (
              // Group contact information
              <div className="space-y-4">
                <h4 className="font-bold text-yellow-900 text-xl text-center mb-4">📱 ข้อมูลติดต่อสมาชิกกลุ่ม</h4>
                {group.members.filter(member => member.id !== currentUser?.id).map((member, index) => (
                  <div key={member.id} className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {member.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-yellow-900 text-xl">{member.nickname}</h4>
                        <p className="text-yellow-700 text-sm">สมาชิกกลุ่ม</p>
                      </div>
                    </div>
                    {member.socialMediaHandle ? (
                      <div className="bg-white bg-opacity-60 rounded-lg p-6">
                        <p className="text-yellow-800 font-semibold mb-3 text-lg">📱 Social Media:</p>
                        <p className="text-yellow-700 text-xl font-medium">{member.socialMediaHandle}</p>
                        <p className="text-yellow-600 text-sm mt-2">💡 ติดต่อเพื่อนใหม่ได้เลย!</p>
                      </div>
                    ) : (
                      <div className="bg-white bg-opacity-60 rounded-lg p-6">
                        <p className="text-yellow-600 text-center text-lg">ยังไม่ได้ใส่ข้อมูลติดต่อ</p>
                      </div>
                    )}
                    
                    {/* Add Friend Button for each group member */}
                    {isAuthenticated && (friendRequestStatus[member.userId || member.id] === 'idle' || !friendRequestStatus[member.userId || member.id]) && (
                      <div className="text-center mt-4">
                        <button
                          onClick={() => handleSendFriendRequest(member.userId || member.id)}
                          className="bg-gradient-to-r from-pink-400 to-purple-400 text-white font-semibold py-2 px-6 rounded-lg hover:from-pink-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm"
                        >
                          👥 ส่งคำขอเป็นเพื่อน
                        </button>
                      </div>
                    )}
                    
                    {/* Friend Request Status for Group Member */}
                    {friendRequestStatus[member.userId || member.id] === 'sending' && (
                      <div className="text-center mt-4">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600"></div>
                          <span className="text-black text-sm">กำลังส่งคำขอ...</span>
                        </div>
                      </div>
                    )}
                    
                    {friendRequestStatus[member.userId || member.id] === 'sent' && (
                      <div className="text-center mt-4">
                        <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="text-green-600 text-lg">✅</div>
                            <span className="text-green-800 font-semibold text-sm">ส่งคำขอแล้ว!</span>
                          </div>
                          <p className="text-green-700 text-xs mt-1">
                            รอให้ {member.nickname} ยอมรับ
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {friendRequestStatus[member.userId || member.id] === 'error' && (
                      <div className="text-center mt-4">
                        <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="text-red-600 text-lg">❌</div>
                            <span className="text-red-800 font-semibold text-sm">เกิดข้อผิดพลาด</span>
                          </div>
                          <p className="text-red-700 text-xs mt-1">
                            {errorMessages[member.userId || member.id]}
                          </p>
                          <button
                            onClick={() => setFriendRequestStatus(prev => ({ ...prev, [member.userId || member.id]: 'idle' }))}
                            className="mt-2 text-red-600 hover:text-red-700 underline text-xs"
                          >
                            ลองใหม่
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Login Prompt for non-authenticated users */}
                    {!isAuthenticated && (
                      <div className="text-center mt-4">
                        <p className="text-gray-600 mb-2 text-sm">ต้องการส่งคำขอเป็นเพื่อน?</p>
                        <button
                          onClick={() => {
                            alert('กรุณาเข้าสู่ระบบก่อนส่งคำขอเป็นเพื่อน')
                          }}
                          className="bg-blue-500 text-white font-semibold py-1 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          🔐 เข้าสู่ระบบ
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Pair contact information
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {getPartnerName().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-yellow-900 text-xl">{getPartnerName()}</h4>
                    <p className="text-yellow-700 text-sm">เพื่อนใหม่ของคุณ</p>
                  </div>
                </div>
                {getPartnerSocialMediaHandle() ? (
                  <div className="bg-white bg-opacity-60 rounded-lg p-6">
                    <p className="text-yellow-800 font-semibold mb-3 text-lg">📱 Social Media:</p>
                    <p className="text-yellow-700 text-xl font-medium">{getPartnerSocialMediaHandle()}</p>
                    <p className="text-yellow-600 text-sm mt-2">💡 ติดต่อเพื่อนใหม่ของคุณได้เลย!</p>
                  </div>
                ) : (
                  <div className="bg-white bg-opacity-60 rounded-lg p-6">
                    <p className="text-yellow-600 text-center text-lg">เพื่อนของคุณยังไม่ได้ใส่ข้อมูลติดต่อ</p>
                  </div>
                )}
                
                {/* Add Friend Button - Show for logged-in users */}
                {isAuthenticated && (!partnerId || friendRequestStatus[partnerId] === 'idle' || !friendRequestStatus[partnerId]) && (
                  <div className="text-center mt-4">
                    <button
                      onClick={() => handleSendFriendRequest()}
                      className="bg-gradient-to-r from-pink-400 to-purple-400 text-white font-semibold py-3 px-8 rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      👥 ส่งคำขอเป็นเพื่อน
                    </button>
                  </div>
                )}
                
                {/* Friend Request Status for Pair */}
                {partnerId && friendRequestStatus[partnerId] === 'sending' && (
                  <div className="text-center mt-4">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
                      <span className="text-black">กำลังส่งคำขอ...</span>
                    </div>
                  </div>
                )}
                
                {partnerId && friendRequestStatus[partnerId] === 'sent' && (
                  <div className="text-center mt-4">
                    <div className="bg-green-100 border border-green-300 rounded-xl p-4">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="text-green-600 text-2xl">✅</div>
                        <span className="text-green-800 font-semibold">ส่งคำขอเป็นเพื่อนแล้ว!</span>
                      </div>
                      <p className="text-green-700 text-sm mt-2">
                        รอให้ {partnerNickname} ยอมรับคำขอของคุณ
                      </p>
                    </div>
                  </div>
                )}
                
                {partnerId && friendRequestStatus[partnerId] === 'error' && (
                  <div className="text-center mt-4">
                    <div className="bg-red-100 border border-red-300 rounded-xl p-4">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="text-red-600 text-2xl">❌</div>
                        <span className="text-red-800 font-semibold">เกิดข้อผิดพลาด</span>
                      </div>
                      <p className="text-red-700 text-sm mt-2">
                        {errorMessages[partnerId]}
                      </p>
                      <button
                        onClick={() => setFriendRequestStatus(prev => ({ ...prev, [partnerId]: 'idle' }))}
                        className="mt-3 text-red-600 hover:text-red-700 underline text-sm"
                      >
                        ลองใหม่
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Login Prompt for non-authenticated users */}
                {!isAuthenticated && (
                  <div className="text-center mt-4">
                    <p className="text-gray-600 mb-3">ต้องการส่งคำขอเป็นเพื่อน?</p>
                    <button
                      onClick={() => {
                        // This will trigger the login modal to open
                        // You might need to add a prop or context to handle this
                        alert('กรุณาเข้าสู่ระบบก่อนส่งคำขอเป็นเพื่อน')
                      }}
                      className="bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      🔐 เข้าสู่ระบบ
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={onNewGame}
          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          เกมใหม่
        </button>
        <button
          onClick={onLeave}
          className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          ออกจากเกม
        </button>
      </div>
    </div>
  )
}
