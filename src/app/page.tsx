'use client'

import { useState, useEffect } from 'react'
import { useAtom } from 'jotai'
import { 
  gameAtom, 
  playersAtom, 
  currentPlayerAtom, 
  gameCodeAtom, 
  playerNameAtom, 
  clientIdAtom,
  setGameDataAtom,
  resetGameAtom
} from '@/lib/game-store'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { getOrCreateBrowserClientId, isClientIdFromCurrentBrowser } from '@/lib/browser-fingerprint'
import { isSupabaseConfigured } from '@/lib/supabase'
import WelcomeScreen from '@/components/WelcomeScreen'
import GameLobby from '@/components/GameLobby'
import GameScreen from '@/components/GameScreen'
import DemoMode from '@/components/DemoMode'

type GameState = 'welcome' | 'lobby' | 'playing' | 'ended'

export default function HomePage() {
  const [gameState, setGameState] = useState<GameState>('welcome')
  const [game] = useAtom(gameAtom)
  const [players] = useAtom(playersAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [gameCode, setGameCode] = useAtom(gameCodeAtom)
  const [playerName, setPlayerName] = useAtom(playerNameAtom)
  const [clientId, setClientId] = useAtom(clientIdAtom)
  const [, setGameData] = useAtom(setGameDataAtom)
  const [, resetGame] = useAtom(resetGameAtom)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Persist game state to localStorage
  const saveGameState = (state: GameState) => {
    localStorage.setItem('werwolf-game-state', state)
  }

  // Load game state from localStorage
  const loadGameState = (): GameState => {
    if (typeof window === 'undefined') return 'welcome'
    return (localStorage.getItem('werwolf-game-state') as GameState) || 'welcome'
  }

  // Restore game state on page load
  useEffect(() => {
    const savedState = loadGameState()
    const savedGameCode = localStorage.getItem('werwolf-game-code')
    const savedPlayerName = localStorage.getItem('werwolf-player-name')
    const savedClientId = localStorage.getItem('werwolf-client-id')
    
    if (savedGameCode && savedPlayerName && savedClientId) {
      // Check if the saved client ID is from the current browser
      if (isClientIdFromCurrentBrowser(savedClientId)) {
        setGameCode(savedGameCode)
        setPlayerName(savedPlayerName)
        setClientId(savedClientId)
        
        // If we have a saved game state, try to restore the game
        if (savedState !== 'welcome' && savedGameCode) {
          restoreGame(savedGameCode, savedClientId)
        } else {
          setGameState(savedState)
        }
      } else {
        // Client ID is from a different browser, clear saved state
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        localStorage.removeItem('werwolf-client-id')
        setGameState('welcome')
      }
    } else {
      setGameState(savedState)
    }
  }, [])

  // Enable real-time sync when we have a game
  console.log('useRealtimeSync called with gameId:', game?.id || null)
  useRealtimeSync(game?.id || null, () => {
    // Game ended - redirect to welcome page
    setGameState('welcome')
  })

  // Restore game from saved state
  const restoreGame = async (code: string, clientId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/games?code=${code}`)
      
      if (response.ok) {
        const gameData = await response.json()
        
        // Find the current player in the game
        const currentPlayer = gameData.players.find((p: any) => p.client_id === clientId)
        
        if (currentPlayer) {
          setGameData({
            game: gameData.game,
            players: gameData.players,
            currentPlayer: currentPlayer
          })
          
          // Set the appropriate game state based on game phase
          if (gameData.game.phase === 'lobby') {
            setGameState('lobby')
          } else if (gameData.game.phase === 'ended') {
            setGameState('ended')
          } else {
            setGameState('playing')
          }
        } else {
          // Player not found in game, reset to welcome
          setGameState('welcome')
          localStorage.removeItem('werwolf-game-state')
          localStorage.removeItem('werwolf-game-code')
        }
      } else {
        // Game not found, reset to welcome
        setGameState('welcome')
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
      }
    } catch (error) {
      console.error('Error restoring game:', error)
      setGameState('welcome')
    } finally {
      setIsLoading(false)
    }
  }

  // Generate browser-specific client ID if not exists
  useEffect(() => {
    if (!clientId) {
      const newClientId = getOrCreateBrowserClientId()
      setClientId(newClientId)
    } else {
      // Check if the existing client ID is from the current browser
      if (!isClientIdFromCurrentBrowser(clientId)) {
        // Client ID is from a different browser, generate a new one
        const newClientId = getOrCreateBrowserClientId()
        setClientId(newClientId)
        // Clear any saved game state since this is a different browser
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        setGameState('welcome')
      }
    }
  }, [clientId, setClientId])

  // Update game state based on game phase
  useEffect(() => {
    if (game) {
      if (game.phase === 'lobby') {
        setGameState('lobby')
        saveGameState('lobby')
      } else if (game.phase === 'ended') {
        setGameState('ended')
        saveGameState('ended')
      } else {
        setGameState('playing')
        saveGameState('playing')
      }
    }
  }, [game])

  const handleStartGame = async (code: string) => {
    if (!playerName.trim() || !clientId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostName: playerName.trim(),
          clientId
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create game')
      }
      
      const data = await response.json()
      
      // Fetch all players in the game to get complete list
      const gameResponse = await fetch(`/api/games?code=${data.gameCode}`)
      if (gameResponse.ok) {
        const gameData = await gameResponse.json()
        console.log('handleStartGame - Setting game data:', {
          game: data.game,
          players: gameData.players || [data.player],
          currentPlayer: data.player
        })
        setGameData({
          game: data.game,
          players: gameData.players || [data.player],
          currentPlayer: data.player
        })
      } else {
        // Fallback to just the host if we can't fetch all players
        console.log('handleStartGame - Fallback setting game data:', {
          game: data.game,
          players: [data.player],
          currentPlayer: data.player
        })
        setGameData({
          game: data.game,
          players: [data.player],
          currentPlayer: data.player
        })
      }
      
      setGameCode(data.gameCode)
      setGameState('lobby')
      
      // Save state to localStorage
      localStorage.setItem('werwolf-game-code', data.gameCode)
      localStorage.setItem('werwolf-player-name', playerName.trim())
      localStorage.setItem('werwolf-client-id', clientId)
      saveGameState('lobby')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinGame = async (code: string, joinPlayerName: string) => {
    if (!code || !joinPlayerName || !clientId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Join the game directly - the API will validate the game exists
      const joinResponse = await fetch('/api/games/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameCode: code,
          playerName: joinPlayerName.trim(),
          clientId
        }),
      })
      
      if (!joinResponse.ok) {
        const error = await joinResponse.json()
        throw new Error(error.error || 'Failed to join game')
      }
      
      const joinData = await joinResponse.json()
      
      // Set game data with all players from the join response
      setGameData({
        game: joinData.game,
        players: joinData.players || [joinData.player],
        currentPlayer: joinData.player
      })
      
      setGameCode(code)
      setGameState('lobby')
      
      // Save state to localStorage
      localStorage.setItem('werwolf-game-code', code)
      localStorage.setItem('werwolf-player-name', joinPlayerName.trim())
      localStorage.setItem('werwolf-client-id', clientId)
      saveGameState('lobby')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndGame = async () => {
    if (!game || !currentPlayer) return
    
    // Check if current player is the host (creator of the game)
    const isHost = currentPlayer.client_id === game.host_client_id
    if (!isHost) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'end_game',
          clientId: currentPlayer.client_id
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to end game')
      }
      
      // Clear localStorage and reset to welcome
      localStorage.removeItem('werwolf-game-state')
      localStorage.removeItem('werwolf-game-code')
      localStorage.removeItem('werwolf-player-name')
      localStorage.removeItem('werwolf-client-id')
      
      resetGame()
      setGameState('welcome')
      
    } catch (err) {
      console.error('Error ending game:', err)
      setError(err instanceof Error ? err.message : 'Failed to end game')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestLeave = async () => {
    if (!game || !currentPlayer) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'request_leave',
          clientId: currentPlayer.client_id
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to request leave')
      }
      
      const result = await response.json()
      console.log('Leave request submitted:', result.message)
      
    } catch (err) {
      console.error('Error requesting leave:', err)
      setError(err instanceof Error ? err.message : 'Failed to request leave')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveLeave = async (playerId: string) => {
    if (!game || !currentPlayer) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve_leave',
          clientId: currentPlayer.client_id,
          data: { playerId }
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve leave')
      }
      
      const result = await response.json()
      console.log('Leave approved:', result.message)
      
      // If game ended due to insufficient players, redirect to welcome
      if (result.gameEnded) {
        // Clear localStorage and reset to welcome
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        localStorage.removeItem('werwolf-client-id')
        
        resetGame()
        setGameState('welcome')
      }
      
    } catch (err) {
      console.error('Error approving leave:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve leave')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDenyLeave = async (playerId: string) => {
    if (!game || !currentPlayer) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deny_leave',
          clientId: currentPlayer.client_id,
          data: { playerId }
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to deny leave')
      }
      
      const result = await response.json()
      console.log('Leave denied:', result.message)
      
    } catch (err) {
      console.error('Error denying leave:', err)
      setError(err instanceof Error ? err.message : 'Failed to deny leave')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    if (!game || !currentPlayer) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove_player',
          clientId: currentPlayer.client_id,
          data: { playerId }
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove player')
      }
      
      const result = await response.json()
      console.log('Player removed:', result.message)
      
      // If game ended due to insufficient players, redirect to welcome
      if (result.gameEnded) {
        // Clear localStorage and reset to welcome
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        localStorage.removeItem('werwolf-client-id')
        
        resetGame()
        setGameState('welcome')
      }
      
    } catch (err) {
      console.error('Error removing player:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove player')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignRoles = async () => {
    if (!game || !currentPlayer) return
    
    // Check if current player is the host (creator of the game)
    const isHost = currentPlayer.client_id === game.host_client_id
    if (!isHost) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'assign_roles',
          clientId: currentPlayer.client_id
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign roles')
      }
      
      // Play howling sound effect
      playSoundEffect('howl')
      
      setGameState('playing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign roles')
    } finally {
      setIsLoading(false)
    }
  }


  const playSoundEffect = (sound: 'howl' | 'ticktock') => {
    // Create audio element and play sound
    const audio = new Audio(`/sounds/${sound}.mp3`)
    audio.volume = 0.5
    audio.play().catch(err => {
      console.log('Could not play sound:', err)
    })
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded mb-4 backdrop-blur-sm">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => {
              setError(null)
              setGameState('welcome')
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Show demo mode if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return <DemoMode />
  }

  // Render appropriate screen based on game state
  switch (gameState) {
    case 'welcome':
      return (
        <WelcomeScreen
          onStartGame={handleStartGame}
          onJoinGame={handleJoinGame}
        />
      )
    
    case 'lobby':
      return (
        <GameLobby
          onAssignRoles={handleAssignRoles}
          onEndGame={handleEndGame}
          onRequestLeave={handleRequestLeave}
          onApproveLeave={handleApproveLeave}
          onDenyLeave={handleDenyLeave}
          onRemovePlayer={handleRemovePlayer}
        />
      )
    
    case 'playing':
    case 'ended':
      return (
        <GameScreen
          onEndGame={handleEndGame}
        />
      )
    
    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-300">Unknown game state</p>
            <button
              onClick={() => setGameState('welcome')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Go to Welcome
            </button>
          </div>
        </div>
      )
  }
}