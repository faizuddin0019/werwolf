'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAtom } from 'jotai'
import { 
  gameAtom, 
  playersAtom, 
  currentPlayerAtom, 
  gameIdAtom, 
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

declare global {
  interface Window {
    setGameDataFromAPI: (gameId: string) => Promise<void>
    resetWerwolfState: () => void
  }
}

// Make reset available as early as possible (before React mounts)
if (typeof window !== 'undefined') {
  if (!window.resetWerwolfState) {
    window.resetWerwolfState = () => {
      try {
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        localStorage.removeItem('werwolf-client-id')
      } catch {}
      // Soft reload to remount HomePage
      window.location.replace('/')
    }
  }
}

type GameState = 'welcome' | 'lobby' | 'playing' | 'ended'

export default function HomePage() {
  const [gameState, setGameState] = useState<GameState>('welcome')
  const [game] = useAtom(gameAtom)
  const [players] = useAtom(playersAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [, setGameId] = useAtom(gameIdAtom)
  const [playerName, setPlayerName] = useAtom(playerNameAtom)
  const [clientId, setClientId] = useAtom(clientIdAtom)
  const [, setGameData] = useAtom(setGameDataAtom)
  const [, resetGame] = useAtom(resetGameAtom)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  // Track if client ID has been initialized to prevent infinite loops
  const clientIdInitialized = useRef(false)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Persist game state to localStorage
  const saveGameState = (state: GameState) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('werwolf-game-state', state)
    }
  }

  // Load game state from localStorage
  const loadGameState = (): GameState => {
    if (typeof window === 'undefined') return 'welcome'
    return (localStorage.getItem('werwolf-game-state') as GameState) || 'welcome'
  }

  // Restore game from saved state
  const restoreGame = async (code: string, clientId: string) => {
    try {
      // Safety check: ensure code is valid
      if (!code || code === '1' || code.length < 6) {
        console.warn('🔧 restoreGame: Invalid game code, skipping restore:', code)
        setGameState('welcome')
        return
      }
      
      setIsLoading(true)
      const response = await fetch(`/api/games?code=${code}`, {
        headers: { 'Cookie': `clientId=${clientId}` }
      })
      
      if (response.ok) {
        const gameData = await response.json()
        
        // Find the current player in the game
        const currentPlayer = gameData.players.find((p: { client_id: string }) => p.client_id === clientId)
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Restore Game Debug:', {
            clientId,
            gameDataPlayers: gameData.players.map((p: { id: string; name: string; client_id: string; is_host: boolean }) => ({ id: p.id, name: p.name, client_id: p.client_id, is_host: p.is_host })),
            foundCurrentPlayer: currentPlayer ? { id: currentPlayer.id, name: currentPlayer.name, client_id: currentPlayer.client_id, is_host: currentPlayer.is_host } : null,
            gameHostClientId: gameData.game.host_client_id,
            clientIdMatch: gameData.players.some((p: { client_id: string }) => p.client_id === clientId)
          })
        }
        
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
          if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Player not found in game - kicking out to welcome screen:', {
              clientId,
              gamePlayers: gameData.players.map((p: { id: string; name: string; client_id: string }) => ({ id: p.id, name: p.name, client_id: p.client_id }))
            })
          }
          setGameState('welcome')
          // Clear saved state since player is not in the game
          localStorage.removeItem('werwolf-game-state')
          localStorage.removeItem('werwolf-game-code')
          localStorage.removeItem('werwolf-player-name')
          localStorage.removeItem('werwolf-client-id')
        }
      } else {
        // Game not found, reset to welcome
        console.warn('🔧 Game not found during restore, resetting to welcome')
        setGameState('welcome')
        // Clear saved state since game doesn't exist
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        localStorage.removeItem('werwolf-client-id')
      }
    } catch (error) {
      console.error('🔧 Error restoring game:', error)
      setGameState('welcome')
    } finally {
      setIsLoading(false)
    }
  }

  // Restore game state on page load (with strict validation and ?reset)
  useEffect(() => {
    // URL-based one-shot reset for Safari
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.get('reset') === '1') {
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        localStorage.removeItem('werwolf-client-id')
        window.history.replaceState({}, '', url.pathname)
        setGameState('welcome')
        return
      }
    } catch {}

    const savedState = loadGameState()
    const savedGameCode = localStorage.getItem('werwolf-game-code')
    const savedPlayerName = localStorage.getItem('werwolf-player-name')
    const savedClientId = localStorage.getItem('werwolf-client-id')
    
    if (savedGameCode && savedPlayerName && savedClientId) {
      // Check if the saved client ID is from the current browser
      if (isClientIdFromCurrentBrowser(savedClientId)) {
        setGameId(savedGameCode)
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
      // Incomplete or stale local storage → force welcome and sanitize
      localStorage.removeItem('werwolf-game-state')
      localStorage.removeItem('werwolf-game-code')
      localStorage.removeItem('werwolf-player-name')
      localStorage.removeItem('werwolf-client-id')
      setGameState('welcome')
    }
  }, []) // Only run once on mount

  // Enable real-time sync when we have a game - only call when gameId exists
  const gameId = game?.code || null
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Current game atom:', game)
    console.log('🔧 gameId:', gameId)
  }
  
  // Re-enabled real-time sync - fixed infinite loop
  useRealtimeSync(gameId, () => {
    // Game ended - redirect to welcome page
    setGameState('welcome')
  })

  // Auto-detect and process API responses
  useEffect(() => {
    const checkForGameUpdates = async () => {
      // Check if there's a game code in localStorage that we haven't processed
      const savedGameCode = localStorage.getItem('werwolf-game-code')
      if (savedGameCode && savedGameCode !== gameId) {
        console.log('🔧 Found saved game code:', savedGameCode, 'Current gameId:', gameId)
        
        try {
          // Fetch game data by code
          const gameResponse = await fetch(`/api/games?code=${savedGameCode}`, {
            headers: { 'Cookie': `clientId=${clientId}` }
          })
          if (gameResponse.ok) {
            const gameData = await gameResponse.json()
            console.log('🔧 Auto-fetched game data:', gameData)
            
            // Set the game data in the atom
            setGameData({
              game: gameData.game,
              players: gameData.players || [],
              currentPlayer: gameData.currentPlayer
            })
            
            // Set the gameId atom
            setGameId(savedGameCode)
            
            // Update game state based on actual phase
            if (gameData.game.phase === 'lobby') {
              setGameState('lobby')
              saveGameState('lobby')
            } else if (gameData.game.phase === 'ended') {
              setGameState('ended')
              saveGameState('ended')
            } else {
              setGameState('playing')
              saveGameState('playing')
            }
            
            console.log('🔧 Game data auto-set from saved game code')
          }
        } catch (error) {
          console.error('Error auto-setting game data:', error)
        }
      }
    }

    // Check for updates every 2 seconds
    const interval = setInterval(checkForGameUpdates, 2000)
    
    // Also check immediately
    checkForGameUpdates()
    
    return () => clearInterval(interval)
  }, [gameId, setGameData, setGameId, setGameState])

  // Global function to set game data from API responses (for manual testing)
  const setGameDataFromAPI = useCallback(async (gameId: string) => {
    try {
      console.log('🔧 setGameDataFromAPI called with gameId:', gameId)
      
      // Fetch game data by code
      const gameResponse = await fetch(`/api/games?code=${gameId}`, {
        headers: { 'Cookie': `clientId=${clientId}` }
      })
      if (gameResponse.ok) {
        const gameData = await gameResponse.json()
        console.log('🔧 API Game data fetched:', gameData)
        
        // Set the game data in the atom
        setGameData({
          game: gameData.game,
          players: gameData.players || [],
          currentPlayer: gameData.currentPlayer
        })
        
        // Set the gameId atom
        setGameId(gameId)
        
        // Update game state
        setGameState('lobby')
        
        console.log('🔧 Game data set from API response')
      }
    } catch (error) {
      console.error('Error setting game data from API:', error)
    }
  }, [setGameData, setGameId, setGameState])

  // Make setGameDataFromAPI available globally (for testing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.setGameDataFromAPI = setGameDataFromAPI
    }
  }, [setGameDataFromAPI])

  // Expose a safe reset helper for Safari users with disabled private mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.resetWerwolfState = () => {
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        localStorage.removeItem('werwolf-client-id')
        setGameState('welcome')
      }
    }
  }, [])

  // Generate browser-specific client ID if not exists
  useEffect(() => {
    // Only run once to prevent infinite loops
    if (clientIdInitialized.current) return
    
        if (!clientId) {
          const newClientId = getOrCreateBrowserClientId()
          if (process.env.NODE_ENV === 'development') console.log('🔧 Generated new client ID:', newClientId)
          setClientId(newClientId)
          clientIdInitialized.current = true
        } else {
          // Check if the existing client ID is from the current browser
          const isFromCurrentBrowser = isClientIdFromCurrentBrowser(clientId)
          if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Client ID validation:', {
              existingClientId: clientId,
              isFromCurrentBrowser,
              currentFingerprint: typeof window !== 'undefined' ? 'Browser fingerprint available' : 'N/A'
            })
          }
          
          if (!isFromCurrentBrowser) {
            // Client ID is from a different browser, generate a new one
            const newClientId = getOrCreateBrowserClientId()
            if (process.env.NODE_ENV === 'development') console.log('🔧 Client ID from different browser, generated new one:', newClientId)
            setClientId(newClientId)
            // Clear any saved game state since this is a different browser
            localStorage.removeItem('werwolf-game-state')
            localStorage.removeItem('werwolf-game-code')
            localStorage.removeItem('werwolf-player-name')
            setGameState('welcome')
          }
          clientIdInitialized.current = true
        }
  }, [clientId]) // Remove setClientId from dependencies

  // Update game state based on game phase
  useEffect(() => {
    if (game) {
      console.log('🔧 Game phase changed:', game.phase, 'Current gameState:', gameState)
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

  const handleStartGame = async () => {
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
      if (!data.gameId || data.gameId === '1' || data.gameId.length < 6) {
        throw new Error('Invalid game code received from server')
      }
      const gameResponse = await fetch(`/api/games?code=${data.gameId}`, {
        headers: { 'Cookie': `clientId=${clientId}` }
      })
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Game response status:', gameResponse.status, 'ok:', gameResponse.ok)
      }
      if (gameResponse.ok) {
        const gameData = await gameResponse.json()
        if (process.env.NODE_ENV === 'development') {
          console.log('handleStartGame - Setting game data:', {
            game: data.game,
            players: gameData.players || [data.player],
            currentPlayer: data.player
          })
        }
        console.log('🔧 About to call setGameData with:', {
          game: data.game,
          players: gameData.players || [data.player],
          currentPlayer: data.player
        })
        
        // Ensure game.code is set to the gameId
        const gameWithCode = { ...data.game, code: data.gameId }
        
        setGameData({
          game: gameWithCode,
          players: gameData.players || [data.player],
          currentPlayer: data.player
        })
        
        // Debug: Check if game atom was set
        console.log('🔧 After setGameData - game atom should be set to:', gameWithCode)
      } else {
        // Fallback to just the host if we can't fetch all players
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 TAKING FALLBACK PATH - Game response not ok')
          console.log('handleStartGame - Fallback setting game data:', {
            game: data.game,
            players: [data.player],
            currentPlayer: data.player
          })
        }
        console.log('🔧 About to call setGameData (fallback) with:', {
          game: data.game,
          players: [data.player],
          currentPlayer: data.player
        })
        
        // Ensure game.code is set to the gameId
        const gameWithCode = { ...data.game, code: data.gameId }
        
        setGameData({
          game: gameWithCode,
          players: [data.player],
          currentPlayer: data.player
        })
        
        console.log('🔧 After setGameData (fallback) - game atom should be set to:', gameWithCode)
      }
      
      setGameId(data.gameId)
      setGameState('lobby')
      
      // Save state to localStorage
      localStorage.setItem('werwolf-game-code', data.gameId)
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
          gameId: code,
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
      // Ensure game.code is set to the gameId
      const gameWithCode = { ...joinData.game, code: code }
      
      setGameData({
        game: gameWithCode,
        players: joinData.players || [joinData.player],
        currentPlayer: joinData.player
      })
      
      setGameId(code)
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
      if (process.env.NODE_ENV === 'development') console.log('🔧 Submitting leave request for player:', currentPlayer.name)
      
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
      if (process.env.NODE_ENV === 'development') console.log('🔧 Leave request submitted successfully:', result.message)
      
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
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Approve Leave Result:', {
          success: result.success,
          gameEnded: result.gameEnded,
          gameReset: result.gameReset,
          message: result.message
        })
      }
      
      // If game ended due to insufficient players, redirect to welcome
      if (result.gameEnded) {
        if (process.env.NODE_ENV === 'development') console.log('🔧 Game ended due to insufficient players - redirecting to welcome')
        // Clear localStorage and reset to welcome
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        localStorage.removeItem('werwolf-client-id')
        
        resetGame()
        setGameState('welcome')
      } else if (result.gameReset) {
        if (process.env.NODE_ENV === 'development') console.log('🔧 Game reset to lobby due to insufficient players - staying in lobby')
        // Game was reset to lobby state, real-time sync will handle the update
        // Players stay in the same game but game state is reset
      } else {
        if (process.env.NODE_ENV === 'development') console.log('🔧 Game continues - player left successfully')
        // The real-time sync should handle updating the player list
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
      if (process.env.NODE_ENV === 'development') console.log('Leave denied:', result.message)
      
    } catch (err) {
      console.error('Error denying leave:', err)
      setError(err instanceof Error ? err.message : 'Failed to deny leave')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeRole = async (playerId: string, newRole: string) => {
    if (!game || !currentPlayer) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          action: 'change_role',
          clientId: currentPlayer.client_id,
          data: { playerId, newRole }
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change role')
      }
      
      const result = await response.json()
      if (process.env.NODE_ENV === 'development') console.log('Role changed:', result.message)
      
    } catch (err) {
      console.error('Error changing role:', err)
      setError(err instanceof Error ? err.message : 'Failed to change role')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePlayer = async (playerId: string) => {
    if (!game || !currentPlayer) return
    
    setIsLoading(true)
    setError(null)
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Remove Player Debug:', {
        gameId: game.code,
        currentPlayerId: currentPlayer.id,
        currentPlayerName: currentPlayer.name,
        isHost: currentPlayer.is_host,
        playerToRemoveId: playerId,
        totalPlayers: players.length
      })
    }
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
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
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Remove Player Result:', {
          success: result.success,
          gameEnded: result.gameEnded,
          gameReset: result.gameReset,
          message: result.message,
          totalPlayersBefore: players.length,
          expectedPlayersAfter: players.length - 1,
          currentPlayersList: players.map(p => ({ id: p.id, name: p.name }))
        })
      }
      
      // If game ended due to insufficient players, redirect to welcome
      if (result.gameEnded) {
        if (process.env.NODE_ENV === 'development') console.log('🔧 Game ended due to insufficient players - redirecting to welcome')
        
        // Clear localStorage and reset to welcome
        localStorage.removeItem('werwolf-game-state')
        localStorage.removeItem('werwolf-game-code')
        localStorage.removeItem('werwolf-player-name')
        localStorage.removeItem('werwolf-client-id')
        
        resetGame()
        setGameState('welcome')
      } else if (result.gameReset) {
        if (process.env.NODE_ENV === 'development') console.log('🔧 Game reset to lobby due to insufficient players - staying in lobby')
        // Game was reset to lobby state, real-time sync will handle the update
        // Players stay in the same game but game state is reset
      } else {
        if (process.env.NODE_ENV === 'development') console.log('🔧 Game continues - player removed successfully')
        // The real-time sync should handle updating the player list
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
    
    console.log('🔧 Frontend: handleAssignRoles called', { gameId: game.code, hostClientId: game.host_client_id, currentPlayerClientId: currentPlayer.client_id })
    
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
        console.error('❌ Frontend: Assign roles failed:', error)
        throw new Error(error.error || 'Failed to assign roles')
      }
      
      const result = await response.json()
      console.log('✅ Frontend: Assign roles successful:', result)
      
            // Play howling sound effect
            playSoundEffect('howl')
            
            // Don't set game state to 'playing' immediately
            // Let the real-time sync handle the state transition based on game phase
            // setGameState('playing')
    } catch (err) {
      console.error('❌ Frontend: Assign roles error:', err)
      setError(err instanceof Error ? err.message : 'Failed to assign roles')
    } finally {
      setIsLoading(false)
    }
  }


  const playSoundEffect = (sound: 'howl' | 'ticktock') => {
    // Create audio element and play sound
    const audio = new Audio(`/sounds/${sound}.mp3`)
    audio.volume = 0.5
    audio.loop = false
    
    // Play sound for 4 seconds
    audio.play().catch(err => {
      if (process.env.NODE_ENV === 'development') console.log('Could not play sound:', err)
    })
    
    // Stop sound after 4 seconds
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 4000)
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

  // TODO: Temporarily removed !isClient check to debug infinite loop
  // if (!isClient) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
  //         <p className="text-lg text-gray-300 mt-4">Loading...</p>
  //       </div>
  //     </div>
  //   )
  // }

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
          onChangeRole={handleChangeRole}
        />
      )
    
    case 'playing':
    case 'ended':
      return (
        <GameScreen
          onEndGame={handleEndGame}
          onRemovePlayer={handleRemovePlayer}
          onChangeRole={handleChangeRole}
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