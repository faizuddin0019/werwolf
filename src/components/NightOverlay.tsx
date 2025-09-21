'use client'

import { useState, useEffect } from 'react'
import { useAtom } from 'jotai'
import { 
  gameAtom, 
  currentPlayerAtom, 
  playersAtom,
  gamePhaseAtom,
  roundStateAtom
} from '@/lib/game-store'
import { canPlayerAct } from '@/lib/game-utils'
import { 
  Moon, 
  Eye, 
  Shield, 
  Stethoscope,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function NightOverlay() {
  const [game] = useAtom(gameAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [players] = useAtom(playersAtom)
  const [gamePhase] = useAtom(gamePhaseAtom)
  const [roundState] = useAtom(roundStateAtom)
  
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const alivePlayers = players.filter(p => p.alive && p.id !== currentPlayer?.id && !p.is_host)
  const canAct = currentPlayer && canPlayerAct(currentPlayer, gamePhase, currentPlayer.is_host, roundState)

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  const handleAction = async (action: string, targetId: string) => {
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
          data: { targetId }
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Handle specific responses for different actions
        if (action === 'police_inspect' && result.result) {
          const isWerewolf = result.result === 'werewolf'
          setFeedback({ 
            type: 'success', 
            message: `Inspection result: ${isWerewolf ? 'YES - This player is a werewolf!' : 'NO - This player is not a werewolf.'}` 
          })
        } else {
          setFeedback({ type: 'success', message: 'Action completed!' })
        }
        
        setSelectedTarget(targetId)
      } else {
        const error = await response.json()
        setFeedback({ type: 'error', message: error.error || 'Action failed' })
      }
    } catch (error) {
      console.error('Error performing action:', error)
      setFeedback({ type: 'error', message: 'Failed to perform action' })
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleInfo = () => {
    if (!currentPlayer?.role) return null
    
    switch (currentPlayer.role) {
      case 'werewolf':
        return {
          icon: <Moon className="w-6 h-6 text-red-600" />,
          title: 'Werwolf Turn',
          description: 'Select a player to eliminate tonight',
          actionText: 'Eliminate',
          actionColor: 'bg-red-600 hover:bg-red-700'
        }
      case 'police':
        return {
          icon: <Shield className="w-6 h-6 text-blue-600" />,
          title: 'Police Turn',
          description: 'Select a player to inspect',
          actionText: 'Inspect',
          actionColor: 'bg-blue-600 hover:bg-blue-700'
        }
      case 'doctor':
        return {
          icon: <Stethoscope className="w-6 h-6 text-green-600" />,
          title: 'Doctor Turn',
          description: 'Select a player to save',
          actionText: 'Save',
          actionColor: 'bg-green-600 hover:bg-green-700'
        }
      default:
        return null
    }
  }

  const roleInfo = getRoleInfo()

  if (!canAct || !roleInfo) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
        <div className="text-center">
          <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gray-800 mb-1">
            Night Phase
          </h3>
          <p className="text-xs text-gray-600">
            {currentPlayer?.role === 'villager' 
              ? 'You are sleeping. Wait for your turn.'
              : 'Wait for the host to start your turn.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
      <div className="text-center mb-4">
        {roleInfo.icon}
        <h3 className="text-base font-semibold text-gray-800 mt-2 mb-1">
          {roleInfo.title}
        </h3>
        <p className="text-xs text-gray-600">
          {roleInfo.description}
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-3 p-2 rounded-md flex items-center space-x-2 ${
          feedback.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          <span className="text-xs">{feedback.message}</span>
        </div>
      )}

      {/* Player Selection */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-700">
          Select a player:
        </h4>
        
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          {alivePlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedTarget(player.id)}
              disabled={isLoading}
              className={`p-2 rounded-md border-2 transition-all text-left ${
                selectedTarget === player.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-600">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-800 truncate">
                  {player.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Button */}
      {selectedTarget && (
        <div className="mt-4">
          <button
            onClick={() => {
              const action = currentPlayer.role === 'werewolf' ? 'wolf_select' :
                           currentPlayer.role === 'police' ? 'police_inspect' :
                           currentPlayer.role === 'doctor' ? 'doctor_save' : null
              
              if (action) {
                handleAction(action, selectedTarget)
              }
            }}
            disabled={isLoading}
            className={`w-full py-2 px-3 text-white rounded-md transition-colors flex items-center justify-center space-x-2 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm ${roleInfo.actionColor}`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              <>
                {currentPlayer.role === 'werewolf' && <Moon className="w-3 h-3" />}
                {currentPlayer.role === 'police' && <Shield className="w-3 h-3" />}
                {currentPlayer.role === 'doctor' && <Stethoscope className="w-3 h-3" />}
                <span>{roleInfo.actionText}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {currentPlayer.role === 'werewolf' && 'Choose your victim carefully...'}
          {currentPlayer.role === 'police' && 'Your investigation will reveal the truth...'}
          {currentPlayer.role === 'doctor' && 'Save the innocent from harm...'}
        </p>
      </div>
    </div>
  )
}
