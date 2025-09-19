'use client'

import { useState } from 'react'
import VPSServerPairingGame from './components/VPSServerPairingGame'

export default function Home() {
  const [isHovered, setIsHovered] = useState(false)
  const [showGame, setShowGame] = useState(false)

  if (showGame) {
    return <VPSServerPairingGame />
  }

  return (
    <div className="landing-container flex items-center justify-center min-h-screen p-4">
      {/* Floating background circles */}
      <div className="floating-circle"></div>
      <div className="floating-circle"></div>
      <div className="floating-circle"></div>
      <div className="floating-circle"></div>
      <div className="floating-circle"></div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Speech bubbles */}
        <div className="absolute -left-4 -top-8 z-20">
          <div className="speech-bubble px-4 py-2 text-sm font-medium text-gray-800">
            ง่ายกว่าที่คิด! 😊
          </div>
        </div>

        <div className="absolute -right-4 -top-8 z-20">
          <div className="speech-bubble px-4 py-2 text-sm font-medium text-gray-800">
            หาเพื่อนใหม่กันเถอะ!
          </div>
        </div>

        {/* Main panel */}
        <div className="main-panel p-8 md:p-12 relative">
          {/* Confetti illustration */}
          <div className="absolute top-4 left-4 confetti">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="15" y="5" width="10" height="20" fill="#ef4444" rx="2"/>
              <circle cx="12" cy="8" r="2" fill="#fbbf24"/>
              <circle cx="28" cy="12" r="2" fill="#a855f7"/>
              <circle cx="8" cy="18" r="2" fill="#10b981"/>
              <circle cx="32" cy="20" r="2" fill="#f59e0b"/>
              <path d="M20 25 L15 30 L25 30 Z" fill="#ef4444"/>
            </svg>
          </div>

          {/* Eagle illustration */}
          <div className="absolute top-4 right-4">
            <svg width="50" height="40" viewBox="0 0 50 40" fill="none">
              <ellipse cx="25" cy="20" rx="15" ry="12" fill="#374151"/>
              <ellipse cx="25" cy="15" rx="12" ry="8" fill="white"/>
              <polygon points="20,12 25,8 30,12" fill="#fbbf24"/>
              <circle cx="22" cy="14" r="1.5" fill="black"/>
              <circle cx="28" cy="14" r="1.5" fill="black"/>
            </svg>
          </div>

          {/* Waving hand */}
          <div className="absolute bottom-4 right-4 wave-hand">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 5 C15 5, 10 10, 10 15 C10 20, 15 25, 20 25 C25 25, 30 20, 30 15 C30 10, 25 5, 20 5 Z" fill="#fbbf24"/>
              <path d="M15 10 L12 15 M25 10 L28 15 M18 20 L15 25 M22 20 L25 25" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 15 Q10 10, 15 15 Q20 5, 25 15" stroke="#3b82f6" strokeWidth="2" fill="none"/>
            </svg>
          </div>

          {/* Main content */}
          <div className="text-center space-y-6">
            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              เครื่องขายเพื่อน
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-700 mb-8">
              กดเริ่ม เพื่อพบเพื่อนใหม่!
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {/* Start Button */}
              <button 
                className="start-button px-8 py-4 flex items-center gap-3 text-lg font-semibold text-gray-800 min-w-[200px]"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => setShowGame(true)}
              >
                <div className="rocket-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="#ef4444"/>
                    <path d="M12 16L8 20L12 18L16 20L12 16Z" fill="#3b82f6"/>
                  </svg>
                </div>
                เริ่มต้น
              </button>

              {/* How to Use Button */}
              {/* <button className="how-to-button px-8 py-4 flex items-center gap-3 text-lg font-semibold text-gray-700 min-w-[200px]">
                <div className="w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center">
                  <span className="text-gray-400 font-bold text-sm">?</span>
                </div>
                วิธีการใช้งาน
              </button> */}
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div className="text-center mt-8">
          <p className="text-white text-sm md:text-base opacity-90">
            โครงการเพื่อส่งเสริมความสัมพันธ์ในคณะวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น
          </p>
        </div>
      </div>
    </div>
  )
}
