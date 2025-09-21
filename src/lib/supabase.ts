import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Clean up the API key by removing any whitespace/newlines
const cleanSupabaseUrl = supabaseUrl?.trim()
const cleanSupabaseAnonKey = supabaseAnonKey?.trim().replace(/[\r\n]/g, '')

// Only create client if we have valid environment variables
export const supabase = (cleanSupabaseUrl && cleanSupabaseAnonKey && 
  cleanSupabaseUrl.startsWith('https://') && 
  !cleanSupabaseUrl.includes('placeholder')) 
  ? createClient(cleanSupabaseUrl, cleanSupabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/[\r\n]/g, '')
  
  return !!(url && key && 
           url.startsWith('https://') && 
           !url.includes('placeholder') &&
           key.length > 10)
}

// Database types
export type GamePhase = 
  | 'lobby' 
  | 'night_wolf' 
  | 'night_police' 
  | 'night_doctor' 
  | 'reveal' 
  | 'day_vote' 
  | 'day_final_vote' 
  | 'ended'

export type PlayerRole = 'villager' | 'werewolf' | 'doctor' | 'police' | null
export type WinState = 'villagers' | 'werewolves' | null
export type PoliceResult = 'werewolf' | 'not_werewolf' | null
export type VotePhase = 'day_vote' | 'day_final_vote'
export type LeaveRequestStatus = 'pending' | 'approved' | 'denied'

export interface Game {
  id: string
  code: string
  created_at: string
  host_client_id: string
  phase: GamePhase
  win_state: WinState
  day_count: number
}

export interface Player {
  id: string
  game_id: string
  client_id: string
  name: string
  role: PlayerRole
  alive: boolean
  is_host: boolean
}

export interface RoundState {
  game_id: string
  phase_started: boolean
  wolf_target_player_id: string | null
  police_inspect_player_id: string | null
  police_inspect_result: PoliceResult
  doctor_save_player_id: string | null
  resolved_death_player_id: string | null
}

export interface Vote {
  id: string
  game_id: string
  voter_player_id: string
  target_player_id: string
  round: number
  phase: VotePhase
}

export interface LeaveRequest {
  id: string
  game_id: string
  player_id: string
  status: LeaveRequestStatus
  requested_at: string
  processed_at: string | null
  processed_by: string | null
}
