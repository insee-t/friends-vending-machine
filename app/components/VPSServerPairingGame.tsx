'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

interface User {
  id: string
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
      // Automatically use the logged-in user's nickname and social media handle
      handleNicknameSubmit(authUser.nickname, authUser.socialMediaHandle)
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

  const handleNicknameSubmit = (nickname: string, socialMediaHandle?: string) => {
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
        socialMediaHandle: socialMediaHandle || null
      })
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
    <div className="bg-white backdrop-blur-lg rounded-2xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold text-black mb-2">กำลังหาคู่ให้คุณ</h2>
        <p className="text-black opacity-80">{waitingMessage}</p>
      </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
    </div>
  )
}

// Pairing Result Component
function PairingResult({ pair }: { pair: Pair }) {
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

// Activity Screen Component
function ActivityScreen({ 
  pair, 
  onNewGame, 
  onLeave, 
  currentUser, 
  socketRef, 
  isAuthenticated, 
  authUser 
}: {
  pair: Pair
  onNewGame: () => void
  onLeave: () => void
  currentUser: User | null
  socketRef: React.RefObject<Socket>
  isAuthenticated: boolean
  authUser: any
}) {
  const [userAnswer, setUserAnswer] = useState('')
  const [partnerAnswer, setPartnerAnswer] = useState('')
  const [userActivityAnswer, setUserActivityAnswer] = useState('')
  const [partnerActivityAnswer, setPartnerActivityAnswer] = useState('')
  const [partnerFileUrl, setPartnerFileUrl] = useState<string | null>(null)
  const [currentPhase, setCurrentPhase] = useState<'question' | 'activity'>('question')
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false)
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [activitySubmitted, setActivitySubmitted] = useState(false)

  useEffect(() => {
    if (!socketRef.current) return

    const socket = socketRef.current

    const handleReceiveAnswer = (data: { userId: string, answer: string }) => {
      if (data.userId !== currentUser?.id) {
        setPartnerAnswer(data.answer)
        // Show notification that partner's answer was received
        console.log('Partner answer received!')
      }
    }

    const handleReceiveActivityAnswer = (data: { userId: string, answer: string, fileUrl?: string }) => {
      if (data.userId !== currentUser?.id) {
        setPartnerActivityAnswer(data.answer)
        if (data.fileUrl) {
          setPartnerFileUrl(data.fileUrl)
        }
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
    if (socketRef.current && userAnswer.trim()) {
      setIsSubmittingAnswer(true)
      socketRef.current.emit('submit-answer', {
        pairId: pair.id,
        userId: currentUser?.id,
        answer: userAnswer.trim()
      })
      
      // Simulate submission delay and then show success
      setTimeout(() => {
        setIsSubmittingAnswer(false)
        setAnswerSubmitted(true)
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
        pairId: pair.id,
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
    return pair.user1.id === currentUser?.id ? pair.user2.nickname : pair.user1.nickname
  }

  const getPartnerSocialMediaHandle = () => {
    return pair.user1.id === currentUser?.id ? pair.user2.socialMediaHandle : pair.user1.socialMediaHandle
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white backdrop-blur-lg rounded-2xl p-6 text-center">
        <h2 className="text-2xl font-bold text-black mb-4">
          {currentPhase === 'question' ? 'คำถาม' : 'กิจกรรม'}
        </h2>
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
      </div>

      {currentPhase === 'question' ? (
        <div className="space-y-6">
          {/* Question */}
          <div className="bg-white backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-xl font-bold text-black mb-4">คำถาม</h3>
            <p className="text-lg text-black leading-relaxed">{pair.question}</p>
          </div>

          {/* Answer Input */}
          <div className="bg-white backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-xl font-bold text-black mb-4">คำตอบของคุณ</h3>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-full h-32 px-4 py-3 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-10 text-black placeholder-black placeholder-opacity-60 focus:border-opacity-60 focus:outline-none resize-none"
              placeholder="เขียนคำตอบของคุณที่นี่..."
            />
            <button
              onClick={submitAnswer}
              disabled={!userAnswer.trim() || isSubmittingAnswer || answerSubmitted}
              className={`mt-4 px-6 py-2 rounded-lg transition-colors ${
                answerSubmitted 
                  ? 'bg-green-500 text-white cursor-not-allowed' 
                  : isSubmittingAnswer
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {answerSubmitted ? '✅ ส่งแล้ว' : isSubmittingAnswer ? '⏳ กำลังส่ง...' : 'ส่งคำตอบ'}
            </button>
            
            {answerSubmitted && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm text-center">
                  ✅ คำตอบของคุณถูกส่งแล้ว! รอคู่ของคุณส่งคำตอบ
                </p>
              </div>
            )}
          </div>

          {/* Partner's Answer */}
          {partnerAnswer ? (
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  👤
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-yellow-800 text-lg mb-2">
                    {getPartnerName()}
                    {getPartnerSocialMediaHandle() && (
                      <span className="text-yellow-700 text-sm ml-2">📱 {getPartnerSocialMediaHandle()}</span>
                    )}
                  </h5>
                  <p className="text-yellow-700 text-lg leading-relaxed">{partnerAnswer}</p>
                  <div className="mt-2 text-xs text-yellow-600">
                    ✨ คำตอบใหม่จากคู่ของคุณ!
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-gray-700 text-lg">
                {getPartnerName()}
                {getPartnerSocialMediaHandle() && (
                  <span className="text-gray-600 text-sm ml-2">📱 {getPartnerSocialMediaHandle()}</span>
                )}
                ยังไม่ได้ส่งคำตอบ
              </p>
            </div>
          )}

          {/* Next Phase Button */}
          {userAnswer && partnerAnswer && (
            <div className="text-center">
              <button
                onClick={() => setCurrentPhase('activity')}
                className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors text-lg font-semibold"
              >
                ไปยังกิจกรรมต่อไป →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Activity */}
          <div className="bg-white backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-xl font-bold text-black mb-4">กิจกรรม</h3>
            <p className="text-lg text-black leading-relaxed">{pair.activity}</p>
          </div>

          {/* Activity Answer Input */}
          <div className="bg-white backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-xl font-bold text-black mb-4">ผลงานของคุณ</h3>
            <textarea
              value={userActivityAnswer}
              onChange={(e) => setUserActivityAnswer(e.target.value)}
              className="w-full h-32 px-4 py-3 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-10 text-black placeholder-black placeholder-opacity-60 focus:border-opacity-60 focus:outline-none resize-none"
              placeholder="เขียนผลงานของคุณที่นี่..."
            />
            
            {/* File Upload */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-black mb-2">
                อัปโหลดไฟล์ (ไม่บังคับ)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                className="w-full px-4 py-2 rounded-lg border-2 border-white border-opacity-30 bg-white bg-opacity-10 text-black"
              />
              {file && (
                <p className="text-sm text-black opacity-80 mt-1">
                  ไฟล์ที่เลือก: {file.name}
                </p>
              )}
            </div>

            <button
              onClick={submitActivityAnswer}
              disabled={!userActivityAnswer.trim() || isUploading || isSubmittingActivity || activitySubmitted}
              className={`mt-4 px-6 py-2 rounded-lg transition-colors ${
                activitySubmitted 
                  ? 'bg-green-500 text-white cursor-not-allowed' 
                  : isSubmittingActivity || isUploading
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {activitySubmitted 
                ? '✅ ส่งแล้ว' 
                : isSubmittingActivity 
                ? '⏳ กำลังส่ง...' 
                : isUploading 
                ? '📤 กำลังอัปโหลด...' 
                : 'ส่งผลงาน'
              }
            </button>
            
            {activitySubmitted && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm text-center">
                  ✅ ผลงานของคุณถูกส่งแล้ว! รอคู่ของคุณส่งผลงาน
                </p>
              </div>
            )}
          </div>

          {/* Partner's Activity Answer */}
          {partnerActivityAnswer ? (
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  👤
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-yellow-800 text-lg mb-2">
                    {getPartnerName()}
                    {getPartnerSocialMediaHandle() && (
                      <span className="text-yellow-700 text-sm ml-2">📱 {getPartnerSocialMediaHandle()}</span>
                    )}
                  </h5>
                  <p className="text-yellow-700 text-lg leading-relaxed">{partnerActivityAnswer}</p>
                  {partnerFileUrl && (
                    <div className="mt-3">
                      <a
                        href={partnerFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        📎 ดูไฟล์
                      </a>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-yellow-600">
                    ✨ ผลงานใหม่จากคู่ของคุณ!
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-gray-700 text-lg">
                {getPartnerName()}
                {getPartnerSocialMediaHandle() && (
                  <span className="text-gray-600 text-sm ml-2">📱 {getPartnerSocialMediaHandle()}</span>
                )}
                ยังไม่ได้ส่งคำตอบ
              </p>
            </div>
          )}

          {/* Show user's uploaded file */}
          {fileUrl && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h4 className="font-bold text-blue-900 mb-2">ไฟล์ที่คุณอัปโหลด</h4>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                📎 ดูไฟล์ของคุณ
              </a>
            </div>
          )}
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