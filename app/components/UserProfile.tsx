'use client'

import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const UserProfile: React.FC = () => {
  const { user, logout } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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
