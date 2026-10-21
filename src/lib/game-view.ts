import type { Game, Player, RoundState } from '@/lib/supabase'

// Explicit allowlists keep future database columns private by default.
export function playerView(player: Player, viewer: Player): Player {
  const own = player.id === viewer.id
  return {
    id: player.id,
    game_id: player.game_id,
    client_id: own ? player.client_id : '',
    name: player.name,
    role: viewer.is_host || own ? player.role : null,
    alive: player.alive,
    is_host: player.is_host,
  }
}

export function gameView(game: Game, viewer: Player): Game {
  return {
    id: game.id, code: game.code, created_at: game.created_at,
    host_client_id: viewer.is_host ? viewer.client_id : '',
    phase: game.phase, win_state: game.win_state, day_count: game.day_count,
  }
}

export function roundView(round: (RoundState & { wolf_target_map?: string | null }) | null, viewer: Player): RoundState | null {
  if (!round) return null
  if (viewer.is_host) return round
  return {
    game_id: round.game_id,
    phase_started: round.phase_started,
    wolf_target_player_id: null,
    doctor_save_player_id: viewer.alive && viewer.role === 'doctor' ? round.doctor_save_player_id : null,
    police_inspect_player_id: viewer.alive && viewer.role === 'police' ? round.police_inspect_player_id : null,
    police_inspect_result: viewer.alive && viewer.role === 'police' ? round.police_inspect_result : null,
    // Deaths are represented publicly by players.alive after the reveal.
    resolved_death_player_id: null,
  }
}
