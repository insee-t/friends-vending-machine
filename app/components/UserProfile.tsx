'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const UserProfile: React.FC = () => {
  const { user, logout, updateSocialMediaHandle, getFriends, getFriendRequests, acceptFriendRequest, rejectFriendRequest } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isEditingSocialHandle, setIsEditingSocialHandle] = useState(false)
  const [socialHandleInput, setSocialHandleInput] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [friends, setFriends] = useState<any[]>([])
  const [friendRequests, setFriendRequests] = useState<any[]>([])
  const [showFriends, setShowFriends] = useState(false)
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)

  const handleSocialHandleSubmit = async () => {
    if (isUpdating) return
    
    setIsUpdating(true)
    const success = await updateSocialMediaHandle(socialHandleInput.trim())
    if (success) {
      setIsEditingSocialHandle(false)
      setSocialHandleInput('')
    }
    setIsUpdating(false)
  }

  const handleEditSocialHandle = () => {
    setSocialHandleInput(user?.socialMediaHandle || '')
    setIsEditingSocialHandle(true)
  }

  const handleCancelEdit = () => {
    setIsEditingSocialHandle(false)
    setSocialHandleInput('')
  }

  const loadFriends = async () => {
    setIsLoadingFriends(true)
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests()
      ])
      setFriends(friendsData)
      setFriendRequests(requestsData)
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setIsLoadingFriends(false)
    }
  }

  const handleAcceptFriendRequest = async (friendId: string) => {
    const success = await acceptFriendRequest(friendId)
    if (success) {
      setTimeout(() => loadFriends(), 300) // Reload friends list with delay
    }
  }

  const handleRejectFriendRequest = async (friendId: string) => {
    const success = await rejectFriendRequest(friendId)
    if (success) {
      setTimeout(() => loadFriends(), 300) // Reload friends list with delay
    }
  }

  useEffect(() => {
    if (isDropdownOpen && user) {
      loadFriends()
    }
  }, [isDropdownOpen, user])

  if (!user) return null

  return (
    <div className="relative">
      {/* Profile button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-opacity-30 transition-all"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
          {user.nickname.charAt(0).toUpperCase()}
        </div>
        <span className="text-white font-medium hidden sm:block">
          {user.nickname}
        </span>
        <svg 
          className={`w-4 h-4 text-white transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {user.nickname.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user.nickname}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <div className="px-3 py-2 text-sm text-gray-500">
                สมาชิกตั้งแต่: {new Date(user.createdAt).toLocaleDateString('th-TH')}
              </div>
              
              {/* Social Media Handle Section */}
              <div className="px-3 py-2 border-t border-gray-100">
                <div className="text-sm text-gray-600 mb-2">Social Media Handle</div>
                {isEditingSocialHandle ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={socialHandleInput}
                      onChange={(e) => setSocialHandleInput(e.target.value)}
                      placeholder="@username หรือ social media handle"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={100}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSocialHandleSubmit}
                        disabled={isUpdating}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        {isUpdating ? 'กำลังบันทึก...' : 'บันทึก'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-800">
                      {user.socialMediaHandle || 'ยังไม่ได้ตั้งค่า'}
                    </div>
                    <button
                      onClick={handleEditSocialHandle}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      แก้ไข
                    </button>
                  </div>
                )}
              </div>

              {/* Friends Section */}
              <div className="px-3 py-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">เพื่อน</div>
                  <button
                    onClick={() => setShowFriends(!showFriends)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showFriends ? 'ซ่อน' : 'ดู'}
                  </button>
                </div>
                
                {showFriends && (
                  <div className="space-y-3">
                    {/* Friend Requests */}
                    {friendRequests.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 mb-2">คำขอเป็นเพื่อน ({friendRequests.length})</div>
                        <div className="space-y-2">
                          {friendRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                  {request.nickname.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-gray-900">{request.nickname}</div>
                                  {request.social_media_handle && (
                                    <div className="text-xs text-gray-500">📱 {request.social_media_handle}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleAcceptFriendRequest(request.id)}
                                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => handleRejectFriendRequest(request.id)}
                                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                >
                                  ✗
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Friends List */}
                    <div>
                      <div className="text-xs text-gray-500 mb-2">เพื่อน ({friends.length})</div>
                      {isLoadingFriends ? (
                        <div className="text-xs text-gray-500">กำลังโหลด...</div>
                      ) : friends.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {friends.map((friend) => (
                            <div key={friend.id} className="flex items-center space-x-2 bg-blue-50 rounded-lg p-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {friend.nickname.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="text-xs font-medium text-gray-900">{friend.nickname}</div>
                                {friend.social_media_handle && (
                                  <div className="text-xs text-gray-500">📱 {friend.social_media_handle}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">ยังไม่มีเพื่อน</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              
              <button
                onClick={() => {
                  logout()
                  setIsDropdownOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}