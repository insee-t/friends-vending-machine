'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  nickname: string
  socialMediaHandle?: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, nickname: string, socialMediaHandle?: string) => Promise<boolean>
  logout: () => void
  updateSocialMediaHandle: (socialMediaHandle: string) => Promise<boolean>
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

  const signup = async (email: string, password: string, nickname: string, socialMediaHandle?: string): Promise<boolean> => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_APP_ENV === 'production' 
        ? 'https://api.ionize13.com'
        : 'http://localhost:3000'
      
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, nickname, socialMediaHandle }),
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

  const value: AuthContextType = {
    user,
    login,
    signup,
    logout,
    updateSocialMediaHandle,
    isLoading,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}