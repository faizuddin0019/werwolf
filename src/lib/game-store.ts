import { atom } from 'jotai'
import { Game, Player, RoundState, Vote, LeaveRequest } from './supabase'

// Game state atoms
export const gameAtom = atom<Game | null>(null)
export const playersAtom = atom<Player[]>([])
export const roundStateAtom = atom<RoundState | null>(null)
export const votesAtom = atom<Vote[]>([])
export const leaveRequestsAtom = atom<LeaveRequest[]>([])
export const currentPlayerAtom = atom<Player | null>(null)
export const isHostAtom = atom<boolean>(false)
export const gameCodeAtom = atom<string>('')
export const playerNameAtom = atom<string>('')
export const clientIdAtom = atom<string>('')

// Derived atoms
export const alivePlayersAtom = atom((get) => 
  get(playersAtom).filter(player => player.alive)
)

export const deadPlayersAtom = atom((get) => 
  get(playersAtom).filter(player => !player.alive)
)

export const werewolvesAtom = atom((get) => 
  get(playersAtom).filter(player => player.role === 'werewolf' && player.alive)
)

export const villagersAtom = atom((get) => 
  get(playersAtom).filter(player => player.role !== 'werewolf' && player.alive)
)

export const canStartGameAtom = atom((get) => {
  const players = get(playersAtom)
  const isHost = get(isHostAtom)
  const playerName = get(playerNameAtom)
  
  return isHost && playerName.trim().length > 0 && players.length >= 6 && players.length <= 20
})

export const gamePhaseAtom = atom((get) => get(gameAtom)?.phase || 'lobby')

export const isNightPhaseAtom = atom((get) => {
  const phase = get(gamePhaseAtom)
  return phase.startsWith('night_')
})

export const isDayPhaseAtom = atom((get) => {
  const phase = get(gamePhaseAtom)
  return phase.startsWith('day_')
})

// Leave request atoms
export const pendingLeaveRequestsAtom = atom((get) => 
  get(leaveRequestsAtom).filter(request => request.status === 'pending')
)

export const hasPendingLeaveRequestAtom = atom((get) => {
  const currentPlayer = get(currentPlayerAtom)
  const pendingRequests = get(pendingLeaveRequestsAtom)
  
  if (!currentPlayer) return false
  
  return pendingRequests.some(request => request.player_id === currentPlayer.id)
})

// Vote-related atoms
export const currentVotesAtom = atom((get) => {
  const votes = get(votesAtom)
  const game = get(gameAtom)
  const phase = get(gamePhaseAtom)
  
  if (!game) return []
  
  return votes.filter(vote => 
    vote.game_id === game.id && 
    vote.round === game.day_count &&
    vote.phase === phase
  )
})

export const voteCountsAtom = atom((get) => {
  const votes = get(currentVotesAtom)
  const counts: Record<string, number> = {}
  
  votes.forEach(vote => {
    counts[vote.target_player_id] = (counts[vote.target_player_id] || 0) + 1
  })
  
  return counts
})

export const highestVotedPlayerAtom = atom((get) => {
  const voteCounts = get(voteCountsAtom)
  const players = get(playersAtom)
  
  let maxVotes = 0
  let highestVotedPlayerId: string | null = null
  
  Object.entries(voteCounts).forEach(([playerId, count]) => {
    if (count > maxVotes) {
      maxVotes = count
      highestVotedPlayerId = playerId
    }
  })
  
  if (!highestVotedPlayerId) return null
  
  return players.find(p => p.id === highestVotedPlayerId) || null
})

// Action atoms
export const resetGameAtom = atom(null, (get, set) => {
  set(gameAtom, null)
  set(playersAtom, [])
  set(roundStateAtom, null)
  set(votesAtom, [])
  set(leaveRequestsAtom, [])
  set(currentPlayerAtom, null)
  set(isHostAtom, false)
  set(gameCodeAtom, '')
  set(playerNameAtom, '')
})

export const setGameDataAtom = atom(null, (get, set, data: {
  game: Game
  players: Player[]
  roundState?: RoundState
  votes?: Vote[]
  leaveRequests?: LeaveRequest[]
  currentPlayer?: Player
}) => {
  console.log('setGameDataAtom called with:', {
    game: data.game?.id,
    playersCount: data.players?.length || 0,
    players: data.players,
    currentPlayer: data.currentPlayer,
    currentPlayerIsHost: data.currentPlayer?.is_host
  })
  set(gameAtom, data.game)
  set(playersAtom, data.players)
  if (data.roundState) set(roundStateAtom, data.roundState)
  if (data.votes) set(votesAtom, data.votes)
  if (data.leaveRequests) set(leaveRequestsAtom, data.leaveRequests)
  if (data.currentPlayer) {
    set(currentPlayerAtom, data.currentPlayer)
    set(playerNameAtom, data.currentPlayer.name) // Set player name from current player
    // Set isHost based on whether current player is the host
    const isHost = data.currentPlayer.is_host || false
    console.log('🔧 setGameDataAtom - Setting isHostAtom to:', isHost, 'for player:', data.currentPlayer.name, 'is_host field:', data.currentPlayer.is_host)
    set(isHostAtom, isHost)
  } else {
    console.log('🔧 setGameDataAtom - No currentPlayer, setting isHostAtom to false')
    set(isHostAtom, false)
  }
})
