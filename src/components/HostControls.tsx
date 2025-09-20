'use client'

import { useState } from 'react'
import { useAtom } from 'jotai'
import { 
  gameAtom, 
  currentPlayerAtom,
  gamePhaseAtom,
  isNightPhaseAtom,
  isDayPhaseAtom,
  highestVotedPlayerAtom
} from '@/lib/game-store'
import { getNextPhase, getPhaseDisplayName } from '@/lib/game-utils'
import { 
  Play, 
  Moon, 
  Eye, 
  Vote, 
  CheckCircle, 
  XCircle,
  RotateCcw,
  Users
} from 'lucide-react'

interface HostControlsProps {
  onEndGame: () => void
}

export default function HostControls({ onEndGame }: HostControlsProps) {
  const [game] = useAtom(gameAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [gamePhase] = useAtom(gamePhaseAtom)
  const [isNightPhase] = useAtom(isNightPhaseAtom)
  const [isDayPhase] = useAtom(isDayPhaseAtom)
  const [highestVotedPlayer] = useAtom(highestVotedPlayerAtom)
  
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
        return 'Assign Roles'
      case 'next_phase':
        // Show specific phase-based labels for night actions
        if (gamePhase === 'night_wolf') {
          return 'Wake Up Police'
        } else if (gamePhase === 'night_police') {
          return 'Wake Up Doctor'
        } else if (gamePhase === 'night_doctor') {
          return 'Reveal the Dead'
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
        return gamePhase === 'lobby'
      case 'next_phase':
        return isNightPhase && gamePhase !== 'night_doctor'
      case 'reveal_dead':
        return gamePhase === 'night_doctor'
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
    { action: 'reveal_dead', label: 'Reveal' },
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
        {actions.map(({ action, label }) => {
          const canPerform = canPerformAction(action)
          const isCurrentAction = gamePhase === action.replace('_', '_')
          
          return (
            <button
              key={action}
              onClick={() => {
                if (action === 'end_game') {
                  if (confirm('Are you sure you want to end the game?')) {
                    onEndGame()
                  }
                } else {
                  handleAction(action)
                }
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
      
      {/* Current Phase Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <p className="font-medium">Current Phase:</p>
          <p className="text-gray-800">{getPhaseDisplayName(gamePhase)}</p>
        </div>
      </div>
    </div>
  )
}
