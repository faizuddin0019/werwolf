import { Game, Player, PlayerRole, GamePhase } from './supabase'

// Generate a unique 6-digit game code
export function generateGameCode(): string {
  return Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
}

// Calculate number of werewolves based on player count
export function getWerwolfCount(playerCount: number): number {
  if (playerCount <= 8) return 1
  if (playerCount <= 12) return 2
  return 3
}

// Assign roles to players (excluding host)
export function assignRoles(players: Player[]): Player[] {
  // Filter out the host - host should not have a role
  const nonHostPlayers = players.filter(p => !p.is_host)
  
  if (nonHostPlayers.length < 6) {
    throw new Error('Need at least 6 non-host players to assign roles')
  }
  
  const shuffled = [...nonHostPlayers].sort(() => Math.random() - 0.5)
  const werwolfCount = getWerwolfCount(nonHostPlayers.length)
  
  // Assign roles to non-host players
  const playersWithRoles = shuffled.map((player, index) => {
    let role: PlayerRole = 'villager'
    
    if (index < werwolfCount) {
      role = 'werewolf' // Temporarily use 'werewolf' until database is migrated
    } else if (index === werwolfCount) {
      role = 'doctor'
    } else if (index === werwolfCount + 1) {
      role = 'police'
    }
    
    return { ...player, role }
  })
  
  // Return all players (host without role + non-host players with roles)
  const hostPlayers = players.filter(p => p.is_host)
  return [...hostPlayers, ...playersWithRoles]
}

// Check win conditions
export function checkWinCondition(game: Game, players: Player[]): 'villagers' | 'werewolves' | null {
  console.log('🔧 checkWinCondition called with:', players.length, 'players')
  
  // Exclude host from win condition calculations
  const nonHostPlayers = players.filter(p => !p.is_host)
  const alivePlayers = nonHostPlayers.filter(p => p.alive)
  const aliveWerwolves = alivePlayers.filter(p => p.role === 'werwolf' || p.role === 'werewolf')
  const villagers = alivePlayers.filter(p => p.role !== 'werwolf' && p.role !== 'werewolf')
  
  console.log('🔧 checkWinCondition debug:', {
    totalPlayers: players.length,
    nonHostPlayers: nonHostPlayers.length,
    alivePlayers: alivePlayers.length,
    aliveWerwolves: aliveWerwolves.length,
    aliveWerwolfRoles: aliveWerwolves.map(p => ({ name: p.name, role: p.role }))
  })
  
  // Game ends when there are only 2 non-host players left
  if (alivePlayers.length <= 2) {
    // If any werewolves are still alive, they win
    if (aliveWerwolves.length > 0) {
      console.log('🔧 Win condition: werewolves win (2 players left)')
      return 'werewolves'
    }
    // If no werewolves are alive, villagers win
    console.log('🔧 Win condition: villagers win (2 players left)')
    return 'villagers'
  }
  
  // Villagers win if all werwolves are eliminated (even with more than 2 players)
  if (aliveWerwolves.length === 0) {
    console.log('🔧 Win condition: villagers win (all werewolves dead)')
    return 'villagers'
  }
  
  console.log('🔧 Win condition: no win yet')
  return null
}

// Get next phase in the game flow
export function getNextPhase(currentPhase: GamePhase): GamePhase {
  switch (currentPhase) {
    case 'lobby':
      return 'night_wolf'
    case 'night_wolf':
      return 'night_doctor' // Correct order: Wolf → Doctor → Police
    case 'night_doctor':
      return 'night_police'
    case 'night_police':
      return 'reveal'
    case 'reveal':
      return 'day_vote'
    case 'day_vote':
      return 'day_final_vote'
    case 'day_final_vote':
      return 'night_wolf' // Next day
    case 'ended':
      return 'ended'
    default:
      return currentPhase
  }
}

// Validate player can perform action
export function canPlayerAct(
  player: Player,
  phase: GamePhase, 
  isHost: boolean,
  roundState?: { phase_started: boolean }
): boolean {
  if (!player.alive) return false
  
  // For night phases, check if the phase has been started by the host
  const isNightPhase = ['night_wolf', 'night_police', 'night_doctor'].includes(phase)
  if (isNightPhase && (!roundState || roundState.phase_started === false)) {
    console.log('🔧 canPlayerAct: Phase not started yet', { player: player.name, phase, roundState })
    return false // Phase not started yet
  }
  
  console.log('🔧 canPlayerAct Debug:', {
    player: player.name,
    role: player.role,
    phase,
    isHost,
    roundState,
    isNightPhase,
    phaseStarted: roundState?.phase_started
  })
  
  switch (phase) {
    case 'night_wolf':
      return (player.role === 'werwolf' || player.role === 'werewolf') || isHost
    case 'night_doctor':
      return player.role === 'doctor' || isHost
    case 'night_police':
      return player.role === 'police' || isHost
    case 'day_vote':
    case 'day_final_vote':
      return true // All alive players can vote
    default:
      return isHost
  }
}

// Get role display name
export function getRoleDisplayName(role: PlayerRole): string {
  switch (role) {
    case 'werewolf':
    case 'werwolf':
      return 'Werwolf'
    case 'doctor':
      return 'Doctor'
    case 'police':
      return 'Police'
    case 'villager':
      return 'Villager'
    default:
      return 'Unknown'
  }
}

// Sort players with proper ordering based on current player type
export function sortPlayers(players: Player[], currentPlayerId?: string): Player[] {
  return [...players].sort((a, b) => {
    // Find current player to determine if they are host
    const currentPlayer = players.find(p => p.id === currentPlayerId)
    const isCurrentPlayerHost = currentPlayer?.is_host || false
    
    // Host always first
    if (a.is_host && !b.is_host) return -1
    if (!a.is_host && b.is_host) return 1
    if (a.is_host && b.is_host) return 0
    
    // If current player is the host, use host-specific ordering
    if (isCurrentPlayerHost) {
      // Host sees: Host -> Werwolf -> Police -> Doctor -> Other alive players -> Dead players
      const roleOrder = { werewolf: 1, werwolf: 1, police: 2, doctor: 3, villager: 4 }
      
      // Get role priority (lower number = higher priority)
      const aRolePriority = roleOrder[a.role as keyof typeof roleOrder] || 4
      const bRolePriority = roleOrder[b.role as keyof typeof roleOrder] || 4
      
      // Sort by role priority first
      if (aRolePriority !== bRolePriority) {
        return aRolePriority - bRolePriority
      }
      
      // If same role, alive players before dead players
      if (a.alive && !b.alive) return -1
      if (!a.alive && b.alive) return 1
      
      return 0
    } else {
      // For regular players: Host -> Current player -> Other alive players -> Dead players
      if (currentPlayerId) {
        // Current player second (only if not host)
        if (a.id === currentPlayerId && b.id !== currentPlayerId) return -1
        if (a.id !== currentPlayerId && b.id === currentPlayerId) return 1
      }
      
      // Alive players before dead players
      if (a.alive && !b.alive) return -1
      if (!a.alive && b.alive) return 1
      
      return 0
    }
  })
}

// Get phase display name
export function getPhaseDisplayName(phase: GamePhase): string {
  switch (phase) {
    case 'lobby':
      return 'Lobby'
    case 'night_wolf':
      return 'Night - Werwolf Turn'
    case 'night_police':
      return 'Night - Police Turn'
    case 'night_doctor':
      return 'Night - Doctor Turn'
    case 'reveal':
      return 'Reveal the Dead'
    case 'day_vote':
      return 'Day - Voting'
    case 'day_final_vote':
      return 'Day - Final Vote'
    case 'ended':
      return 'Game Ended'
    default:
      return 'Unknown Phase'
  }
}
