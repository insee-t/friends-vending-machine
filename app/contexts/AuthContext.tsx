'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  nickname: string
  socialMediaHandle?: string
  createdAt: string
}

interface Friend {
  id: string
  nickname: string
  social_media_handle?: string
  created_at: string
  status?: string
}

interface FriendRequest {
  id: string
  nickname: string
  social_media_handle?: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, nickname: string) => Promise<boolean>
  logout: () => void
  updateSocialMediaHandle: (socialMediaHandle: string) => Promise<boolean>
  sendFriendRequest: (friendId: string) => Promise<boolean>
  acceptFriendRequest: (friendId: string) => Promise<boolean>
  rejectFriendRequest: (friendId: string) => Promise<boolean>
  removeFriend: (friendId: string) => Promise<boolean>
  getFriends: () => Promise<Friend[]>
  getFriendRequests: () => Promise<FriendRequest[]>
  getSentFriendRequests: () => Promise<FriendRequest[]>
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('authToken')
    if (token) {
      // Verify token with server
      
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? (process.env.NEXT_PUBLIC_API_URL_PROD || 'https://api.ionize13.com')
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
      
      fetch(`${API_BASE}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user)
        } else {
          localStorage.removeItem('authToken')
        }
      })
      .catch(() => {
        localStorage.removeItem('authToken')
      })
      .finally(() => {
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('APP_ENV:', process.env.NEXT_PUBLIC_APP_ENV)
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      })

      const data = await response.json()
      
      if (data.success) {
        localStorage.setItem('authToken', data.token)
        setUser(data.user)
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const signup = async (email: string, password: string, nickname: string): Promise<boolean> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, nickname }),
        credentials: 'include'
      })

      const data = await response.json()
      
      if (data.success) {
        localStorage.setItem('authToken', data.token)
        setUser(data.user)
        return true
      }
      return false
    } catch (error) {
      console.error('Signup error:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setUser(null)
  }

  const updateSocialMediaHandle = async (socialMediaHandle: string): Promise<boolean> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const token = localStorage.getItem('authToken')
      if (!token) return false

      const response = await fetch(`${API_BASE}/api/user/social-media-handle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ socialMediaHandle }),
        credentials: 'include'
      })

      const data = await response.json()
      
      if (data.success) {
        setUser(data.user)
        return true
      }
      return false
    } catch (error) {
      console.error('Update social media handle error:', error)
      return false
    }
  }

  const sendFriendRequest = async (friendId: string): Promise<boolean> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const token = localStorage.getItem('authToken')
      if (!token) return false

      const response = await fetch(`${API_BASE}/api/friends/send-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
        credentials: 'include'
      })

      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Send friend request error:', error)
      return false
    }
  }

  const acceptFriendRequest = async (friendId: string): Promise<boolean> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const token = localStorage.getItem('authToken')
      if (!token) return false

      const response = await fetch(`${API_BASE}/api/friends/accept-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
        credentials: 'include'
      })

      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Accept friend request error:', error)
      return false
    }
  }

  const rejectFriendRequest = async (friendId: string): Promise<boolean> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const token = localStorage.getItem('authToken')
      if (!token) return false

      const response = await fetch(`${API_BASE}/api/friends/reject-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
        credentials: 'include'
      })

      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Reject friend request error:', error)
      return false
    }
  }

  const removeFriend = async (friendId: string): Promise<boolean> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const token = localStorage.getItem('authToken')
      if (!token) return false

      const response = await fetch(`${API_BASE}/api/friends/remove`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
        credentials: 'include'
      })

      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Remove friend error:', error)
      return false
    }
  }

  const getFriends = async (): Promise<Friend[]> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const token = localStorage.getItem('authToken')
      if (!token) return []

      const response = await fetch(`${API_BASE}/api/friends`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      const data = await response.json()
      return data.success ? data.friends : []
    } catch (error) {
      console.error('Get friends error:', error)
      return []
    }
  }

  const getFriendRequests = async (): Promise<FriendRequest[]> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const token = localStorage.getItem('authToken')
      if (!token) return []

      const response = await fetch(`${API_BASE}/api/friends/requests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      const data = await response.json()
      return data.success ? data.requests : []
    } catch (error) {
      console.error('Get friend requests error:', error)
      return []
    }
  }

  const getSentFriendRequests = async (): Promise<FriendRequest[]> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const token = localStorage.getItem('authToken')
      if (!token) return []

      const response = await fetch(`${API_BASE}/api/friends/sent-requests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      const data = await response.json()
      return data.success ? data.sentRequests : []
    } catch (error) {
      console.error('Get sent friend requests error:', error)
      return []
    }
  }

  const value: AuthContextType = {
    user,
    login,
    signup,
    logout,
    updateSocialMediaHandle,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriends,
    getFriendRequests,
    getSentFriendRequests,
    isLoading,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
