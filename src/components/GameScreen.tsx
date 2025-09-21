'use client'

import { useAtom } from 'jotai'
import { 
  gameAtom, 
  playersAtom, 
  currentPlayerAtom, 
  isHostAtom,
  gamePhaseAtom,
  isNightPhaseAtom,
  isDayPhaseAtom,
  voteCountsAtom,
  highestVotedPlayerAtom,
  roundStateAtom
} from '@/lib/game-store'
import { getPhaseDisplayName, getRoleDisplayName, canPlayerAct, sortPlayers } from '@/lib/game-utils'
import { Player } from '@/lib/supabase'
import { 
  Crown, 
  Moon, 
  Sun, 
  Users, 
  Eye, 
  Shield, 
  Stethoscope,
  Vote,
  CheckCircle,
  XCircle
} from 'lucide-react'
import HostControls from './HostControls'
import NightOverlay from './NightOverlay'
import VotingInterface from './VotingInterface'
import WinConditionDisplay from './WinConditionDisplay'

interface GameScreenProps {
  onEndGame: () => void
  onRemovePlayer: (playerId: string) => void
}

export default function GameScreen({ onEndGame, onRemovePlayer }: GameScreenProps) {
  const [game] = useAtom(gameAtom)
  const [players] = useAtom(playersAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [isHost] = useAtom(isHostAtom)
  const [gamePhase] = useAtom(gamePhaseAtom)
  const [isNightPhase] = useAtom(isNightPhaseAtom)
  const [isDayPhase] = useAtom(isDayPhaseAtom)
  const [voteCounts] = useAtom(voteCountsAtom)
  const [highestVotedPlayer] = useAtom(highestVotedPlayerAtom)
  const [roundState] = useAtom(roundStateAtom)

  // Sort players with proper ordering: Host first, current player second, alive players, then dead players
  const sortedPlayers = sortPlayers(players, currentPlayer?.id)
  const alivePlayers = sortedPlayers.filter(p => p.alive)
  const deadPlayers = sortedPlayers.filter(p => !p.alive)
  
  // Check if current player has an active action screen
  const hasActiveActionScreen = currentPlayer && (
    (isNightPhase && canPlayerAct(currentPlayer, gamePhase, currentPlayer.is_host, roundState || undefined)) ||
    (isDayPhase && currentPlayer.alive)
  )

  const getPlayerIcon = (player: Player) => {
    if (!player.alive) return <XCircle className="w-4 h-4 text-red-500" />
    if (isHost || player.id === currentPlayer?.id) {
      if (player.role === 'werewolf') return <Moon className="w-4 h-4 text-red-600" />
      if (player.role === 'doctor') return <Stethoscope className="w-4 h-4 text-green-600" />
      if (player.role === 'police') return <Shield className="w-4 h-4 text-blue-600" />
    }
    return <Users className="w-4 h-4 text-gray-600" />
  }

  const getBackgroundClass = () => {
    if (isNightPhase) {
      return "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 relative overflow-hidden"
    } else if (isDayPhase) {
      return "min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden"
    } else {
      return "min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 relative overflow-hidden"
    }
  }

  return (
    <div className={getBackgroundClass()}>
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-80 h-80 bg-gradient-to-br from-amber-200/90 to-amber-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-amber-200/80">
          <div style={{fontSize: '8rem'}}>👨‍🌾</div>
        </div>
        <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-red-200/90 to-red-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-red-200/80">
          <div style={{fontSize: '8rem'}}>🐺</div>
        </div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-emerald-200/90 to-emerald-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200/80">
          <div style={{fontSize: '8rem'}}>👨‍⚕️</div>
        </div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-sky-200/90 to-sky-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-sky-200/80">
          <div style={{fontSize: '8rem'}}>👮‍♂️</div>
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-slate-800/80 backdrop-blur-sm border-b border-slate-600/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Werwolf Game
              </h1>
              <p className="text-slate-400">
                Game Code: {game?.code}
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                {isNightPhase ? (
                  <Moon className="w-5 h-5 text-blue-300" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-400" />
                )}
                <span className="text-white font-medium">
                  {getPhaseDisplayName(gamePhase)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">
                  {alivePlayers.length} alive
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Players Grid - Always on LEFT for desktop, conditional order for mobile */}
          <div className={`lg:col-span-3 lg:order-1 ${hasActiveActionScreen ? 'order-2' : 'order-1'}`}>
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">
                Players
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedPlayers.map((player) => {
                  const voteCount = voteCounts[player.id] || 0
                  const isHighestVoted = highestVotedPlayer?.id === player.id
                  
                  return (
                    <div
                      key={player.id}
                      className={`relative p-6 rounded-lg border-2 transition-all ${
                        !player.alive
                          ? 'border-red-500 bg-red-900/20 opacity-60'
                          : player.is_host
                          ? 'border-yellow-400 bg-yellow-900/20'
                          : player.id === currentPlayer?.id
                          ? 'border-green-400 bg-green-900/20'
                          : 'border-gray-600 bg-gray-800/50'
                      } ${isHighestVoted ? 'ring-2 ring-orange-400' : ''}`}
                    >
                      {/* Host Crown */}
                      {player.is_host && (
                        <div className="absolute -top-2 -right-2">
                          <Crown className="w-6 h-6 text-yellow-400" />
                        </div>
                      )}
                      
                      {/* Current Player Badge */}
                      {player.id === currentPlayer?.id && !player.is_host && (
                        <div className="absolute -top-2 -left-2">
                          <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-green-900">YOU</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Vote Count Badge */}
                      {isDayPhase && voteCount > 0 && (
                        <div className="absolute -top-2 -left-2">
                          <div className="bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                            {voteCount}
                          </div>
                        </div>
                      )}

                      <div className="text-center">
                        {/* Avatar */}
                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                          !player.alive
                            ? 'bg-red-800'
                            : player.is_host 
                            ? 'bg-yellow-800' 
                            : player.id === currentPlayer?.id
                            ? 'bg-green-800'
                            : 'bg-gray-700'
                        }`}>
                          <span className={`text-lg font-bold ${
                            !player.alive
                              ? 'text-red-200'
                              : player.is_host 
                              ? 'text-yellow-200' 
                              : player.id === currentPlayer?.id
                              ? 'text-green-200'
                              : 'text-gray-300'
                          }`}>
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Player Name */}
                        <p className={`font-semibold text-lg break-words ${
                          !player.alive
                            ? 'text-red-200'
                            : player.is_host 
                            ? 'text-yellow-200' 
                            : player.id === currentPlayer?.id
                            ? 'text-green-200'
                            : 'text-white'
                        }`}>
                          {player.name}
                        </p>
                        
                        {/* Host Label */}
                        {player.is_host && (
                          <p className="text-sm text-yellow-400 font-semibold">
                            Host
                          </p>
                        )}
                        
                        {/* Role Display - Only show to host and the player themselves */}
                        {!player.is_host && player.role && (isHost || player.id === currentPlayer?.id) && (
                          <p className="text-sm text-blue-400 font-semibold">
                            {player.role === 'werewolf' ? '🐺 Werewolf' :
                             player.role === 'doctor' ? '🩺 Doctor' :
                             player.role === 'police' ? '🛡️ Police' :
                             '👥 Villager'}
                          </p>
                        )}
                        
                        {/* For other players, show "Villager" or nothing */}
                        {!player.is_host && player.role && !isHost && player.id !== currentPlayer?.id && (
                          <p className="text-sm text-gray-400 font-semibold">
                            👥 Villager
                          </p>
                        )}

                        {/* Status */}
                        <div className="mt-2">
                          {!player.alive ? (
                            <span className="text-red-400 text-xs">Dead</span>
                          ) : (
                            <span className="text-green-400 text-xs">Alive</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sidebar - Always on RIGHT for desktop, conditional order for mobile */}
          <div className={`lg:col-span-1 lg:order-2 ${hasActiveActionScreen ? 'order-1' : 'order-2'}`}>
            <div className="space-y-6">
              {/* Host Controls */}
              {isHost && (
                <HostControls onEndGame={onEndGame} />
              )}

              {/* Game Status */}
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Game Status
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Phase:</span>
                    <span className="text-sm font-medium text-white">
                      {getPhaseDisplayName(gamePhase)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Alive:</span>
                    <span className="text-sm font-medium text-green-400">
                      {alivePlayers.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Dead:</span>
                    <span className="text-sm font-medium text-red-400">
                      {deadPlayers.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Night Overlay - Only show when it's the player's turn */}
              {isNightPhase && currentPlayer && (
                <NightOverlay />
              )}

              {/* Voting Interface - Only show when it's day phase */}
              {isDayPhase && currentPlayer && (
                <VotingInterface />
              )}

              {/* Host Player Management */}
              {isHost && (
                <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Player Management
                  </h3>
                  {players.filter(p => !p.is_host).length > 0 ? (
                    <div className="space-y-2">
                      {players.filter(p => !p.is_host).map((player) => (
                        <div key={player.id} className="bg-slate-800/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-white">{player.name}</span>
                              {!player.alive && <span className="text-red-400 text-xs">(Dead)</span>}
                            </div>
                            <button
                              onClick={() => onRemovePlayer(player.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-400">Role:</span>
                            <span className="text-xs text-white">
                              {getRoleDisplayName(player.role)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-slate-400 text-sm">No other players to manage</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    Host can remove any player from the game
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Win Condition Display */}
      <WinConditionDisplay onClose={onEndGame} />
    </div>
  )
}