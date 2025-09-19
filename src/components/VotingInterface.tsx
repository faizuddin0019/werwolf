'use client'

import { useState, useEffect } from 'react'
import { useAtom } from 'jotai'
import { 
  gameAtom, 
  currentPlayerAtom,
  playersAtom,
  gamePhaseAtom,
  currentVotesAtom
} from '@/lib/game-store'
import { Vote, CheckCircle, XCircle } from 'lucide-react'

export default function VotingInterface() {
  const [game] = useAtom(gameAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [players] = useAtom(playersAtom)
  const [gamePhase] = useAtom(gamePhaseAtom)
  const [currentVotes] = useAtom(currentVotesAtom)
  
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const alivePlayers = players.filter(p => p.alive && p.id !== currentPlayer?.id)
  const canVote = currentPlayer?.alive && ['day_vote', 'day_final_vote'].includes(gamePhase)

  // Get current vote for this player
  const currentVote = currentVotes.find(vote => vote.voter_player_id === currentPlayer?.id)

  useEffect(() => {
    if (currentVote) {
      setSelectedTarget(currentVote.target_player_id)
    }
  }, [currentVote])

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  const handleVote = async (targetId: string) => {
    if (!game || !currentPlayer || isLoading) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'vote',
          clientId: currentPlayer.client_id,
          data: { targetId }
        }),
      })
      
      if (response.ok) {
        setFeedback({ type: 'success', message: 'Vote cast!' })
        setSelectedTarget(targetId)
      } else {
        const error = await response.json()
        setFeedback({ type: 'error', message: error.error || 'Failed to vote' })
      }
    } catch (error) {
      console.error('Error voting:', error)
      setFeedback({ type: 'error', message: 'Failed to vote' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeVote = async () => {
    if (!game || !currentPlayer || isLoading) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/games/${game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'revoke_vote',
          clientId: currentPlayer.client_id
        }),
      })
      
      if (response.ok) {
        setFeedback({ type: 'success', message: 'Vote revoked!' })
        setSelectedTarget(null)
      } else {
        const error = await response.json()
        setFeedback({ type: 'error', message: error.error || 'Failed to revoke vote' })
      }
    } catch (error) {
      console.error('Error revoking vote:', error)
      setFeedback({ type: 'error', message: 'Failed to revoke vote' })
    } finally {
      setIsLoading(false)
    }
  }

  if (!canVote) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
        <div className="text-center">
          <Vote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Voting Phase
          </h3>
          <p className="text-sm text-gray-600">
            {!currentPlayer?.alive 
              ? 'Dead players cannot vote.'
              : 'Wait for the host to start voting.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
      <div className="text-center mb-6">
        <Vote className="w-6 h-6 text-orange-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          {gamePhase === 'day_final_vote' ? 'Final Vote' : 'Vote to Eliminate'}
        </h3>
        <p className="text-sm text-gray-600">
          {gamePhase === 'day_final_vote' 
            ? 'This is your final vote. Choose carefully.'
            : 'Select a player you suspect is a werwolf.'
          }
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 p-3 rounded-md flex items-center space-x-2 ${
          feedback.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{feedback.message}</span>
        </div>
      )}

      {/* Current Vote Status */}
      {currentVote && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              You voted for: <strong>{players.find(p => p.id === currentVote.target_player_id)?.name}</strong>
            </span>
            <button
              onClick={handleRevokeVote}
              disabled={isLoading}
              className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
            >
              Change Vote
            </button>
          </div>
        </div>
      )}

      {/* Player Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">
          Select a player to vote for:
        </h4>
        
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {alivePlayers.map((player) => {
            const voteCount = currentVotes.filter(vote => vote.target_player_id === player.id).length
            const isSelected = selectedTarget === player.id
            
            return (
              <button
                key={player.id}
                onClick={() => handleVote(player.id)}
                disabled={isLoading}
                className={`p-3 rounded-md border-2 transition-all text-left relative ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {player.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {player.is_host ? 'Host' : 'Player'}
                      </p>
                    </div>
                  </div>
                  
                  {voteCount > 0 && (
                    <div className="bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {voteCount}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {gamePhase === 'day_final_vote' 
            ? 'This vote is final. The player with the most votes will be eliminated.'
            : 'You can change your vote until the host calls for final vote.'
          }
        </p>
      </div>
    </div>
  )
}
