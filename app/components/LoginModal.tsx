'use client'

import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [socialMediaHandle, setSocialMediaHandle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login, signup } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      let success = false
      
      if (isLogin) {
        success = await login(email, password)
        if (!success) {
          setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        }
      } else {
        if (!nickname.trim()) {
          setError('กรุณากรอกชื่อเล่น')
          setIsLoading(false)
          return
        }
        const socialMediaHandleValue = socialMediaHandle.trim() || undefined
        //console.log('LoginModal signup call:', { email, password, nickname: nickname.trim(), socialMediaHandle: socialMediaHandleValue })
        success = await signup(email, password, nickname.trim(), socialMediaHandleValue)
        if (!success) {
          setError('อีเมลนี้มีผู้ใช้แล้ว หรือข้อมูลไม่ถูกต้อง')
        }
      }

      if (success) {
        onSuccess?.()
        onClose()
        // Reset form
        setEmail('')
        setPassword('')
        setNickname('')
        setSocialMediaHandle('')
        setError('')
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setNickname('')
    setSocialMediaHandle('')
    setError('')
    setIsLogin(true)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative my-8 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </h2>
          <p className="text-sm text-gray-600">
            {isLogin ? 'เข้าสู่ระบบเพื่อบันทึกประวัติการเล่น' : 'สร้างบัญชีเพื่อบันทึกประวัติการเล่น'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อเล่น
                </label>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="กรอกชื่อเล่นของคุณ"
                  required={!isLogin}
                />
              </div>
              
              <div>
                <label htmlFor="socialMediaHandle" className="block text-sm font-medium text-gray-700 mb-1">
                  IG / Facebook (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  id="socialMediaHandle"
                  value={socialMediaHandle}
                  onChange={(e) => setSocialMediaHandle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="เช่น @username หรือ username"
                  maxLength={100}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              อีเมล
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="กรอกอีเมลของคุณ"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="กรอกรหัสผ่านของคุณ"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isLoading ? 'กำลังดำเนินการ...' : (isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
          </button>
        </form>

        {/* Toggle between login and signup */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            {isLogin ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>

        {/* Optional login note */}
        <div className="text-center mt-3">
          <p className="text-xs text-gray-500">
            การเข้าสู่ระบบเป็นทางเลือก คุณสามารถเล่นได้โดยไม่ต้องสมัครสมาชิก
          </p>
        </div>
      </div>
    </div>
  )
}
