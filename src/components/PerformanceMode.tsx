'use client'

import { useState, useEffect } from 'react'

export default function PerformanceMode() {
  const [isPerformanceMode, setIsPerformanceMode] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as { opera?: string }).opera || ''
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isPerformanceMode) {
      // Add performance mode class to disable animations
      document.documentElement.classList.add('performance-mode')
    } else {
      // Remove performance mode class to enable animations
      document.documentElement.classList.remove('performance-mode')
    }
  }, [isPerformanceMode])

  // Only show on mobile devices
  if (!isMobile) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsPerformanceMode(!isPerformanceMode)}
        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
          isPerformanceMode
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title={isPerformanceMode ? 'Performance mode ON - Better battery life' : 'Performance mode OFF - Full animations'}
      >
        {isPerformanceMode ? '⚡ Performance' : '🎨 Full Effects'}
      </button>
    </div>
  )
}
