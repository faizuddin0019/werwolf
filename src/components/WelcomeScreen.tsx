'use client'

import { useState } from 'react'
import { useAtom } from 'jotai'
import { 
  gameCodeAtom, 
  playerNameAtom, 
  resetGameAtom,
  clientIdAtom 
} from '@/lib/game-store'
import { Copy, Users, Shield, Stethoscope, Eye } from 'lucide-react'

interface WelcomeScreenProps {
  onStartGame: (gameCode: string) => void
  onJoinGame: (gameCode: string, playerName: string) => void
}

export default function WelcomeScreen({ onStartGame, onJoinGame }: WelcomeScreenProps) {
  const [gameCode, setGameCode] = useAtom(gameCodeAtom)
  const [playerName, setPlayerName] = useAtom(playerNameAtom)
  const [resetGame] = useAtom(resetGameAtom)
  const [clientId, setClientId] = useAtom(clientIdAtom)
  
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Generate client ID if not exists
  if (!clientId) {
    const newClientId = Math.random().toString(36).substring(2) + Date.now().toString(36)
    setClientId(newClientId)
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const handleStartGame = () => {
    if (playerName.trim()) {
      onStartGame(gameCode)
    }
  }

  const handleJoinGame = () => {
    if (joinCode.trim() && joinName.trim()) {
      onJoinGame(joinCode, joinName)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 relative overflow-hidden">
      {/* Royal Decorative Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Royal Pattern Overlay */}
        <div className="absolute inset-0 opacity-8">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/15 via-transparent to-indigo-600/15"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-amber-600/15 via-transparent to-slate-600/15"></div>
        </div>
        
        {/* Decorative Corner Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500/25 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/25 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-indigo-500/25 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-slate-500/25 to-transparent rounded-full blur-3xl"></div>
        
        {/* Floating Royal Elements */}
        <div className="absolute top-20 left-1/4 w-4 h-4 bg-amber-400/50 rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-1/3 w-3 h-3 bg-blue-400/50 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-1/3 w-5 h-5 bg-indigo-400/50 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-1/4 w-4 h-4 bg-amber-400/50 rounded-full animate-pulse" style={{animationDelay: '3s'}}></div>
        {/* Floating particles */}
        <div className="absolute top-20 left-10 w-3 h-3 bg-red-500/50 rounded-full floating"></div>
        <div className="absolute top-40 right-20 w-4 h-4 bg-blue-500/50 rounded-full floating" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-green-500/50 rounded-full floating" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-60 left-1/3 w-2 h-2 bg-purple-500/60 rounded-full floating" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-80 right-1/3 w-2 h-2 bg-yellow-500/40 rounded-full floating" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-60 right-10 w-3 h-3 bg-pink-500/40 rounded-full floating" style={{animationDelay: '5s'}}></div>
        <div className="absolute top-32 left-1/2 w-2 h-2 bg-cyan-500/50 rounded-full floating" style={{animationDelay: '6s'}}></div>
        

        {/* VILLAGERS - Icon-based */}
        {/* Villagers - Top Left Area */}
        <div className="absolute z-0" style={{top: '20px', left: '80px'}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-amber-200/90 to-amber-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-amber-200/80 character-float dramatic-pulse" style={{border: '8px solid rgba(245, 158, 11, 0.9)'}}>
              <div className="relative character-breathe">
                {/* Villagers Icon - Male Villager */}
                <div className="w-64 h-64 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{fontSize: '8rem'}}>👨‍🌾</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-gradient-to-r from-amber-200/70 to-amber-400/70 rounded-full blur-3xl"></div>
            <div className="absolute top-84 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-amber-100 bg-gray-900/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-amber-200/60">
                Villagers
              </span>
            </div>
          </div>
        </div>

        {/* WERWOLF - Icon-based */}
        {/* Werwolf - Top Right Area */}
        <div className="absolute z-0" style={{top: '20px', right: '80px'}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-red-200/90 to-red-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-red-200/80 character-float dramatic-pulse" style={{border: '8px solid rgba(239, 68, 68, 0.9)'}}>
              <div className="relative character-breathe">
                {/* Werwolf Icon - Animated Wolf */}
                <div className="w-64 h-64 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{fontSize: '8rem'}}>🐺</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-gradient-to-r from-red-200/70 to-red-400/70 rounded-full blur-3xl"></div>
            <div className="absolute top-84 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-red-100 bg-gray-900/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-red-200/60">
                Werwolves
              </span>
            </div>
          </div>
        </div>

        {/* DOCTOR - Icon-based */}
        {/* Doctor - Bottom Left Area - Hidden on mobile to avoid form overlap */}
        <div className="absolute hidden md:block z-0" style={{bottom: '300px', left: '80px'}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-emerald-200/90 to-emerald-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200/80 character-float dramatic-pulse" style={{animationDelay: '1s', border: '8px solid rgba(16, 185, 129, 0.9)'}}>
              <div className="relative character-breathe">
                {/* Doctor Icon - Male Doctor */}
                <div className="w-64 h-64 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{fontSize: '8rem'}}>👨‍⚕️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-gradient-to-r from-emerald-200/70 to-emerald-400/70 rounded-full blur-3xl"></div>
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-emerald-100 bg-gray-900/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-emerald-200/60">
                Doctor
              </span>
            </div>
          </div>
        </div>

        {/* POLICE - Icon-based */}
        {/* Police - Bottom Right Area - Hidden on mobile to avoid form overlap */}
        <div className="absolute hidden md:block z-0" style={{bottom: '300px', right: '80px'}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-sky-200/90 to-sky-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-sky-200/80 character-float dramatic-pulse" style={{animationDelay: '2s', border: '8px solid rgba(14, 165, 233, 0.9)'}}>
              <div className="relative character-breathe">
                {/* Police Icon - Male Police Officer */}
                <div className="w-64 h-64 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{fontSize: '8rem'}}>👮‍♂️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-gradient-to-r from-sky-200/70 to-sky-400/70 rounded-full blur-3xl"></div>
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-sky-100 bg-gray-900/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-sky-200/60">
                Police
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Character Circles - Smaller and positioned to avoid form overlap */}
        <div className="absolute md:hidden" style={{top: '10px', left: '10px', zIndex: 1}}>
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-200/90 to-emerald-400/90 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200/80 character-float dramatic-pulse" style={{animationDelay: '1s', border: '4px solid rgba(16, 185, 129, 0.9)'}}>
              <div className="relative character-breathe">
                <div className="w-16 h-16 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{fontSize: '2rem'}}>👨‍⚕️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-200/70 to-emerald-400/70 rounded-full blur-lg"></div>
          </div>
        </div>

        <div className="absolute md:hidden" style={{top: '10px', right: '10px', zIndex: 1}}>
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-200/90 to-sky-400/90 rounded-full flex items-center justify-center shadow-lg shadow-sky-200/80 character-float dramatic-pulse" style={{animationDelay: '2s', border: '4px solid rgba(14, 165, 233, 0.9)'}}>
              <div className="relative character-breathe">
                <div className="w-16 h-16 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{fontSize: '2rem'}}>👮‍♂️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-sky-200/70 to-sky-400/70 rounded-full blur-lg"></div>
          </div>
        </div>

        {/* Super Lively Background Elements - Repositioned to avoid content overlap */}
        {/* Central Moon - Moved to avoid center content */}
        <div className="absolute" style={{top: '30%', left: '20%', zIndex: -10}}>
          <div className="w-20 h-20 bg-gradient-to-br from-gray-500/20 to-gray-700/20 rounded-full flex items-center justify-center shadow-lg shadow-gray-500/15 floating" style={{animationDelay: '3s'}}>
            <div className="text-2xl">🌙</div>
          </div>
        </div>

        {/* Floating Stars - Repositioned to avoid character circles */}
        <div className="absolute" style={{top: '5%', left: '5%', zIndex: -5}}>
          <div className="w-4 h-4 bg-yellow-300/90 rounded-full floating" style={{animationDelay: '1s'}}></div>
        </div>
        <div className="absolute" style={{top: '8%', right: '5%', zIndex: -5}}>
          <div className="w-3 h-3 bg-blue-300/90 rounded-full floating" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="absolute" style={{bottom: '5%', left: '5%', zIndex: -5}}>
          <div className="w-5 h-5 bg-purple-300/90 rounded-full floating" style={{animationDelay: '4s'}}></div>
        </div>
        <div className="absolute" style={{bottom: '8%', right: '5%', zIndex: -5}}>
          <div className="w-3 h-3 bg-green-300/90 rounded-full floating" style={{animationDelay: '5s'}}></div>
        </div>
        <div className="absolute" style={{top: '12%', left: '15%', zIndex: -5}}>
          <div className="w-4 h-4 bg-pink-300/90 rounded-full floating" style={{animationDelay: '6s'}}></div>
        </div>
        <div className="absolute" style={{top: '15%', right: '15%', zIndex: -5}}>
          <div className="w-3 h-3 bg-orange-300/90 rounded-full floating" style={{animationDelay: '7s'}}></div>
        </div>
        <div className="absolute" style={{top: '18%', left: '25%', zIndex: -5}}>
          <div className="w-2 h-2 bg-cyan-300/90 rounded-full floating" style={{animationDelay: '8s'}}></div>
        </div>
        <div className="absolute" style={{bottom: '12%', left: '12%', zIndex: -5}}>
          <div className="w-3 h-3 bg-rose-300/90 rounded-full floating" style={{animationDelay: '9s'}}></div>
        </div>
        <div className="absolute" style={{top: '22%', right: '12%', zIndex: -5}}>
          <div className="w-4 h-4 bg-lime-300/90 rounded-full floating" style={{animationDelay: '10s'}}></div>
        </div>

        {/* Floating Sparkles - Repositioned to avoid main content area */}
        <div className="absolute" style={{top: '10%', left: '35%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '2.5s', opacity: 0.9}}>✨</div>
        </div>
        <div className="absolute" style={{bottom: '10%', left: '25%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '4.5s', opacity: 0.9}}>✨</div>
        </div>
        <div className="absolute" style={{top: '25%', right: '8%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '6.5s', opacity: 0.9}}>✨</div>
        </div>
        <div className="absolute" style={{bottom: '15%', left: '35%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '8.5s', opacity: 0.9}}>✨</div>
        </div>
        <div className="absolute" style={{top: '20%', left: '8%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '10.5s', opacity: 0.9}}>✨</div>
        </div>

        {/* Floating Clouds - Repositioned to edges */}
        <div className="absolute" style={{top: '2%', left: '20%', zIndex: -8}}>
          <div className="text-3xl floating" style={{animationDelay: '8s', opacity: 0.8}}>☁️</div>
        </div>
        <div className="absolute" style={{bottom: '2%', right: '20%', zIndex: -8}}>
          <div className="text-3xl floating" style={{animationDelay: '9s', opacity: 0.8}}>☁️</div>
        </div>
        <div className="absolute" style={{top: '1%', right: '30%', zIndex: -8}}>
          <div className="text-2xl floating" style={{animationDelay: '11s', opacity: 0.8}}>☁️</div>
        </div>
        <div className="absolute" style={{bottom: '1%', left: '30%', zIndex: -8}}>
          <div className="text-2xl floating" style={{animationDelay: '12s', opacity: 0.8}}>☁️</div>
        </div>

        {/* Floating Hearts - Repositioned to avoid content */}
        <div className="absolute" style={{top: '28%', left: '8%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '3.5s', opacity: 0.9}}>💖</div>
        </div>
        <div className="absolute" style={{bottom: '18%', left: '35%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '7.5s', opacity: 0.9}}>💖</div>
        </div>
        <div className="absolute" style={{top: '35%', right: '5%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '11.5s', opacity: 0.9}}>💖</div>
        </div>

        {/* Floating Stars - Repositioned */}
        <div className="absolute" style={{top: '6%', right: '25%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '5.5s', opacity: 0.9}}>⭐</div>
        </div>
        <div className="absolute" style={{bottom: '6%', right: '35%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '9.5s', opacity: 0.9}}>⭐</div>
        </div>
        <div className="absolute" style={{bottom: '8%', left: '25%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '13.5s', opacity: 0.9}}>⭐</div>
        </div>

        {/* Floating Fire - Repositioned */}
        <div className="absolute" style={{top: '12%', left: '45%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '6.8s', opacity: 0.9}}>🔥</div>
        </div>
        <div className="absolute" style={{bottom: '12%', left: '18%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '12.8s', opacity: 0.9}}>🔥</div>
        </div>

        {/* Floating Lightning - Repositioned */}
        <div className="absolute" style={{top: '16%', right: '35%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '7.2s', opacity: 0.9}}>⚡</div>
        </div>
        <div className="absolute" style={{bottom: '16%', right: '18%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '13.2s', opacity: 0.9}}>⚡</div>
        </div>

        {/* Floating Rainbow - Repositioned */}
        <div className="absolute" style={{top: '40%', left: '8%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '8.8s', opacity: 0.9}}>🌈</div>
        </div>
        <div className="absolute" style={{top: '32%', right: '8%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '14.8s', opacity: 0.9}}>🌈</div>
        </div>

        {/* Floating Sun - Repositioned */}
        <div className="absolute" style={{top: '3%', left: '70%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '9.8s', opacity: 0.9}}>☀️</div>
        </div>
        <div className="absolute" style={{bottom: '3%', right: '50%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '15.8s', opacity: 0.9}}>☀️</div>
        </div>

        {/* Floating Music Notes - Repositioned */}
        <div className="absolute" style={{top: '38%', left: '8%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '10.8s', opacity: 0.9}}>🎵</div>
        </div>
        <div className="absolute" style={{bottom: '38%', left: '45%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '16.8s', opacity: 0.9}}>🎵</div>
        </div>

        {/* Floating Party Elements - Repositioned */}
        <div className="absolute" style={{top: '45%', right: '8%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '11.8s', opacity: 0.9}}>🎉</div>
        </div>
        <div className="absolute" style={{bottom: '5%', left: '15%', zIndex: -5}}>
          <div className="text-2xl floating" style={{animationDelay: '17.8s', opacity: 0.9}}>🎉</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md space-y-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
              🐺 Werwolf
            </h1>
            <div className="bg-gradient-to-r from-slate-800/80 via-indigo-800/80 to-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-500/30 shadow-2xl">
              <p className="text-xl text-amber-200 mb-2 font-semibold">
                Video-Conference Companion
              </p>
              <p className="text-sm text-slate-300">
                Host-controlled, zero-typing play
              </p>
            </div>
          </div>

          {/* Game Code Display */}
          {gameCode && (
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30 shadow-lg">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Game Code</p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl font-mono font-bold text-white">
                    {gameCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
                    aria-label="Copy game code"
                  >
                    <Copy className="w-4 h-4 text-gray-300" />
                  </button>
                </div>
                {copySuccess && (
                  <p className="text-sm text-green-400 mt-2">Copied!</p>
                )}
              </div>
            </div>
          )}

          {/* Start New Game */}
          <div className="bg-gradient-to-br from-slate-800/90 via-indigo-800/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-500/30 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">👑</div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                Start New Game
              </h2>
              <p className="text-sm text-slate-300 mt-1">Become the Host</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Host Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-500/50 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-300"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>
              
              <button
                onClick={handleStartGame}
                disabled={!playerName.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                👑 Create Game
              </button>
            </div>
          </div>

          {/* Join Existing Game */}
          <div className="bg-gradient-to-br from-slate-800/90 via-indigo-800/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-500/30 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">⚔️</div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">
                Join Game
              </h2>
              <p className="text-sm text-slate-300 mt-1">Enter the Game</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Game Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-500/50 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono text-center text-white placeholder-slate-300"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Player Name
                </label>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-500/50 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 text-white placeholder-slate-300"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>
              
              <button
                onClick={handleJoinGame}
                disabled={!joinCode.trim() || !joinName.trim() || joinCode.length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                ⚔️ Enter Game
              </button>
            </div>
          </div>

          {/* Rules */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-3">
              How This Works
            </h3>
            <div className="text-sm text-gray-300 space-y-2">
              <p>• <strong className="text-white">6-20 players</strong> required to start</p>
              <p>• <strong className="text-white">No typing during play</strong> - just click!</p>
              <p>• <strong className="text-white">Host controls</strong> the game flow</p>
              <p>• <strong className="text-white">All conversation</strong> happens in your video call</p>
              <p>• <strong className="text-white">Mobile-friendly</strong> design</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
