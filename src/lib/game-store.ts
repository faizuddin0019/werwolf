import { atom } from 'jotai'
import { Game, Player, RoundState, Vote, LeaveRequest } from './supabase'

// Game state atoms
export const gameAtom = atom<Game | null>(null)
export const playersAtom = atom<Player[]>([])
export const roundStateAtom = atom<RoundState | null>(null)
export const votesAtom = atom<Vote[]>([])
export const leaveRequestsAtom = atom<LeaveRequest[]>([])
export const currentPlayerAtom = atom<Player | null>(null)
export const isHostAtom = atom((get) => {
  const currentPlayer = get(currentPlayerAtom)
  return currentPlayer?.is_host || false
})
export const gameIdAtom = atom<string>('')
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
  get(playersAtom).filter(player => player.role === 'werwolf' && player.alive)
)

export const villagersAtom = atom((get) => 
  get(playersAtom).filter(player => player.role !== 'werwolf' && player.alive)
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
  // isHostAtom is now a derived atom, so it will automatically update
  set(gameIdAtom, '')
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
  // Performance optimization: Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('setGameDataAtom called with:', {
      game: data.game?.id,
      playersCount: data.players?.length || 0,
      players: data.players,
      currentPlayer: data.currentPlayer,
      currentPlayerIsHost: data.currentPlayer?.is_host
    })
  }
  
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
    // Check if any player properties changed
    currentPlayers.some((currentPlayer) => {
      const newPlayer = data.players.find(p => p.id === currentPlayer.id)
      if (!newPlayer) return true // Player was removed
      return currentPlayer.name !== newPlayer.name ||
        currentPlayer.is_host !== newPlayer.is_host ||
        currentPlayer.role !== newPlayer.role ||
        currentPlayer.alive !== newPlayer.alive
    }) ||
    // Check if any new players were added
    data.players.some((newPlayer) => {
      const currentPlayer = currentPlayers.find(p => p.id === newPlayer.id)
      return !currentPlayer // New player was added
    })
  
  const roundStateChanged = !currentRoundState !== !data.roundState ||
    (currentRoundState && data.roundState && 
     (currentRoundState.phase_started !== data.roundState.phase_started ||
      currentRoundState.wolf_target_player_id !== data.roundState.wolf_target_player_id ||
      currentRoundState.police_inspect_player_id !== data.roundState.police_inspect_player_id ||
      currentRoundState.police_inspect_result !== data.roundState.police_inspect_result ||
      currentRoundState.doctor_save_player_id !== data.roundState.doctor_save_player_id ||
      currentRoundState.resolved_death_player_id !== data.roundState.resolved_death_player_id))
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
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Game changed, updating gameAtom')
      console.log('🔧 Setting gameAtom to:', data.game)
    }
    set(gameAtom, data.game)
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Game unchanged, skipping gameAtom update')
      console.log('🔧 Current game:', currentGame)
      console.log('🔧 New game:', data.game)
    }
  }
  
  // Always update gameAtom when data.game exists
  if (data.game) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Setting gameAtom to:', data.game)
    }
    set(gameAtom, data.game)
  }
  
  if (playersChanged) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Players changed, updating playersAtom')
      console.log('🔧 Players data:', data.players.map(p => ({ id: p.id, name: p.name, role: p.role, is_host: p.is_host })))
      console.log('🔧 Current players before update:', currentPlayers?.map(p => ({ id: p.id, name: p.name, role: p.role, is_host: p.is_host })))
    }
    set(playersAtom, data.players)
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Players unchanged, skipping update')
      console.log('🔧 Current players:', currentPlayers?.map(p => ({ id: p.id, name: p.name, role: p.role, is_host: p.is_host })))
      console.log('🔧 New players:', data.players.map(p => ({ id: p.id, name: p.name, role: p.role, is_host: p.is_host })))
      
      // Force update if roles are missing from current players but present in new data
      const hasRolesInNewData = data.players.some(p => p.role)
      const hasRolesInCurrentData = currentPlayers?.some(p => p.role)
      
      if (hasRolesInNewData && !hasRolesInCurrentData) {
        console.log('🔧 FORCE UPDATE: Roles present in new data but missing from current data')
        set(playersAtom, data.players)
      }
    }
  }
  
  if (roundStateChanged && data.roundState) {
    if (process.env.NODE_ENV === 'development') console.log('🔧 Round state changed, updating roundStateAtom')
    set(roundStateAtom, data.roundState)
  }
  
  if (votesChanged && data.votes) {
    if (process.env.NODE_ENV === 'development') console.log('🔧 Votes changed, updating votesAtom')
    set(votesAtom, data.votes)
  }
  
  if (leaveRequestsChanged && data.leaveRequests) {
    if (process.env.NODE_ENV === 'development') console.log('🔧 Leave requests changed, updating leaveRequestsAtom')
    set(leaveRequestsAtom, data.leaveRequests)
  }
  
  if (currentPlayerChanged) {
    if (data.currentPlayer) {
      if (process.env.NODE_ENV === 'development') console.log('🔧 Current player changed, updating currentPlayerAtom')
      set(currentPlayerAtom, data.currentPlayer)
      set(playerNameAtom, data.currentPlayer.name)
      // isHostAtom is now a derived atom, so it will automatically update
    } else {
      if (process.env.NODE_ENV === 'development') console.log('🔧 No current player, clearing currentPlayerAtom')
      set(currentPlayerAtom, null)
    }
  }
  
  if (!gameChanged && !playersChanged && !roundStateChanged && !votesChanged && !leaveRequestsChanged && !currentPlayerChanged) {
    if (process.env.NODE_ENV === 'development') console.log('🔧 No changes detected, skipping all updates')
  }
})
