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
import { getPhaseDisplayName, getRoleDisplayName } from '@/lib/game-utils'
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
  onChangeRole: (playerId: string, newRole: string) => void
}

export default function GameScreen({ onEndGame, onRemovePlayer, onChangeRole }: GameScreenProps) {
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

  const alivePlayers = players.filter(p => p.alive)
  const deadPlayers = players.filter(p => !p.alive)
  const isNight = isNightPhase

  const getPlayerIcon = (player: Player) => {
    if (!player.alive) return <XCircle className="w-4 h-4 text-red-500" />
    // Only show role icons to the host, or to the player themselves
    if (isHost || player.id === currentPlayer?.id) {
    if (player.role === 'werewolf') return <Moon className="w-4 h-4 text-red-600" />
    if (player.role === 'doctor') return <Stethoscope className="w-4 h-4 text-green-600" />
    if (player.role === 'police') return <Shield className="w-4 h-4 text-blue-600" />
    }
    return <Users className="w-4 h-4 text-gray-600" />
  }

  const getPlayerStatus = (player: Player) => {
    if (!player.alive) return 'Dead'
    if (player.role && currentPlayer?.id === player.id) {
      return getRoleDisplayName(player.role)
    }
    return 'Alive'
  }

  // Dynamic background based on game phase
  const getBackgroundClass = () => {
    if (isNightPhase) {
      return "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-black relative overflow-hidden"
    } else if (isDayPhase) {
      return "min-h-screen bg-gradient-to-br from-blue-900 via-sky-900 to-amber-900 relative overflow-hidden"
    } else {
      return "min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 relative overflow-hidden"
    }
  }

  return (
    <div className={getBackgroundClass()}>
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
        {/* VILLAGERS - Icon-based */}
        {/* Villagers - Top Left Area - Updated Position */}
        <div className="absolute z-0" style={{top: '20px', left: '80px'}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-amber-200/90 to-amber-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-amber-200/80" style={{border: '8px solid rgba(245, 158, 11, 0.9)'}}>
              <div className="relative">
                {/* Villagers Icon - Male Villager */}
                <div className="w-64 h-64 relative flex items-center justify-center">
                  <div style={{fontSize: '8rem'}}>👨‍🌾</div>
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
        {/* Werwolf - Top Right Area - Updated Position */}
        <div className="absolute z-0" style={{top: '20px', right: '80px'}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-red-200/90 to-red-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-red-200/80" style={{border: '8px solid rgba(239, 68, 68, 0.9)'}}>
              <div className="relative">
                {/* Werwolf Icon - Animated Wolf */}
                <div className="w-64 h-64 relative flex items-center justify-center">
                  <div style={{fontSize: '8rem'}}>🐺</div>
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
        {/* Doctor - Bottom Left Area - Hidden on mobile to avoid form overlap - Updated Position */}
        <div className="absolute hidden md:block z-0" style={{bottom: '300px', left: '80px'}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-emerald-200/90 to-emerald-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200/80" style={{border: '8px solid rgba(16, 185, 129, 0.9)'}}>
              <div className="relative">
                {/* Doctor Icon - Male Doctor */}
                <div className="w-64 h-64 relative flex items-center justify-center">
                  <div style={{fontSize: '8rem'}}>👨‍⚕️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-gradient-to-r from-emerald-200/70 to-emerald-400/70 rounded-full blur-3xl"></div>
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-emerald-100 bg-slate-800/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-emerald-200/60">
                Doctor
              </span>
            </div>
          </div>
        </div>

        {/* POLICE - Icon-based */}
        {/* Police - Bottom Right Area - Hidden on mobile to avoid form overlap - Updated Position */}
        <div className="absolute hidden md:block z-0" style={{bottom: '300px', right: '80px'}}>
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-sky-200/90 to-sky-400/90 rounded-full flex items-center justify-center shadow-2xl shadow-sky-200/80" style={{border: '8px solid rgba(14, 165, 233, 0.9)'}}>
              <div className="relative">
                {/* Police Icon - Male Police Officer */}
                <div className="w-64 h-64 relative flex items-center justify-center">
                  <div style={{fontSize: '8rem'}}>👮‍♂️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-10 bg-gradient-to-r from-sky-200/70 to-sky-400/70 rounded-full blur-3xl"></div>
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold text-sky-100 bg-slate-800/95 px-6 py-3 rounded-full backdrop-blur-sm border-2 border-sky-200/60">
                Police
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Character Circles - Smaller and positioned to avoid form overlap */}
        <div className="absolute md:hidden" style={{top: '10px', left: '10px', zIndex: 1}}>
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-200/90 to-emerald-400/90 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200/80" style={{border: '4px solid rgba(16, 185, 129, 0.9)'}}>
              <div className="relative">
                <div className="w-16 h-16 relative flex items-center justify-center">
                  <div style={{fontSize: '2rem'}}>👨‍⚕️</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-200/70 to-emerald-400/70 rounded-full blur-lg"></div>
          </div>
        </div>

        <div className="absolute md:hidden" style={{top: '10px', right: '10px', zIndex: 1}}>
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-200/90 to-sky-400/90 rounded-full flex items-center justify-center shadow-lg shadow-sky-200/80" style={{border: '4px solid rgba(14, 165, 233, 0.9)'}}>
              <div className="relative">
                <div className="w-16 h-16 relative flex items-center justify-center">
                  <div style={{fontSize: '2rem'}}>👮‍♂️</div>
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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                🐺 Werwolf
              </h1>
              <p className="text-sm text-slate-400">
                Game Code: {game?.code} • Day {game?.day_count || 1}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isNight ? (
                  <Moon className="w-5 h-5 text-blue-300" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-400" />
                )}
                <span className="text-sm font-medium text-gray-300">
                  {getPhaseDisplayName(gamePhase)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">
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
          {/* Players Grid */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">
                Players
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {players.map((player) => {
                  const voteCount = voteCounts[player.id] || 0
                  const isHighestVoted = highestVotedPlayer?.id === player.id
                  
                  return (
                    <div
                      key={player.id}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        !player.alive
                          ? 'border-red-500 bg-red-900/20 opacity-60'
                          : player.is_host
                          ? 'border-yellow-400 bg-yellow-900/20'
                          : 'border-slate-600 bg-slate-800/50'
                      } ${isHighestVoted ? 'ring-2 ring-orange-400' : ''}`}
                    >
                      {/* Host Crown */}
                      {player.is_host && (
                        <div className="absolute -top-2 -right-2">
                          <Crown className="w-6 h-6 text-yellow-500" />
                        </div>
                      )}
                      
                      {/* Vote Count Badge */}
                      {voteCount > 0 && (
                        <div className="absolute -top-2 -left-2">
                          <div className="bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {voteCount}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                          !player.alive 
                            ? 'bg-red-800' 
                            : player.is_host
                            ? 'bg-yellow-800'
                            : 'bg-gray-700'
                        }`}>
                          <span className={`text-lg font-semibold ${
                            !player.alive 
                              ? 'text-red-200' 
                              : player.is_host
                              ? 'text-yellow-200'
                              : 'text-gray-300'
                          }`}>
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        <p className={`font-medium truncate ${
                          !player.alive 
                            ? 'text-red-300' 
                            : player.is_host
                            ? 'text-yellow-200'
                            : 'text-white'
                        }`}>
                          {player.name}
                        </p>
                        
                        {/* "You" label for current player */}
                        {currentPlayer && player.id === currentPlayer.id && (
                          <p className="text-xs text-blue-400 font-medium mt-1">
                            You
                          </p>
                        )}
                        
                        {/* Role display - only visible to player themselves and host */}
                        {player.role && (isHost || (currentPlayer && player.id === currentPlayer.id)) && (
                          <p className={`text-xs mt-1 font-medium ${
                            player.role === 'werewolf' 
                              ? 'text-red-400' 
                              : player.role === 'doctor'
                              ? 'text-green-400'
                              : player.role === 'police'
                              ? 'text-blue-400'
                              : 'text-slate-400'
                          }`}>
                            {getRoleDisplayName(player.role)}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-center space-x-1 mt-1">
                          {getPlayerIcon(player)}
                          <span className={`text-xs ${
                            !player.alive 
                              ? 'text-red-400' 
                              : player.is_host
                              ? 'text-yellow-400'
                              : 'text-slate-400'
                          }`}>
                            {getPlayerStatus(player)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">


            {/* Host Controls */}
            {isHost && (
              <HostControls onEndGame={onEndGame} />
            )}

            {/* Host Round State Information */}
            {isHost && (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Night Actions - Real-time Updates
                </h3>
                
                {roundState ? (
                  <div className="space-y-3">
                    
                    {roundState.wolf_target_player_id && (
                      <div className="flex justify-between items-center bg-red-900/20 p-3 rounded border border-red-500/30">
                        <span className="text-sm text-gray-300">🐺 Werewolf Target:</span>
                        <span className="text-sm font-medium text-red-400">
                          {players.find(p => p.id === roundState.wolf_target_player_id)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                    
                    {roundState.police_inspect_player_id && (
                      <div className="flex justify-between items-center bg-blue-900/20 p-3 rounded border border-blue-500/30">
                        <span className="text-sm text-gray-300">👮 Police Inspected:</span>
                        <span className="text-sm font-medium text-blue-400">
                          {players.find(p => p.id === roundState.police_inspect_player_id)?.name || 'Unknown'}
                          {roundState.police_inspect_result && (
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              roundState.police_inspect_result === 'werewolf' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-green-600 text-white'
                            }`}>
                              {roundState.police_inspect_result === 'werewolf' ? 'WEREWOLF' : 'NOT WEREWOLF'}
                            </span>
                          )}
                    </span>
                  </div>
                    )}
                    
                    {roundState.doctor_save_player_id && (
                      <div className="flex justify-between items-center bg-green-900/20 p-3 rounded border border-green-500/30">
                        <span className="text-sm text-gray-300">🩺 Doctor Saved:</span>
                        <span className="text-sm font-medium text-green-400">
                          {players.find(p => p.id === roundState.doctor_save_player_id)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                    
                    {!roundState.wolf_target_player_id && !roundState.police_inspect_player_id && !roundState.doctor_save_player_id && (
                      <div className="text-center py-4 bg-slate-800/50 rounded border border-slate-600/30">
                        <p className="text-slate-400 text-sm">⏳ Waiting for night actions...</p>
                        <p className="text-xs text-slate-500 mt-1">Actions will appear here in real-time</p>
                      </div>
                  )}
                </div>
                ) : (
                  <div className="text-center py-4 bg-yellow-900/20 rounded border border-yellow-500/30">
                    <p className="text-yellow-400 text-sm">⚠️ No round state found</p>
                    <p className="text-xs text-slate-500 mt-1">Round state should be created when game starts</p>
                  </div>
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
                          <span className="text-slate-400 text-xs">Role:</span>
                          <select
                            value={player.role || 'villager'}
                            onChange={(e) => onChangeRole(player.id, e.target.value)}
                            className="px-2 py-1 bg-slate-700 text-white rounded text-xs border border-slate-600"
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
                    <p className="text-slate-400 text-sm">No other players to manage</p>
                  </div>
                )}
                
                <p className="text-xs text-slate-400 mt-3 text-center">
                  Host can remove any player from the game
                </p>
              </div>
            )}

            {/* Night Overlay */}
            {isNightPhase && currentPlayer && (
              <NightOverlay />
            )}

            {/* Voting Interface */}
            {isDayPhase && currentPlayer && (
              <VotingInterface />
            )}

            {/* Game Status */}
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 border border-slate-600/30 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-white">
                Game Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">
                    Phase:
                  </span>
                  <span className="text-sm font-medium text-white">
                    {getPhaseDisplayName(gamePhase)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">
                    Alive:
                  </span>
                  <span className="text-sm font-medium text-green-400">
                    {alivePlayers.length}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">
                    Dead:
                  </span>
                  <span className="text-sm font-medium text-red-400">
                    {deadPlayers.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Win Condition Display */}
      <WinConditionDisplay />
    </div>
  )
}
