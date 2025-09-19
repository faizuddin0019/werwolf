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

// Assign roles to players
export function assignRoles(players: Player[]): Player[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  const werwolfCount = getWerwolfCount(players.length)
  
  return shuffled.map((player, index) => {
    let role: PlayerRole = 'villager'
    
    if (index < werwolfCount) {
      role = 'werewolf'
    } else if (index === werwolfCount) {
      role = 'doctor'
    } else if (index === werwolfCount + 1) {
      role = 'police'
    }
    
    return { ...player, role }
  })
}

// Check win conditions
export function checkWinCondition(game: Game, players: Player[]): 'villagers' | 'werewolves' | null {
  const alivePlayers = players.filter(p => p.alive)
  const aliveWerwolves = alivePlayers.filter(p => p.role === 'werewolf')
  const aliveVillagers = alivePlayers.filter(p => p.role !== 'werewolf')
  
  // Werwolves win if they equal or outnumber villagers
  if (aliveWerwolves.length >= aliveVillagers.length) {
    return 'werewolves'
  }
  
  // Villagers win if all werwolves are eliminated
  if (aliveWerwolves.length === 0) {
    return 'villagers'
  }
  
  return null
}

// Get next phase in the game flow
export function getNextPhase(currentPhase: GamePhase): GamePhase {
  switch (currentPhase) {
    case 'lobby':
      return 'night_wolf'
    case 'night_wolf':
      return 'night_police'
    case 'night_police':
      return 'night_doctor'
    case 'night_doctor':
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
  isHost: boolean
): boolean {
  if (!player.alive) return false
  
  switch (phase) {
    case 'night_wolf':
      return player.role === 'werewolf' || isHost
    case 'night_police':
      return player.role === 'police' || isHost
    case 'night_doctor':
      return player.role === 'doctor' || isHost
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
