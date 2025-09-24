'use client'

import { useState } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { 
  gameAtom, 
  playersAtom,
  currentPlayerAtom,
  gamePhaseAtom,
  isNightPhaseAtom,
  isDayPhaseAtom,
  highestVotedPlayerAtom,
  roundStateAtom,
  gameIdAtom,
  setGameDataAtom
} from '@/lib/game-store'
import { getNextPhase, getPhaseDisplayName } from '@/lib/game-utils'
import { 
  Play, 
  Moon, 
  Eye, 
  Vote, 
  XCircle,
  RotateCcw,
  Users
} from 'lucide-react'

interface HostControlsProps {
  onEndGame: () => void
}

export default function HostControls({ onEndGame }: HostControlsProps) {
  const [game] = useAtom(gameAtom)
  const [players] = useAtom(playersAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [gamePhase] = useAtom(gamePhaseAtom)
  const [isNightPhase] = useAtom(isNightPhaseAtom)
  const [isDayPhase] = useAtom(isDayPhaseAtom)
  const [highestVotedPlayer] = useAtom(highestVotedPlayerAtom)
  const [roundState] = useAtom(roundStateAtom)
  const [gameId] = useAtom(gameIdAtom)
  const setGameData = useSetAtom(setGameDataAtom)
  
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async (action: string, data?: unknown) => {
    if (!game || !currentPlayer || isLoading) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          clientId: currentPlayer.client_id,
          data
        }),
      })
      
      if (!response.ok) {
        let errorMessage = 'Unknown error'
        try {
          const error = await response.json()
          console.error('Action failed:', error)
          errorMessage = error.error || error.message || 'Unknown error'
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        alert(`Action failed: ${errorMessage}`)
      } else {
        // Force refresh game state after successful action
        if (action === 'assign_roles') {
          console.log('🔧 Role assignment successful - refreshing state')
          setTimeout(async () => {
            try {
              const res = await fetch(`/api/games?code=${gameId}`)
              if (res.ok) {
                const data = await res.json()
                console.log('🔧 Refetched - players with roles:', data.players.filter((p: { role: string | null }) => p.role).length)
                setGameData(data)
              }
            } catch (err) {
              console.error('Error refreshing game state:', err)
            }
          }, 300)
        }
      }
    } catch (error) {
      console.error('Error performing action:', error)
      alert('Failed to perform action')
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonColor = (action: string) => {
    switch (action) {
      case 'assign_roles':
        return 'bg-purple-600 hover:bg-purple-700'
      case 'next_phase':
        return 'bg-blue-600 hover:bg-blue-700'
      case 'reveal_dead':
        return 'bg-red-600 hover:bg-red-700'
      case 'final_vote':
        return 'bg-orange-600 hover:bg-orange-700'
      case 'eliminate_player':
        return 'bg-red-600 hover:bg-red-700'
      case 'end_game':
        return 'bg-gray-600 hover:bg-gray-700'
      default:
        return 'bg-blue-600 hover:bg-blue-700'
    }
  }

  const getButtonIcon = (action: string) => {
    switch (action) {
      case 'assign_roles':
        return <Play className="w-4 h-4" />
      case 'next_phase':
        return <Moon className="w-4 h-4" />
      case 'reveal_dead':
        return <Eye className="w-4 h-4" />
      case 'final_vote':
        return <Vote className="w-4 h-4" />
      case 'eliminate_player':
        return <XCircle className="w-4 h-4" />
      case 'end_game':
        return <RotateCcw className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getButtonText = (action: string) => {
    switch (action) {
      case 'assign_roles':
        return 'Assign Roles & Start Game'
      case 'next_phase':
        // After role assignment, game stays in lobby phase and host can start night phases
        if (gamePhase === 'lobby') {
          // Check if roles have been assigned (players have roles)
          const playersWithRoles = (Array.isArray(players) ? players : [])
            .filter((p: { role: string | null; is_host: boolean }) => p.role && !p.is_host)
          if (playersWithRoles.length > 0) {
            return 'Wake Up Werwolf'
          }
        }
        
        // Show specific phase-based labels for night actions
        if (gamePhase === 'night_wolf') {
          if (!roundState?.phase_started) {
            return 'Wake Up Werwolf'
          } else if (roundState?.wolf_target_player_id) {
            return 'Wake Up Doctor'
          } else {
            return 'Wake Up Werwolf (Waiting for selection)'
          }
        } else if (gamePhase === 'night_doctor') {
          if (!roundState?.phase_started) {
            return 'Wake Up Doctor'
          } else if (roundState?.doctor_save_player_id) {
            return 'Wake Up Police'
          } else {
            return 'Wake Up Doctor (Waiting for save)'
          }
        } else if (gamePhase === 'night_police') {
          if (!roundState?.phase_started) {
            return 'Wake Up Police'
          } else if (roundState?.police_inspect_player_id) {
            return 'Reveal the Dead'
          } else {
            return 'Wake Up Police (Waiting for inspection)'
          }
        }
        return `Go to ${getNextPhase(gamePhase) === 'night_wolf' ? 'Sleep' : getPhaseDisplayName(getNextPhase(gamePhase))}`
      case 'reveal_dead':
        return 'Reveal the Dead'
      case 'begin_voting':
        return 'Begin Initial Voting'
      case 'final_vote':
        return 'Final Vote'
      case 'eliminate_player':
        return 'Eliminate Player'
      case 'end_game':
        return 'End Game'
      default:
        return 'Next Phase'
    }
  }

  const canPerformAction = (action: string) => {
    switch (action) {
      case 'assign_roles':
        {
          const playersWithRoles = (Array.isArray(players) ? players : [])
            .filter((p: { role: string | null; is_host: boolean }) => p.role && !p.is_host)
          // Disable assign_roles once roles are assigned
          return gamePhase === 'lobby' && playersWithRoles.length === 0
        }
      case 'next_phase':
        // After role assignment, game stays in lobby phase and host can start night phases
        if (gamePhase === 'lobby') {
          // Check if roles have been assigned (players have roles)
          const playersWithRoles = (Array.isArray(players) ? players : [])
            .filter((p: { role: string | null; is_host: boolean }) => p.role && !p.is_host)
          return playersWithRoles.length > 0
        }
        
        if (!isNightPhase) return false
        
        // For night phases, check if phase has been started and action completed
        if (gamePhase === 'night_wolf') {
          // Can start phase if not started yet, or advance if werwolf has selected
          return !roundState?.phase_started || roundState?.wolf_target_player_id !== null
        } else if (gamePhase === 'night_doctor') {
          // Can start phase if not started yet, or advance if doctor has saved
          return !roundState?.phase_started || roundState?.doctor_save_player_id !== null
        } else if (gamePhase === 'night_police') {
          // Can start phase if not started yet, or advance if police has inspected
          return !roundState?.phase_started || roundState?.police_inspect_player_id !== null
        }
        return false
      case 'reveal_dead':
        return gamePhase === 'night_police' && roundState?.police_inspect_player_id !== null
      case 'begin_voting':
        return gamePhase === 'reveal'
      case 'final_vote':
        return gamePhase === 'day_vote'
      case 'eliminate_player':
        return gamePhase === 'day_final_vote' && highestVotedPlayer
      case 'end_game':
        return true
      default:
        return false
    }
  }

  const actions = [
    { action: 'assign_roles', label: 'Start Game' },
    { action: 'next_phase', label: 'Next Phase' },
    // Removed duplicate explicit reveal_dead button; handled via next_phase label + routing below
    { action: 'begin_voting', label: 'Begin Voting' },
    { action: 'final_vote', label: 'Final Vote' },
    { action: 'eliminate_player', label: 'Eliminate' },
    { action: 'end_game', label: 'End Game' }
  ]

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Host Controls
      </h3>
      
      <div className="space-y-3">
        {actions
          .filter(({ action }) => {
            // Hide assign_roles when not in lobby or when roles are already assigned
            if (action === 'assign_roles') {
              if (gamePhase !== 'lobby') return false
              const playersWithRoles = (Array.isArray(players) ? players : [])
                .filter((p: { role: string | null; is_host: boolean }) => p.role && !p.is_host)
              if (playersWithRoles.length > 0) return false
            }
            return true
          })
          .map(({ action }) => {
          const canPerform = canPerformAction(action)
          
          return (
            <button
              key={action}
              onClick={() => {
                if (action === 'end_game') {
                  if (confirm('Are you sure you want to end the game?')) {
                    onEndGame()
                  }
                  return
                }
                // Route next_phase to reveal_dead when appropriate to avoid duplicate button
                const realAction = (action === 'next_phase' && gamePhase === 'night_police' && (roundState?.police_inspect_player_id !== null))
                  ? 'reveal_dead'
                  : action
                handleAction(realAction)
              }}
              disabled={!canPerform || isLoading}
              className={`w-full py-2 px-4 text-white rounded-md transition-colors flex items-center justify-center space-x-2 disabled:bg-gray-300 disabled:cursor-not-allowed ${getButtonColor(action)}`}
            >
              {getButtonIcon(action)}
              <span>{getButtonText(action)}</span>
            </button>
          )
        })}
      </div>
      
      {isLoading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Processing...</span>
        </div>
      )}
      
      {/* Action Status */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-2">Action Status:</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Werwolf:</span>
              <span className={roundState?.wolf_target_player_id ? 'text-green-600' : 'text-gray-400'}>
                {roundState?.wolf_target_player_id ? 'Target Selected' : 'Waiting'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Doctor:</span>
              <span className={roundState?.doctor_save_player_id ? 'text-green-600' : 'text-gray-400'}>
                {roundState?.doctor_save_player_id ? 'Player Saved' : 'Waiting'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Police:</span>
              <span className={roundState?.police_inspect_player_id ? 'text-green-600' : 'text-gray-400'}>
                {roundState?.police_inspect_player_id ? 'Inspection Done' : 'Waiting'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Phase Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <p className="font-medium">Current Phase:</p>
          <p className="text-gray-800">{getPhaseDisplayName(gamePhase)}</p>
          <p className="text-xs text-gray-500">Debug: {gamePhase}</p>
        </div>
      </div>
    </div>
  )
}
