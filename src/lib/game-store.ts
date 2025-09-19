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
  
  // Need at least 6 non-host players + 1 host = 7 total players minimum
  const nonHostPlayers = players.filter(p => !p.is_host)
  
  return isHost && playerName.trim().length > 0 && nonHostPlayers.length >= 6 && players.length <= 21
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
  
  // Get current state to compare
  const currentGame = get(gameAtom)
  const currentPlayers = get(playersAtom)
  const currentRoundState = get(roundStateAtom)
  const currentVotes = get(votesAtom)
  const currentLeaveRequests = get(leaveRequestsAtom)
  const currentPlayer = get(currentPlayerAtom)
  
  // Only update if data actually changed
  const gameChanged = !currentGame || currentGame.id !== data.game.id || currentGame.phase !== data.game.phase
  const playersChanged = !currentPlayers || currentPlayers.length !== data.players.length ||
    currentPlayers.some((currentPlayer, index) => {
      const newPlayer = data.players[index]
      return !newPlayer || 
        currentPlayer.id !== newPlayer.id ||
        currentPlayer.name !== newPlayer.name ||
        currentPlayer.is_host !== newPlayer.is_host ||
        currentPlayer.role !== newPlayer.role ||
        currentPlayer.alive !== newPlayer.alive
    })
  const roundStateChanged = !currentRoundState !== !data.roundState ||
    (currentRoundState && data.roundState && 
     (currentRoundState.phase !== data.roundState.phase || 
      currentRoundState.day_count !== data.roundState.day_count))
  const votesChanged = !currentVotes || currentVotes.length !== (data.votes?.length || 0) ||
    (currentVotes && data.votes && currentVotes.some((currentVote, index) => {
      const newVote = data.votes![index]
      return !newVote || currentVote.id !== newVote.id
    }))
  const leaveRequestsChanged = !currentLeaveRequests || currentLeaveRequests.length !== (data.leaveRequests?.length || 0) ||
    (currentLeaveRequests && data.leaveRequests && currentLeaveRequests.some((currentRequest, index) => {
      const newRequest = data.leaveRequests![index]
      return !newRequest || currentRequest.id !== newRequest.id
    }))
  const currentPlayerChanged = !currentPlayer !== !data.currentPlayer ||
    (currentPlayer && data.currentPlayer && 
     (currentPlayer.id !== data.currentPlayer.id || 
      currentPlayer.is_host !== data.currentPlayer.is_host))
  
  if (gameChanged) {
    console.log('🔧 Game changed, updating gameAtom')
    set(gameAtom, data.game)
  }
  
  if (playersChanged) {
    console.log('🔧 Players changed, updating playersAtom')
    set(playersAtom, data.players)
  }
  
  if (roundStateChanged && data.roundState) {
    console.log('🔧 Round state changed, updating roundStateAtom')
    set(roundStateAtom, data.roundState)
  }
  
  if (votesChanged && data.votes) {
    console.log('🔧 Votes changed, updating votesAtom')
    set(votesAtom, data.votes)
  }
  
  if (leaveRequestsChanged && data.leaveRequests) {
    console.log('🔧 Leave requests changed, updating leaveRequestsAtom')
    set(leaveRequestsAtom, data.leaveRequests)
  }
  
  if (currentPlayerChanged) {
    if (data.currentPlayer) {
      console.log('🔧 Current player changed, updating currentPlayerAtom')
      set(currentPlayerAtom, data.currentPlayer)
      set(playerNameAtom, data.currentPlayer.name)
      const isHost = data.currentPlayer.is_host || false
      console.log('🔧 setGameDataAtom - Setting isHostAtom to:', isHost, 'for player:', data.currentPlayer.name)
      set(isHostAtom, isHost)
    } else {
      console.log('🔧 No current player, setting isHostAtom to false')
      set(isHostAtom, false)
    }
  }
  
  if (!gameChanged && !playersChanged && !roundStateChanged && !votesChanged && !leaveRequestsChanged && !currentPlayerChanged) {
    console.log('🔧 No changes detected, skipping all updates')
  }
})
