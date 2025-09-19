'use client'

import { useAtom } from 'jotai'
import { 
  gameAtom, 
  playersAtom, 
  currentPlayerAtom, 
  isHostAtom,
  canStartGameAtom,
  playerNameAtom,
  leaveRequestsAtom,
  pendingLeaveRequestsAtom,
  hasPendingLeaveRequestAtom
} from '@/lib/game-store'
import { Crown, Users, Play, Moon, Sun } from 'lucide-react'

interface GameLobbyProps {
  onAssignRoles: () => void
  onEndGame: () => void
  onRequestLeave: () => void
  onApproveLeave: (playerId: string) => void
  onDenyLeave: (playerId: string) => void
  onRemovePlayer: (playerId: string) => void
  onChangeRole: (playerId: string, newRole: string) => void
}

export default function GameLobby({ 
  onAssignRoles, 
  onEndGame, 
  onRequestLeave, 
  onApproveLeave, 
  onDenyLeave, 
  onRemovePlayer,
  onChangeRole
}: GameLobbyProps) {
  const [game] = useAtom(gameAtom)
  const [players] = useAtom(playersAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [isHost] = useAtom(isHostAtom)
  const [canStartGame] = useAtom(canStartGameAtom)
  const [playerName] = useAtom(playerNameAtom)
  const [leaveRequests] = useAtom(leaveRequestsAtom)
  const [pendingLeaveRequests] = useAtom(pendingLeaveRequestsAtom)
  const [hasPendingLeaveRequest] = useAtom(hasPendingLeaveRequestAtom)

  // Debug logging for players
  console.log('🔧 GameLobby Debug:', {
    playersCount: players.length,
    players: players.map(p => ({ id: p.id, name: p.name, is_host: p.is_host })),
    game: game?.id,
    currentPlayer: currentPlayer ? { id: currentPlayer.id, name: currentPlayer.name, is_host: currentPlayer.is_host } : null,
    isHost,
    nonHostPlayers: players.filter(p => !p.is_host),
    shouldShowPlayerManagement: isHost && players.filter(p => !p.is_host).length > 0,
    timestamp: new Date().toISOString()
  })

  // In lobby phase, show all players (they're all alive)
  const alivePlayers = players.filter(p => p.alive)
  const playerCount = players.length
  const nonHostPlayerCount = players.filter(p => !p.is_host).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* VILLAGERS - Icon-based */}
        {/* Villagers - Top Left Area */}
        <div className="absolute" style={{top: '40px', left: '20px', zIndex: 5}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-amber-200/90 to-amber-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-amber-200/80 character-float gentle-pulse" style={{border: '8px solid rgba(245, 158, 11, 0.9)'}}>
              <div className="relative character-breathe">
                {/* Villagers Icon - Male Villager */}
                <div className="w-64 h-64 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{
                    fontSize: '8rem',
                    filter: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.8)) drop-shadow(0 0 40px rgba(245, 158, 11, 0.4))',
                    textShadow: '0 0 30px rgba(245, 158, 11, 0.9), 0 0 60px rgba(245, 158, 11, 0.5)',
                    transform: 'scale(1.1)'
                  }}>👨‍🌾</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-gradient-to-r from-amber-200/70 to-amber-400/70 rounded-full blur-3xl"></div>
            <div className="absolute top-84 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-amber-100 bg-slate-800/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-amber-200/60">
                Villagers
              </span>
            </div>
          </div>
        </div>

        {/* WERWOLF - Icon-based */}
        {/* Werwolf - Top Right Area */}
        <div className="absolute" style={{top: '40px', right: '20px', zIndex: 5}}>
          <div className="relative">
            <div className="w-88 h-88 bg-gradient-to-br from-red-200/90 to-red-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-red-200/80 character-float gentle-pulse" style={{border: '8px solid rgba(239, 68, 68, 0.9)'}}>
              <div className="relative character-breathe">
                {/* Werwolf Icon - Animated Wolf */}
                <div className="w-64 h-64 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{
                    fontSize: '8rem',
                    filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.8)) drop-shadow(0 0 40px rgba(239, 68, 68, 0.4))',
                    textShadow: '0 0 30px rgba(239, 68, 68, 0.9), 0 0 60px rgba(239, 68, 68, 0.5)',
                    transform: 'scale(1.1)'
                  }}>🐺</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-12 bg-gradient-to-r from-red-200/70 to-red-400/70 rounded-full blur-3xl"></div>
            <div className="absolute top-92 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-red-100 bg-slate-800/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-red-200/60">
                Werwolves
              </span>
            </div>
          </div>
        </div>

        {/* DOCTOR - Icon-based */}
        {/* Doctor - Bottom Left Area - Hidden on mobile to avoid form overlap */}
        <div className="absolute hidden md:block" style={{bottom: '40px', left: '20px', zIndex: 1}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-emerald-200/90 to-emerald-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200/80 character-float gentle-pulse" style={{animationDelay: '1s', border: '8px solid rgba(16, 185, 129, 0.9)'}}>
              <div className="relative character-breathe">
                {/* Doctor Icon - Male Doctor */}
                <div className="w-64 h-64 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{
                    fontSize: '8rem',
                    filter: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.8)) drop-shadow(0 0 40px rgba(16, 185, 129, 0.4))',
                    textShadow: '0 0 30px rgba(16, 185, 129, 0.9), 0 0 60px rgba(16, 185, 129, 0.5)',
                    transform: 'scale(1.1)'
                  }}>👨‍⚕️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-gradient-to-r from-emerald-200/70 to-emerald-400/70 rounded-full blur-3xl"></div>
            <div className="absolute -top-20 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-emerald-100 bg-slate-800/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-emerald-200/60">
                Doctor
              </span>
            </div>
          </div>
        </div>

        {/* POLICE - Icon-based */}
        {/* Police - Bottom Right Area - Hidden on mobile to avoid form overlap */}
        <div className="absolute hidden md:block" style={{bottom: '40px', right: '20px', zIndex: 1}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-sky-200/90 to-sky-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-sky-200/80 character-float gentle-pulse" style={{animationDelay: '2s', border: '8px solid rgba(14, 165, 233, 0.9)'}}>
              <div className="relative character-breathe">
                {/* Police Icon - Male Police Officer */}
                <div className="w-64 h-64 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{
                    fontSize: '8rem',
                    filter: 'drop-shadow(0 0 20px rgba(14, 165, 233, 0.8)) drop-shadow(0 0 40px rgba(14, 165, 233, 0.4))',
                    textShadow: '0 0 30px rgba(14, 165, 233, 0.9), 0 0 60px rgba(14, 165, 233, 0.5)',
                    transform: 'scale(1.1)'
                  }}>👮‍♂️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-gradient-to-r from-sky-200/70 to-sky-400/70 rounded-full blur-3xl"></div>
            <div className="absolute -top-20 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-sky-100 bg-slate-800/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-sky-200/60">
                Police
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Character Circles - Smaller and positioned to avoid form overlap */}
        <div className="absolute md:hidden" style={{top: '10px', left: '10px', zIndex: 1}}>
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-200/90 to-emerald-400/90 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200/80 character-float gentle-pulse" style={{animationDelay: '1s', border: '4px solid rgba(16, 185, 129, 0.9)'}}>
              <div className="relative character-breathe">
                <div className="w-16 h-16 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{
                    fontSize: '2rem',
                    filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8)) drop-shadow(0 0 16px rgba(16, 185, 129, 0.4))',
                    textShadow: '0 0 12px rgba(16, 185, 129, 0.9), 0 0 24px rgba(16, 185, 129, 0.5)',
                    transform: 'scale(1.1)'
                  }}>👨‍⚕️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-200/70 to-emerald-400/70 rounded-full blur-lg"></div>
          </div>
        </div>

        <div className="absolute md:hidden" style={{top: '10px', right: '10px', zIndex: 1}}>
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-200/90 to-sky-400/90 rounded-full flex items-center justify-center shadow-lg shadow-sky-200/80 character-float gentle-pulse" style={{animationDelay: '2s', border: '4px solid rgba(14, 165, 233, 0.9)'}}>
              <div className="relative character-breathe">
                <div className="w-16 h-16 relative head-nod flex items-center justify-center">
                  <div className="character-bounce" style={{
                    fontSize: '2rem',
                    filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.8)) drop-shadow(0 0 16px rgba(14, 165, 233, 0.4))',
                    textShadow: '0 0 12px rgba(14, 165, 233, 0.9), 0 0 24px rgba(14, 165, 233, 0.5)',
                    transform: 'scale(1.1)'
                  }}>👮‍♂️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-sky-200/70 to-sky-400/70 rounded-full blur-lg"></div>
          </div>
        </div>

        {/* Subtle background element */}
        <div className="absolute" style={{top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: -10}}>
          <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-700/20 rounded-full flex items-center justify-center shadow-lg shadow-gray-500/15 floating" style={{animationDelay: '3s'}}>
            <div className="text-xl">🌙</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-slate-800/80 backdrop-blur-sm border-b border-slate-600/30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">🐺 Werwolf</h1>
              <p className="text-sm text-gray-400">Game Code: {game?.code}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sun className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-medium text-gray-300">Day</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">
                  {playerCount} / 20 players
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Players Grid */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4">
                Players ({playerCount})
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {players.map((player) => (
                    <div
                      key={player.id}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        player.is_host
                          ? 'border-yellow-400 bg-yellow-900/20'
                          : player.id === currentPlayer?.id
                          ? 'border-green-400 bg-green-900/20'
                          : 'border-gray-600 bg-gray-800/50'
                      }`}
                    >
                      {player.is_host && (
                        <div className="absolute -top-2 -right-2">
                          <Crown className="w-6 h-6 text-yellow-400" />
                        </div>
                      )}
                      
                      {player.id === currentPlayer?.id && !player.is_host && (
                        <div className="absolute -top-2 -left-2">
                          <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-green-900">YOU</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                          player.is_host 
                            ? 'bg-yellow-800' 
                            : player.id === currentPlayer?.id
                            ? 'bg-green-800'
                            : 'bg-gray-700'
                        }`}>
                          <span className={`text-lg font-semibold ${
                            player.is_host 
                              ? 'text-yellow-200' 
                              : player.id === currentPlayer?.id
                              ? 'text-green-200'
                              : 'text-gray-300'
                          }`}>
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        <p className={`font-medium truncate ${
                          player.is_host 
                            ? 'text-yellow-200' 
                            : player.id === currentPlayer?.id
                            ? 'text-green-200'
                            : 'text-white'
                        }`}>
                          {player.name}
                        </p>
                        
                        {player.is_host && (
                          <p className="text-xs text-yellow-400 font-medium">
                            Host
                          </p>
                        )}
                        
                        {player.id === currentPlayer?.id && !player.is_host && (
                          <p className="text-xs text-green-400 font-medium">
                            You
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              
    {nonHostPlayerCount < 6 && (
      <div className="text-center py-4 mt-4">
        <Users className="w-12 h-12 text-gray-500 mx-auto mb-2" />
        <p className="text-sm text-gray-400">
          Need {6 - nonHostPlayerCount} more players to start (excluding host)
        </p>
      </div>
    )}
            </div>
          </div>

          {/* Game Info & Controls */}
          <div className="space-y-6">
            {/* Game Status */}
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                Game Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Phase:</span>
                  <span className="text-sm font-medium text-white">
                    Lobby
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Players:</span>
                  <span className="text-sm font-medium text-white">
                    {playerCount} / 20
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Werwolves:</span>
                  <span className="text-sm font-medium text-red-400">
                    {playerCount <= 8 ? 1 : playerCount <= 12 ? 2 : 3}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Special Roles:</span>
                  <span className="text-sm font-medium text-white">
                    1 Doctor, 1 Police
                  </span>
                </div>
              </div>
            </div>


            {/* Host Controls */}
            {isHost && (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Host Controls
                </h3>
                
                <button
                  onClick={onAssignRoles}
                  disabled={!canStartGame}
                  className="w-full py-3 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 font-medium mb-3"
                >
                  <Play className="w-5 h-5" />
                  <span>Assign Roles & Start</span>
                </button>
                
                <button
                  onClick={onEndGame}
                  className="w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <span>End Game</span>
                </button>
                
        {!canStartGame && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            {nonHostPlayerCount < 6 
              ? `Need ${6 - nonHostPlayerCount} more players (excluding host)`
              : playerCount > 21
              ? 'Too many players (max 21)'
              : 'Ready to start!'
            }
          </p>
        )}
              </div>
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
                      <div key={player.id} className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white">{player.name}</span>
                          <button
                            onClick={() => onRemovePlayer(player.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 text-xs">Role:</span>
                          <select
                            value={player.role || 'villager'}
                            onChange={(e) => onChangeRole(player.id, e.target.value)}
                            className="px-2 py-1 bg-gray-700 text-white rounded text-xs border border-gray-600"
                          >
                            <option value="villager">Villager</option>
                            <option value="werewolf">Werewolf</option>
                            <option value="doctor">Doctor</option>
                            <option value="police">Police</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">No other players to manage</p>
                    <p className="text-gray-500 text-xs mt-1">Add more players to see remove options</p>
                  </div>
                )}
                
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Host can remove any player from the game
                </p>
              </div>
            )}

            {/* Debug: Check isHost value */}
            {console.log('🔧 Leave Request System Debug - isHost:', isHost, 'currentPlayer.is_host:', currentPlayer?.is_host)}

            {/* Leave Request System */}
            {!isHost && (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Game Actions
                </h3>
                
                {hasPendingLeaveRequest ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">⏳</span>
                    </div>
                    <p className="text-yellow-200 font-medium mb-2">
                      Leave Request Pending
                    </p>
                    <p className="text-xs text-gray-400">
                      Waiting for host approval...
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={onRequestLeave}
                    className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 font-medium"
                  >
                    <span>Request to Leave</span>
                  </button>
                )}
                
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Host approval required to leave the game
                </p>
              </div>
            )}

            {/* Host Leave Request Management */}
            {isHost && pendingLeaveRequests.length > 0 && (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Leave Requests ({pendingLeaveRequests.length})
                </h3>
                
                <div className="space-y-3">
                  {pendingLeaveRequests.map((request) => {
                    const requestingPlayer = players.find(p => p.id === request.player_id)
                    if (!requestingPlayer) return null
                    
                    return (
                      <div key={request.id} className="bg-gray-800/50 rounded-lg p-4 border border-slate-600/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              {requestingPlayer.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              Wants to leave the game
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => onApproveLeave(request.player_id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onDenyLeave(request.player_id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}


            {/* Game Rules */}
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                Quick Rules
              </h3>
              
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong className="text-red-400">Werwolves:</strong> Eliminate villagers at night</p>
                <p><strong className="text-green-400">Doctor:</strong> Save one player each night</p>
                <p><strong className="text-blue-400">Police:</strong> Inspect one player each night</p>
                <p><strong className="text-purple-400">Villagers:</strong> Vote to eliminate suspects</p>
                <p><strong className="text-white">Win:</strong> Eliminate all werwolves or outnumber villagers</p>
              </div>
            </div>

            {/* How to Play */}
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                How to Play
              </h3>
              
              <div className="text-sm text-gray-300 space-y-2">
                <p>• <strong className="text-white">No typing</strong> during play - just click!</p>
                <p>• <strong className="text-white">Host controls</strong> all game phases</p>
                <p>• <strong className="text-white">Talk in your video call</strong> - this is just the game board</p>
                <p>• <strong className="text-white">Follow host instructions</strong> for each phase</p>
                <p>• <strong className="text-white">Mobile-friendly</strong> - works on phones too</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
