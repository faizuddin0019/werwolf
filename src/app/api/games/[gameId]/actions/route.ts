import { NextRequest, NextResponse } from 'next/server'
import { supabase, Game, Player, isSupabaseConfigured } from '@/lib/supabase'
import { assignRoles, getNextPhase, checkWinCondition, getWerwolfCount } from '@/lib/game-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ 
        error: 'Supabase not configured. Please set up your environment variables.' 
      }, { status: 503 })
    }

    const { action, clientId, data } = await request.json()
    const { gameId } = await params
    
    if (!action || !clientId) {
      return NextResponse.json({ error: 'Action and client ID are required' }, { status: 400 })
    }
    
    // Get current game state
    const { data: game, error: gameError } = await supabase!
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()
    
    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    // Get current player
    const { data: currentPlayer, error: playerError } = await supabase!
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('client_id', clientId)
      .single()
    
    if (playerError || !currentPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Verify host permissions for most actions
    if (!currentPlayer.is_host && !['vote', 'revoke_vote', 'request_leave', 'approve_leave', 'deny_leave', 'remove_player', 'wolf_select', 'police_inspect', 'doctor_save'].includes(action)) {
      return NextResponse.json({ error: 'Only the host can perform this action' }, { status: 403 })
    }
    
    // Host-only actions
    if (['approve_leave', 'deny_leave', 'remove_player'].includes(action) && !currentPlayer.is_host) {
      return NextResponse.json({ error: 'Only the host can perform this action' }, { status: 403 })
    }
    
    // Prevent hosts from requesting to leave - they must end the game instead
    if (action === 'request_leave' && currentPlayer.is_host) {
      return NextResponse.json({ error: 'Host cannot request to leave. Use "End Game" instead.' }, { status: 403 })
    }
    
    console.log('🔧 Action received:', action, 'for game:', gameId, 'by player:', currentPlayer.name)
    
    switch (action) {
      case 'assign_roles':
        return await handleAssignRoles(gameId, game)
      
      case 'end_game':
        return await handleEndGame(gameId)
      
      case 'change_role':
        return await handleChangeRole(gameId, currentPlayer, data?.playerId, data?.newRole)
      
      case 'leave_game':
        return await handleLeaveGame(gameId, game, currentPlayer)
      
      case 'request_leave':
        return await handleRequestLeave(gameId, currentPlayer)
      
      case 'approve_leave':
        return await handleApproveLeave(gameId, currentPlayer, data?.playerId)
      
      case 'deny_leave':
        return await handleDenyLeave(gameId, currentPlayer, data?.playerId)
      
      case 'remove_player':
        return await handleRemovePlayer(gameId, currentPlayer, data?.playerId)
      
      case 'next_phase':
        return await handleNextPhase(gameId, game, data?.phase)
      
      case 'wolf_select':
        return await handleWolfSelect(gameId, currentPlayer, data?.targetId)
      
      case 'police_inspect':
        return await handlePoliceInspect(gameId, currentPlayer, data?.targetId)
      
      case 'doctor_save':
        return await handleDoctorSave(gameId, currentPlayer, data?.targetId)
      
      case 'reveal_dead':
        return await handleRevealDead(gameId, game)
      
      case 'begin_voting':
        return await handleBeginVoting(gameId)
      
      case 'vote':
        return await handleVote(gameId, currentPlayer, data?.targetId, game.day_count, game.phase)
      
      case 'revoke_vote':
        return await handleRevokeVote(gameId, currentPlayer, game.day_count, game.phase)
      
      case 'final_vote':
        return await handleFinalVote(gameId, game)
      
      case 'eliminate_player':
        return await handleEliminatePlayer(gameId, game)
      
      case 'end_game':
        return await handleEndGame(gameId)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in POST /api/games/[gameId]/actions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleAssignRoles(gameId: string, game: Game) {
  console.log('🔧 handleAssignRoles called for game:', gameId, 'phase:', game.phase)
  
  if (game.phase !== 'lobby') {
    console.log('❌ Game not in lobby phase:', game.phase)
    return NextResponse.json({ error: 'Roles can only be assigned in lobby' }, { status: 400 })
  }
  
  // Get all players
  const { data: players, error: playersError } = await supabase!
    .from('players')
    .select('id, game_id, client_id, name, role, alive, is_host')
    .eq('game_id', gameId)
  
  if (playersError || !players) {
    console.error('❌ Failed to fetch players:', playersError)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
  
  console.log('🔧 Found players:', players.length, players.map(p => ({ name: p.name, is_host: p.is_host })))
  
  // Check if we have enough non-host players (need 6 non-host players + 1 host = 7 total)
  const nonHostPlayers = players.filter(p => !p.is_host)
  console.log('🔧 Non-host players:', nonHostPlayers.length)
  
  if (nonHostPlayers.length < 6) {
    console.log('❌ Not enough players:', nonHostPlayers.length, 'need at least 6')
    return NextResponse.json({ error: 'Need at least 6 non-host players to start' }, { status: 400 })
  }
  
  // Assign roles deterministically by player id order (host excluded)
  const nonHostSorted = [...nonHostPlayers].sort((a, b) => a.id.localeCompare(b.id))
  const werCount = getWerwolfCount(nonHostSorted.length)
  const roleById = new Map<string, string>()
  nonHostSorted.forEach((p, idx) => {
    let role: string = 'villager'
    if (idx < werCount) role = 'werwolf'
    else if (idx === werCount) role = 'doctor'
    else if (idx === werCount + 1) role = 'police'
    roleById.set(p.id, role)
  })
  console.log('🔧 Roles assigned (by id):', nonHostSorted.map(p => ({ name: p.name, id: p.id, role: roleById.get(p.id) })))
  
  // Update players with roles (only non-host players) using original player ids
  console.log('🔧 Updating player roles in database...')
  const updates = nonHostPlayers.map(p => ({ client_id: p.client_id, role: roleById.get(p.id)! }))
  if (updates.some(u => !u.role)) {
    console.error('❌ Missing role for some players (by client_id)', { updates })
    return NextResponse.json({ error: 'Failed to assign all roles' }, { status: 500 })
  }
  for (const u of updates) {
    const { error } = await supabase!
      .from('players')
      .update({ role: u.role })
      .eq('game_id', gameId)
      .eq('client_id', u.client_id)
    if (error) {
      console.error('❌ Role update failed for player (by client_id)', u, error)
      return NextResponse.json({ error: 'Failed to update player roles', details: error }, { status: 500 })
    }
  }

  // Verify and log assigned roles
  const { data: verifyPlayers } = await supabase!
    .from('players')
    .select('name, role, is_host')
    .eq('game_id', gameId)
  console.log('🔧 Assigned roles verification:', verifyPlayers)
  
  // Check if round state already exists, if not create it
  console.log('🔧 Checking if round state exists...')
  const { data: existingRoundState } = await supabase!
    .from('round_state')
    .select('game_id')
    .eq('game_id', gameId)
    .single()
  
          if (!existingRoundState) {
            console.log('🔧 Creating initial round state...')
            const { error: roundStateError } = await supabase!
              .from('round_state')
              .insert({
                game_id: gameId,
                phase_started: false
              })
    
    if (roundStateError) {
      console.error('❌ Error creating round state:', roundStateError)
      
      // If phase_started column doesn't exist, create without it
      if (roundStateError.code === 'PGRST204' && roundStateError.message.includes('phase_started')) {
        console.log('⚠️ Creating round state without phase_started column')
        const { error: roundStateError2 } = await supabase!
          .from('round_state')
          .insert({
            game_id: gameId
          })
        
        if (roundStateError2) {
          console.error('❌ Error creating round state without phase_started:', roundStateError2)
          return NextResponse.json({ error: 'Failed to create round state' }, { status: 500 })
        }
        console.log('✅ Round state created without phase_started column')
      } else {
        return NextResponse.json({ error: 'Failed to create round state' }, { status: 500 })
      }
    } else {
      console.log('✅ Round state created successfully')
    }
  } else {
    console.log('🔧 Round state already exists, skipping creation')
  }
  
  console.log('✅ Role assignment completed successfully!')
  
  // Immediately enter first night phase with phase_started=false.
  // Host will then click "Wake Up Werwolf" (next_phase) to start the phase.
  console.log('🔧 Entering night_wolf (phase_started=false) after role assignment')
  
  // Ensure round_state exists and is reset for a fresh night
  const { error: resetRoundStateError } = await supabase!
    .from('round_state')
    .upsert({
      game_id: gameId,
      phase_started: false,
      wolf_target_player_id: null,
      doctor_save_player_id: null,
      police_inspect_player_id: null,
      police_inspect_result: null,
      resolved_death_player_id: null
    }, { onConflict: 'game_id' })
  if (resetRoundStateError) {
    console.error('❌ Error preparing round state for night_wolf:', resetRoundStateError)
    return NextResponse.json({ error: 'Failed to prepare round state' }, { status: 500 })
  }
  
  // Move game to night_wolf (unconditional; host owns authority)
  const { data: updatedGame, error: toNightError } = await supabase!
    .from('games')
    .update({ phase: 'night_wolf' })
    .eq('id', gameId)
    .select('id, phase')
    .single()
  if (toNightError) {
    console.error('❌ Error updating game phase to night_wolf:', toNightError)
    return NextResponse.json({ error: 'Failed to update game phase' }, { status: 500 })
  }
  if (!updatedGame) {
    return NextResponse.json({ error: 'Failed to set night_wolf phase' }, { status: 500 })
  }
  
  return NextResponse.json({ success: true, phase: updatedGame.phase })
}

async function handleNextPhase(gameId: string, game: Game, targetPhase?: string) {
  console.log('🔧 handleNextPhase called for game:', gameId, 'current phase:', game.phase)
  
  // Handle transition from lobby to first night phase (Wakeup Werwolf)
  if (game.phase === 'lobby') {
    console.log('🔧 Host clicked "Wakeup Werwolf" - transitioning to night_wolf phase')
    
    // Update game phase to night_wolf
    // Optimistic concurrency guard: only advance if still lobby
    const { data: updatedGame, error: phaseError } = await supabase!
      .from('games')
      .update({ phase: 'night_wolf' })
      .eq('id', gameId)
      .eq('phase', 'lobby')
      .select('id, phase')
      .single()
    
    if (phaseError) {
      console.error('❌ Error updating game phase to night_wolf:', phaseError)
      return NextResponse.json({ error: 'Failed to update game phase' }, { status: 500 })
    }
    if (!updatedGame) {
      return NextResponse.json({ error: 'State changed; retry next_phase' }, { status: 409 })
    }
    
    // Create or update round state to start the phase
    const { data: existingRoundState } = await supabase!
      .from('round_state')
      .select('*')
      .eq('game_id', gameId)
      .single()
    
    if (existingRoundState) {
      // Update existing round state to start the phase
      const { error: updateError } = await supabase!
        .from('round_state')
        .update({ phase_started: true })
        .eq('game_id', gameId)
      
      if (updateError) {
        console.error('❌ Error updating round state:', updateError)
        // Continue anyway - phase_started column might not exist
      } else {
        console.log('✅ Round state updated - phase started!')
      }
    } else {
      // Create new round state
      const { error: createError } = await supabase!
        .from('round_state')
        .insert({
          game_id: gameId,
          phase_started: true
        })
      
      if (createError) {
        console.error('❌ Error creating round state:', createError)
        // Continue anyway - phase_started column might not exist
      } else {
        console.log('✅ Round state created - phase started!')
      }
    }
    
    console.log('✅ Game phase updated to night_wolf!')
    return NextResponse.json({ success: true, phase: 'night_wolf', action: 'phase_advanced' })
  }
  
  // Handle night_wolf: if phase not started, start it and clear any stale selections; otherwise if targets chosen by all alive wolves, move to doctor
  if (game.phase === 'night_wolf') {
    // Do NOT skip wolf phase even if no wolves alive; host will advance manually
    const { data: round } = await supabase!
      .from('round_state')
      .select('*')
      .eq('game_id', gameId)
      .single()
    
    if (!round || round.phase_started !== true) {
      const { error: startErr } = await supabase!
        .from('round_state')
        .update({
          phase_started: true,
          // Clear stale previous-night selections
          wolf_target_player_id: null,
          doctor_save_player_id: null,
          police_inspect_player_id: null,
          police_inspect_result: null,
          resolved_death_player_id: null
        })
        .eq('game_id', gameId)
      if (startErr) {
        console.error('❌ Error starting night_wolf phase:', startErr)
        return NextResponse.json({ error: 'Failed to start werwolf phase' }, { status: 500 })
      }
      console.log('✅ night_wolf phase started; selections cleared')
      return NextResponse.json({ success: true, phase: 'night_wolf', action: 'phase_started' })
    }
    // If at least one target chosen, allow advance to doctor
    if ((round as any).wolf_target_map || round.wolf_target_player_id) {
      const { data: updatedGame, error: phaseError } = await supabase!
        .from('games')
        .update({ phase: 'night_doctor' })
        .eq('id', gameId)
        .eq('phase', 'night_wolf')
        .select('id, phase')
        .single()
      if (phaseError) {
        console.error('❌ Error updating game phase to night_doctor:', phaseError)
        return NextResponse.json({ error: 'Failed to update game phase' }, { status: 500 })
      }
      if (!updatedGame) {
        return NextResponse.json({ error: 'State changed; retry next_phase' }, { status: 409 })
      }
      // Ensure doctor gets a fresh turn
      const { error: clearDoctorErr } = await supabase!
        .from('round_state')
        .update({
          phase_started: true,
          doctor_save_player_id: null
        })
        .eq('game_id', gameId)
      if (clearDoctorErr) {
        console.error('❌ Error clearing doctor state for new phase:', clearDoctorErr)
      }
      console.log('✅ Game phase updated to night_doctor!')
      return NextResponse.json({ success: true, phase: 'night_doctor', action: 'phase_advanced' })
    }
    // Otherwise, remain in night_wolf awaiting selection
    return NextResponse.json({ success: true, phase: 'night_wolf', action: 'awaiting_wolf' })
  }
  
  // Handle transition from night_doctor to night_police (Wakeup Police)
  if (game.phase === 'night_doctor') {
    // Do NOT skip doctor phase; if doctor dead, host click should advance immediately via existing logic
    console.log('🔧 Host clicked "Wakeup Police" - transitioning to night_police phase')
    
    // Update game phase to night_police
    const { data: updatedGame, error: phaseError } = await supabase!
      .from('games')
      .update({ phase: 'night_police' })
      .eq('id', gameId)
      .eq('phase', 'night_doctor')
      .select('id, phase')
      .single()
    
    if (phaseError) {
      console.error('❌ Error updating game phase to night_police:', phaseError)
      return NextResponse.json({ error: 'Failed to update game phase' }, { status: 500 })
    }
    if (!updatedGame) {
      return NextResponse.json({ error: 'State changed; retry next_phase' }, { status: 409 })
    }
    
    // Ensure police gets a fresh turn
    const { error: clearPoliceErr } = await supabase!
      .from('round_state')
      .update({
        phase_started: true,
        police_inspect_player_id: null,
        police_inspect_result: null
      })
      .eq('game_id', gameId)
    if (clearPoliceErr) {
      console.error('❌ Error clearing police state for new phase:', clearPoliceErr)
    }
    console.log('✅ Game phase updated to night_police!')
    return NextResponse.json({ success: true, phase: 'night_police', action: 'phase_advanced' })
  }
  
  // Handle night_police: only start the phase; do NOT auto-advance.
  // After police acts OR if no police alive, host must "Reveal the Dead" explicitly via reveal_dead.
  if (game.phase === 'night_police') {
    // If no alive police, allow host to proceed to reveal directly on next_phase
    const { data: alivePolice } = await supabase!
      .from('players')
      .select('id')
      .eq('game_id', gameId)
      .eq('alive', true)
      .eq('role', 'police')
    if (!alivePolice || alivePolice.length === 0) {
      // Ensure phase_started is set so UI allows Reveal
      await supabase!
        .from('round_state')
        .update({ phase_started: true })
        .eq('game_id', gameId)
      console.log('🔧 No police alive - awaiting reveal_dead directly')
      return NextResponse.json({ success: true, phase: 'night_police', action: 'awaiting_reveal' })
    }
    // Ensure phase_started is true; otherwise start it
    const { data: round } = await supabase!
      .from('round_state')
      .select('phase_started, police_inspect_player_id')
      .eq('game_id', gameId)
      .single()

    if (!round || round.phase_started !== true) {
      const { error: startErr } = await supabase!
        .from('round_state')
        .update({ phase_started: true })
        .eq('game_id', gameId)
      if (startErr) {
        console.error('❌ Error starting night_police phase:', startErr)
        return NextResponse.json({ error: 'Failed to start police phase' }, { status: 500 })
      }
      console.log('✅ night_police phase started')
      return NextResponse.json({ success: true, phase: 'night_police', action: 'phase_started' })
    }

    // If already started, remain in night_police awaiting reveal_dead
    const awaiting = round?.police_inspect_player_id ? 'awaiting_reveal' : 'awaiting_inspection'
    console.log(`🔧 night_police ongoing - ${awaiting}`)
    return NextResponse.json({ success: true, phase: 'night_police', action: awaiting })
  }
  
  // Handle other phase transitions (day phases, etc.)
  const nextPhase = targetPhase || getNextPhase(game.phase)
  console.log('🔧 Advancing to next phase:', nextPhase)
  
  const { error: phaseError } = await supabase!
    .from('games')
    .update({ phase: nextPhase })
    .eq('id', gameId)
  
  if (phaseError) {
    console.error('❌ Error updating game phase:', phaseError)
    return NextResponse.json({ error: 'Failed to update game phase' }, { status: 500 })
  }
  
  console.log('✅ Game phase updated to', nextPhase)
  return NextResponse.json({ success: true, phase: nextPhase, action: 'phase_advanced' })
}
async function handleWolfSelect(gameId: string, player: Player, targetId: string) {
  console.log('🔧 handleWolfSelect: Player role check:', { playerId: player.id, playerName: player.name, role: player.role, isWerwolf: player.role === 'werwolf' || player.role === 'werewolf' })
  
  if (player.role !== 'werwolf' && player.role !== 'werewolf') {
    return NextResponse.json({ error: 'Only werewolves can select targets' }, { status: 403 })
  }
  
  // Get current game phase
  const { data: game } = await supabase!
    .from('games')
    .select('phase')
    .eq('id', gameId)
    .single()
  
  if (!game || game.phase !== 'night_wolf') {
    console.log('🔧 Werwolf can only act during night_wolf phase, current phase:', game?.phase)
    return NextResponse.json({ error: 'Werwolf can only act during the wolf phase' }, { status: 400 })
  }
  
  // Check if werwolf has already selected a target and if phase has been started
  const { data: roundState } = await supabase!
    .from('round_state')
    .select('wolf_target_player_id, phase_started')
    .eq('game_id', gameId)
    .single()
  
  console.log('🔧 Werwolf select check:', { gameId, roundState, wolfTargetPlayerId: roundState?.wolf_target_player_id, phaseStarted: roundState?.phase_started })
  
  // Check if phase has been started by host
  if (!roundState || roundState.phase_started !== true) {
    console.log('🔧 Phase not started yet, rejecting werwolf action')
    return NextResponse.json({ error: 'Phase has not been started by the host yet' }, { status: 400 })
  }
  
  // Multiple wolves: prefer writing to text map column if it exists; keep uuid column as last single target
  const { data: round } = await supabase!
    .from('round_state')
    .select('*')
    .eq('game_id', gameId)
    .single()
  const hasMap = round && Object.prototype.hasOwnProperty.call(round, 'wolf_target_map')
  if (hasMap) {
    const existingMap: string = (round as any).wolf_target_map || ''
    const parts = existingMap.split(',').filter(Boolean)
    const filtered = parts.filter((p: string) => !p.startsWith(player.id + ':'))
    const next = [...filtered, `${player.id}:${targetId}`]
    const nextEncoded = next.join(',')
    const { error: updErr } = await supabase!
      .from('round_state')
      .update({ wolf_target_map: nextEncoded, wolf_target_player_id: targetId })
      .eq('game_id', gameId)
    if (updErr) {
      console.error('🔧 Werwolf select map update error:', updErr)
      return NextResponse.json({ error: 'Failed to update werwolf selection' }, { status: 500 })
    }
    console.log('🔧 Werwolf select update (map+uuid):', { wolf: player.id, targetId, encoded: nextEncoded })
  } else {
    // Legacy schema: only uuid column available; store last target safely (single-target semantics)
    const { error: updErr } = await supabase!
      .from('round_state')
      .update({ wolf_target_player_id: targetId })
      .eq('game_id', gameId)
    if (updErr) {
      console.error('🔧 Werwolf select uuid update error:', updErr)
      return NextResponse.json({ error: 'Failed to update werwolf selection' }, { status: 500 })
    }
    console.log('🔧 Werwolf select update (uuid only, legacy):', { wolf: player.id, targetId })
  }
  
  // Don't automatically advance phase - let host control it
  return NextResponse.json({ success: true })
}

async function handlePoliceInspect(gameId: string, player: Player, targetId: string) {
  if (player.role !== 'police') {
    return NextResponse.json({ error: 'Only police can inspect players' }, { status: 403 })
  }
  
  // Get current game phase
  const { data: game } = await supabase!
    .from('games')
    .select('phase')
    .eq('id', gameId)
    .single()
  
  if (!game || game.phase !== 'night_police') {
    console.log('🔧 Police can only act during night_police phase, current phase:', game?.phase)
    return NextResponse.json({ error: 'Police can only act during the police phase' }, { status: 400 })
  }
  
  // Check if police has already inspected someone and if phase has been started
  const { data: roundState } = await supabase!
    .from('round_state')
    .select('police_inspect_player_id, phase_started')
    .eq('game_id', gameId)
    .single()
  
  console.log('🔧 Police inspect check:', { gameId, roundState, policeInspectPlayerId: roundState?.police_inspect_player_id, phaseStarted: roundState?.phase_started })
  
  // Check if phase has been started by host
  if (!roundState || roundState.phase_started !== true) {
    console.log('🔧 Phase not started yet, rejecting police action')
    return NextResponse.json({ error: 'Phase has not been started by the host yet' }, { status: 400 })
  }
  
  // Allow overriding inspect within the same phase until host advances
  
  // Get target player
  const { data: targetPlayer } = await supabase!
    .from('players')
    .select('role')
    .eq('id', targetId)
    .single()
  
  const result = (targetPlayer?.role === 'werwolf' || targetPlayer?.role === 'werewolf') ? 'werewolf' : 'not_werewolf'
  
  const { error: updateError } = await supabase!
    .from('round_state')
    .update({ 
      police_inspect_player_id: targetId,
      police_inspect_result: result
    })
    .eq('game_id', gameId)
  
  if (updateError) {
    console.error('🔧 Police inspect update error:', updateError)
    return NextResponse.json({ error: 'Failed to update police inspection' }, { status: 500 })
  }
  
  console.log('🔧 Police inspect update successful:', { targetId, result })
  
  // Don't automatically advance phase - let host control it
  return NextResponse.json({ success: true, result })
}

async function handleDoctorSave(gameId: string, player: Player, targetId: string) {
  if (player.role !== 'doctor') {
    return NextResponse.json({ error: 'Only doctors can save players' }, { status: 403 })
  }
  
  // Get current game phase
  const { data: game } = await supabase!
    .from('games')
    .select('phase')
    .eq('id', gameId)
    .single()
  
  if (!game || game.phase !== 'night_doctor') {
    console.log('🔧 Doctor can only act during night_doctor phase, current phase:', game?.phase)
    return NextResponse.json({ error: 'Doctor can only act during the doctor phase' }, { status: 400 })
  }
  
  // Check if doctor has already saved someone and if phase has been started
  const { data: roundState } = await supabase!
    .from('round_state')
    .select('doctor_save_player_id, phase_started')
    .eq('game_id', gameId)
    .single()
  
  console.log('🔧 Doctor save check:', { gameId, roundState, doctorSavePlayerId: roundState?.doctor_save_player_id, phaseStarted: roundState?.phase_started })
  
  // Check if phase has been started by host
  if (!roundState || roundState.phase_started !== true) {
    console.log('🔧 Phase not started yet, rejecting doctor action')
    return NextResponse.json({ error: 'Phase has not been started by the host yet' }, { status: 400 })
  }
  
  // Allow overriding save within the same phase until host advances
  
  const { error: updateError } = await supabase!
    .from('round_state')
    .update({ doctor_save_player_id: targetId })
    .eq('game_id', gameId)
  
  if (updateError) {
    console.error('🔧 Doctor save update error:', updateError)
    return NextResponse.json({ error: 'Failed to update doctor save' }, { status: 500 })
  }
  
  console.log('🔧 Doctor save update successful:', { targetId })
  
  // Don't automatically advance phase - let host control it
  return NextResponse.json({ success: true })
}

async function handleRevealDead(gameId: string, game: Game) {
  try {
    console.log('🔧 handleRevealDead called for game:', gameId)
    
    // Check if we're in the correct phase for reveal_dead
    if (game.phase !== 'night_police') {
      console.log('🔧 Reveal dead can only be called during night_police phase, current phase:', game.phase)
      return NextResponse.json({ error: 'Reveal dead can only be called during the police phase' }, { status: 400 })
    }
    
    // Get round state
    const { data: roundState, error: roundStateError } = await supabase!
      .from('round_state')
      .select('*')
      .eq('game_id', gameId)
      .single()
    
    if (roundStateError) {
      console.error('Error fetching round state:', roundStateError)
      return NextResponse.json({ error: `Failed to fetch round state: ${roundStateError.message}` }, { status: 500 })
    }
    
    if (!roundState) {
      console.error('No round state found for game:', gameId)
      return NextResponse.json({ error: 'Round state not found' }, { status: 500 })
    }
    
    console.log('🔧 Round state found:', {
      id: roundState.id,
      wolf_target: roundState.wolf_target_player_id,
      doctor_save: roundState.doctor_save_player_id
    })
    
    // Determine deaths: with multiple wolves, decode selections and apply doctor save to one saved target only
    let deadPlayerIds: string[] = []
    if (roundState.wolf_target_player_id || (roundState as any).resolved_death_player_id) {
      const mapString = ((roundState as any).wolf_target_map as string | undefined)
      const bufferPairs = ((roundState as any).resolved_death_player_id as string | undefined)
      const source = mapString && mapString.length > 0
        ? mapString
        : (bufferPairs && bufferPairs.length > 0 ? bufferPairs : String(roundState.wolf_target_player_id))
      const selections = source.split(',').filter(Boolean)
      // Support both formats: "wolfId:targetId" and legacy "targetId"
      const targets = selections
        .map((sel) => (sel.includes(':') ? sel.split(':')[1] : sel))
        .filter(Boolean)
      const uniqueTargets = Array.from(new Set(targets))
      // Doctor saves one target if matches)
      const saveId = roundState.doctor_save_player_id || null
      deadPlayerIds = uniqueTargets.filter(t => t !== saveId)
    }
    
    console.log('🔧 Dead players determined:', deadPlayerIds)
    
    // Update round state with resolved death(s); do NOT clear picks here so host can see Action Status
    const { error: updateRoundStateError } = await supabase!
      .from('round_state')
      .update({ resolved_death_player_id: deadPlayerIds.join(',') || null })
      .eq('game_id', gameId)
    
    if (updateRoundStateError) {
      console.error('Error updating round state:', updateRoundStateError)
      return NextResponse.json({ error: `Failed to update round state: ${updateRoundStateError.message}` }, { status: 500 })
    }
    
    // Mark players as dead if they died (atomic, scoped to this game)
    if (deadPlayerIds.length > 0) {
      const { data: bulkData, error: bulkUpdateErr } = await supabase!
        .from('players')
        .update({ alive: false })
        .eq('game_id', gameId)
        .in('id', deadPlayerIds)
        .select('id')
      if (bulkUpdateErr) {
        console.error('Error bulk-updating player alive status:', bulkUpdateErr)
        return NextResponse.json({ error: `Failed to update player status: ${bulkUpdateErr.message}` }, { status: 500 })
      }
      const updatedIds = new Set((bulkData || []).map(r => r.id))
      const notUpdated = deadPlayerIds.filter(id => !updatedIds.has(id))
      // Fallback: update individually (handles strict RLS paths)
      for (const pid of notUpdated) {
        const { error: updErr } = await supabase!
          .from('players')
          .update({ alive: false })
          .eq('id', pid)
        if (updErr) {
          console.warn('Non-fatal: individual player update failed', { pid, updErr })
        }
      }
    }
    
    // Check win conditions after revealing dead
    const { data: allPlayers } = await supabase!
      .from('players')
      .select('*')
      .eq('game_id', gameId)
    
    console.log('🔧 About to call checkWinCondition with', allPlayers?.length, 'players')
    const winState = checkWinCondition(game, allPlayers || [])
    console.log('🔧 checkWinCondition returned:', winState)
    
    console.log('🔧 Win condition check result:', {
      winState,
      alivePlayers: allPlayers?.filter(p => p.alive && !p.is_host).length,
      aliveWerwolves: allPlayers?.filter(p => p.alive && !p.is_host && (p.role === 'werwolf' || p.role === 'werewolf')).length
    })
    
    // Update game state
    const updates: Partial<Game> = { 
      phase: winState ? 'ended' : 'reveal'
    }
    
    if (winState) {
      updates.win_state = winState
    }
    
    const { error: updateGameError } = await supabase!
      .from('games')
      .update(updates)
      .eq('id', gameId)
    
    if (updateGameError) {
      console.error('Error updating game phase:', updateGameError)
      return NextResponse.json({ error: `Failed to update game phase: ${updateGameError.message}` }, { status: 500 })
    }
    
    console.log('🔧 Reveal dead completed successfully')
    return NextResponse.json({ success: true, deadPlayerIds, winState })
    
  } catch (error) {
    console.error('Unexpected error in handleRevealDead:', error)
    return NextResponse.json({ error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}

async function handleBeginVoting(gameId: string) {
  console.log('🔧 handleBeginVoting called for game:', gameId)
  
  // Ensure we're in reveal phase before beginning voting
  const { data: game } = await supabase!
    .from('games')
    .select('phase')
    .eq('id', gameId)
    .single()
  if (!game || game.phase !== 'reveal') {
    return NextResponse.json({ error: 'Begin voting allowed only in reveal phase' }, { status: 400 })
  }
  
  // Update game phase to day_vote
  const { error: updateError } = await supabase!
    .from('games')
    .update({ phase: 'day_vote' })
    .eq('id', gameId)
  
  if (updateError) {
    console.error('Error updating game phase to day_vote:', updateError)
    return NextResponse.json({ error: 'Failed to begin voting' }, { status: 500 })
  }
  
  console.log('🔧 Voting phase started successfully')
  return NextResponse.json({ success: true })
}

async function handleVote(gameId: string, player: Player, targetId: string, round: number, phase: string) {
  if (!player.alive) {
    return NextResponse.json({ error: 'Dead players cannot vote' }, { status: 403 })
  }
  
  if (player.is_host) {
    return NextResponse.json({ error: 'Host cannot vote' }, { status: 403 })
  }
  
  if (!['day_vote', 'day_final_vote'].includes(phase)) {
    return NextResponse.json({ error: 'Voting is only allowed during day phases' }, { status: 400 })
  }
  
  // Upsert vote (replace existing vote for this player/round/phase)
  await supabase!
    .from('votes')
    .upsert({
      game_id: gameId,
      voter_player_id: player.id,
      target_player_id: targetId,
      round,
      phase
    })
  
  return NextResponse.json({ success: true })
}

async function handleRevokeVote(gameId: string, player: Player, round: number, phase: string) {
  await supabase!
    .from('votes')
    .delete()
    .eq('game_id', gameId)
    .eq('voter_player_id', player.id)
    .eq('round', round)
    .eq('phase', phase)
  
  return NextResponse.json({ success: true })
}

async function handleFinalVote(gameId: string, game: Game) {
  // Clear any previous final-vote records for this round (idempotency)
  await supabase!
    .from('votes')
    .delete()
    .eq('game_id', gameId)
    .eq('round', game.day_count)
    .eq('phase', 'day_final_vote')

  // Clear initial votes so players must vote again in the final round
  await supabase!
    .from('votes')
    .delete()
    .eq('game_id', gameId)
    .eq('round', game.day_count)
    .eq('phase', 'day_vote')

  // Move to final vote phase
  await supabase!
    .from('games')
    .update({ phase: 'day_final_vote' })
    .eq('id', gameId)
  
  return NextResponse.json({ success: true })
}

async function handleEliminatePlayer(gameId: string, game: Game) {
  // Get vote counts for final vote
  const { data: votes } = await supabase!
    .from('votes')
    .select('target_player_id')
    .eq('game_id', gameId)
    .eq('round', game.day_count)
    .eq('phase', 'day_final_vote')
  
  if (!votes || votes.length === 0) {
    return NextResponse.json({ error: 'No votes to count' }, { status: 400 })
  }
  
  // Count votes
  const voteCounts: Record<string, number> = {}
  votes.forEach(vote => {
    voteCounts[vote.target_player_id] = (voteCounts[vote.target_player_id] || 0) + 1
  })
  
  // Find highest voted player
  let maxVotes = 0
  let eliminatedPlayerId: string | null = null
  
  Object.entries(voteCounts).forEach(([playerId, count]) => {
    if (count > maxVotes) {
      maxVotes = count
      eliminatedPlayerId = playerId
    }
  })
  
  if (!eliminatedPlayerId) {
    return NextResponse.json({ error: 'No player to eliminate' }, { status: 400 })
  }
  
  // Mark player as dead
  await supabase!
    .from('players')
    .update({ alive: false })
    .eq('id', eliminatedPlayerId)
  
  // Get eliminated player to check if they were a werwolf
  const { data: eliminatedPlayer } = await supabase!
    .from('players')
    .select('role')
    .eq('id', eliminatedPlayerId)
    .single()
  
  // Check win condition
  const { data: allPlayers } = await supabase!
    .from('players')
    .select('*')
    .eq('game_id', gameId)
  
  const winState = checkWinCondition(game, allPlayers || [])
  
  // Update game state
  const updates: Partial<Game> = { 
    day_count: game.day_count + 1,
    phase: winState ? 'ended' : 'night_wolf'
  }
  
  if (winState) {
    updates.win_state = winState
  }
  
  await supabase!
    .from('games')
    .update(updates)
    .eq('id', gameId)
  
  // Reset round state for the new night cycle when continuing the game
  if (!winState) {
    const { error: resetRoundStateError } = await supabase!
      .from('round_state')
      .update({
        wolf_target_player_id: null,
        doctor_save_player_id: null,
        police_inspect_player_id: null,
        police_inspect_result: null,
        resolved_death_player_id: null,
        // phase not started yet, UI should show fresh night
        phase_started: false
      })
      .eq('game_id', gameId)
    if (resetRoundStateError) {
      console.error('❌ Error resetting round state for new night:', resetRoundStateError)
      // Non-fatal: keep going; UI can still proceed but will show stale action status otherwise
    }
  }

  return NextResponse.json({ 
    success: true, 
    eliminatedPlayerId,
    wasWerwolf: eliminatedPlayer?.role === 'werwolf' || eliminatedPlayer?.role === 'werewolf',
    winState
  })
}

async function handleEndGame(gameId: string) {
  console.log('🔧 handleEndGame called - this should only happen when host clicks End Game button')
  
  // Update game phase to ended
  const { error: updateError } = await supabase!
    .from('games')
    .update({ phase: 'ended' })
    .eq('id', gameId)
  
  if (updateError) {
    console.error('Error ending game:', updateError)
    return NextResponse.json({ error: 'Failed to end game' }, { status: 500 })
  }
  
  // Clean up game data
  await cleanupGameData(gameId)
  
  return NextResponse.json({ success: true })
}

async function handleChangeRole(gameId: string, hostPlayer: Player, playerId: string, newRole: string) {
  if (!playerId || !newRole) {
    return NextResponse.json({ error: 'Player ID and new role are required' }, { status: 400 })
  }
  
  // Get the player to change role
  const { data: playerToChange, error: playerError } = await supabase!
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single()
  
  if (playerError || !playerToChange) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }
  
  // Prevent changing host's role
  if (playerToChange.is_host) {
    return NextResponse.json({ error: 'Cannot change host role' }, { status: 400 })
  }
  
  // Validate role
  const validRoles = ['villager', 'werwolf', 'werewolf', 'doctor', 'police']
  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  
  // Update player role
  const { error: updateError } = await supabase!
    .from('players')
    .update({ role: newRole })
    .eq('id', playerId)
  
  if (updateError) {
    console.error('Error changing player role:', updateError)
    return NextResponse.json({ error: 'Failed to change role' }, { status: 500 })
  }
  
  return NextResponse.json({ 
    success: true, 
    message: `Player role changed to ${newRole}` 
  })
}

async function handleLeaveGame(gameId: string, game: Game, currentPlayer: Player) {
  // Remove player from the game
  const { error: deleteError } = await supabase!
    .from('players')
    .delete()
    .eq('id', currentPlayer.id)
  
  if (deleteError) {
    console.error('Error removing player:', deleteError)
    return NextResponse.json({ error: 'Failed to leave game' }, { status: 500 })
  }
  
  // Check remaining player count
  const { data: remainingPlayers, error: playersError } = await supabase!
    .from('players')
    .select('*')
    .eq('game_id', gameId)
  
  if (playersError) {
    console.error('Error checking remaining players:', playersError)
    return NextResponse.json({ error: 'Failed to check remaining players' }, { status: 500 })
  }
  
  // If less than 6 non-host players remain, reset game to lobby state
  const nonHostPlayers = remainingPlayers.filter(p => !p.is_host)
  if (nonHostPlayers.length < 6) {
    // Reset game to lobby phase and clear any game progress
    const { error: resetGameError } = await supabase!
      .from('games')
      .update({ 
        phase: 'lobby',
        day_count: 0,
        win_state: null
      })
      .eq('id', gameId)
    
    if (resetGameError) {
      console.error('Error resetting game to lobby after player left:', resetGameError)
      return NextResponse.json({ error: 'Failed to reset game' }, { status: 500 })
    }
    
    // Clear any round state and votes (but keep players)
    await supabase!
      .from('round_state')
      .delete()
      .eq('game_id', gameId)
    
    await supabase!
      .from('votes')
      .delete()
      .eq('game_id', gameId)
    
    // Clear any pending leave requests
    await supabase!
      .from('leave_requests')
      .delete()
      .eq('game_id', gameId)
    
    return NextResponse.json({ 
      success: true, 
      gameEnded: false,
      gameReset: true,
      message: 'Player left and game reset to lobby due to insufficient players' 
    })
  }
  
  return NextResponse.json({ 
    success: true, 
    gameEnded: false,
    message: 'Player successfully left the game' 
  })
}

async function cleanupGameData(gameId: string) {
  try {
    // Delete all players from the game
    const { error: playersError } = await supabase!
      .from('players')
      .delete()
      .eq('game_id', gameId)
    
    if (playersError) {
      console.error('Error deleting players:', playersError)
    }
    
    // Delete all round states from the game
    const { error: roundsError } = await supabase!
      .from('round_state')
      .delete()
      .eq('game_id', gameId)
    
    if (roundsError) {
      console.error('Error deleting round states:', roundsError)
    }
    
    // Delete all votes from the game
    const { error: votesError } = await supabase!
      .from('votes')
      .delete()
      .eq('game_id', gameId)
    
    if (votesError) {
      console.error('Error deleting votes:', votesError)
    }
    
    // Delete all leave requests from the game
    const { error: leaveRequestsError } = await supabase!
      .from('leave_requests')
      .delete()
      .eq('game_id', gameId)
    
    if (leaveRequestsError) {
      console.error('Error deleting leave requests:', leaveRequestsError)
    }
    
    // Finally, delete the game itself
    const { error: gameError } = await supabase!
      .from('games')
      .delete()
      .eq('id', gameId)
    
    if (gameError) {
      console.error('Error deleting game:', gameError)
    }
    
    console.log(`Successfully cleaned up game data for game ${gameId}`)
  } catch (error) {
    console.error('Error during game cleanup:', error)
  }
}

// New leave request handlers
async function handleRequestLeave(gameId: string, currentPlayer: Player) {
  // Check if player already has a pending leave request
  const { data: existingRequest } = await supabase!
    .from('leave_requests')
    .select('*')
    .eq('game_id', gameId)
    .eq('player_id', currentPlayer.id)
    .eq('status', 'pending')
    .single()
  
  if (existingRequest) {
    return NextResponse.json({ error: 'You already have a pending leave request' }, { status: 400 })
  }
  
  // Create new leave request
  const { data: leaveRequest, error: createError } = await supabase!
    .from('leave_requests')
    .insert({
      game_id: gameId,
      player_id: currentPlayer.id,
      status: 'pending'
    })
    .select()
    .single()
  
  if (createError) {
    console.error('Error creating leave request:', createError)
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
  }
  
  console.log('🔧 Leave request created successfully:', leaveRequest)
  
  return NextResponse.json({ 
    success: true, 
    leaveRequest,
    message: 'Leave request submitted. Waiting for host approval.' 
  })
}

async function handleApproveLeave(gameId: string, hostPlayer: Player, playerId: string) {
  if (!playerId) {
    return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
  }
  
  // Get the leave request
  const { data: leaveRequest, error: requestError } = await supabase!
    .from('leave_requests')
    .select('*')
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .eq('status', 'pending')
    .single()
  
  if (requestError && requestError.code !== 'PGRST116') {
    console.error('Error fetching leave request:', requestError)
    return NextResponse.json({ error: 'Failed to fetch leave request' }, { status: 500 })
  }
  
  if (!leaveRequest) {
    // Leave request doesn't exist, but this is not an error - it may have already been processed
    return NextResponse.json({ 
      success: true, 
      gameEnded: false,
      message: 'Leave request was already processed' 
    })
  }
  
  // Update leave request status
  const { error: updateError } = await supabase!
    .from('leave_requests')
    .update({
      status: 'approved',
      processed_at: new Date().toISOString(),
      processed_by: hostPlayer.id
    })
    .eq('id', leaveRequest.id)
  
  if (updateError) {
    console.error('Error approving leave request:', updateError)
    return NextResponse.json({ error: 'Failed to approve leave request' }, { status: 500 })
  }
  
  // Remove the player from the game
  const { error: deleteError } = await supabase!
    .from('players')
    .delete()
    .eq('id', playerId)
  
  if (deleteError) {
    console.error('Error removing player:', deleteError)
    return NextResponse.json({ error: 'Failed to remove player' }, { status: 500 })
  }
  
  // Check if game should reset (less than 6 players)
  const { data: remainingPlayers, error: playersError } = await supabase!
    .from('players')
    .select('*')
    .eq('game_id', gameId)
  
  if (playersError) {
    console.error('Error checking remaining players:', playersError)
    return NextResponse.json({ error: 'Failed to check remaining players' }, { status: 500 })
  }
  
  // If less than 6 non-host players remain, reset game to lobby state
  const nonHostPlayers = remainingPlayers.filter(p => !p.is_host)
  if (nonHostPlayers.length < 6) {
    // Reset game to lobby phase and clear any game progress
    const { error: resetGameError } = await supabase!
      .from('games')
      .update({ 
        phase: 'lobby',
        day_count: 0,
        win_state: null
      })
      .eq('id', gameId)
    
    if (resetGameError) {
      console.error('Error resetting game to lobby after player left:', resetGameError)
      return NextResponse.json({ error: 'Failed to reset game' }, { status: 500 })
    }
    
    // Clear any round state and votes (but keep players)
    await supabase!
      .from('round_state')
      .delete()
      .eq('game_id', gameId)
    
    await supabase!
      .from('votes')
      .delete()
      .eq('game_id', gameId)
    
    // Clear any pending leave requests
    await supabase!
      .from('leave_requests')
      .delete()
      .eq('game_id', gameId)
    
    return NextResponse.json({ 
      success: true, 
      gameEnded: false,
      gameReset: true,
      message: 'Player removed and game reset to lobby due to insufficient players' 
    })
  }
  
  return NextResponse.json({ 
    success: true, 
    gameEnded: false,
    message: 'Player successfully removed from game' 
  })
}

async function handleDenyLeave(gameId: string, hostPlayer: Player, playerId: string) {
  if (!playerId) {
    return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
  }
  
  // Get the leave request
  const { data: leaveRequest, error: requestError } = await supabase!
    .from('leave_requests')
    .select('*')
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .eq('status', 'pending')
    .single()
  
  if (requestError && requestError.code !== 'PGRST116') {
    console.error('Error fetching leave request:', requestError)
    return NextResponse.json({ error: 'Failed to fetch leave request' }, { status: 500 })
  }
  
  if (!leaveRequest) {
    // Leave request doesn't exist, but this is not an error - it may have already been processed
    return NextResponse.json({ 
      success: true, 
      message: 'Leave request was already processed' 
    })
  }
  
  // Update leave request status to denied
  const { error: updateError } = await supabase!
    .from('leave_requests')
    .update({
      status: 'denied',
      processed_at: new Date().toISOString(),
      processed_by: hostPlayer.id
    })
    .eq('id', leaveRequest.id)
  
  if (updateError) {
    console.error('Error denying leave request:', updateError)
    return NextResponse.json({ error: 'Failed to deny leave request' }, { status: 500 })
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Leave request denied' 
  })
}

async function handleRemovePlayer(gameId: string, hostPlayer: Player, playerId: string) {
  if (!playerId) {
    return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
  }
  
  // Get the player to remove
  const { data: playerToRemove, error: playerError } = await supabase!
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single()
  
  if (playerError && playerError.code !== 'PGRST116') {
    console.error('Error fetching player to remove:', playerError)
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 })
  }
  
  if (!playerToRemove) {
    // Player doesn't exist, but this is not an error - they may have already been removed
    return NextResponse.json({ 
      success: true, 
      gameEnded: false,
      message: 'Player was already removed from the game' 
    })
  }
  
  // Prevent host from removing themselves
  if (playerToRemove.is_host) {
    return NextResponse.json({ error: 'Host cannot remove themselves. Use "End Game" instead.' }, { status: 400 })
  }
  
  // Remove any pending leave requests for this player (ignore missing)
  const { error: leaveDelErr } = await supabase!
    .from('leave_requests')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId)
  if (leaveDelErr && leaveDelErr.code !== 'PGRST116') {
    console.warn('Non-fatal: failed to delete leave request', leaveDelErr)
  }
  
  // Remove the player from the game
  const { error: deleteError } = await supabase!
    .from('players')
    .delete()
    .eq('id', playerId)

  if (deleteError) {
    console.error('Error removing player:', deleteError)
    return NextResponse.json({ error: 'Failed to remove player' }, { status: 500 })
  }
  
  console.log('🔧 Player removed successfully from database:', playerId)
  
  // Verify the player was actually removed
  const { data: verifyPlayer, error: verifyError } = await supabase!
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()
  
  if (verifyError && verifyError.code !== 'PGRST116') {
    console.error('Error verifying player removal:', verifyError)
  } else if (verifyPlayer) {
    console.error('🔧 ERROR: Player still exists after deletion:', verifyPlayer)
  } else {
    console.log('🔧 Player successfully verified as removed')
  }
  
  // Check if game should end (less than 6 players)
  const { data: remainingPlayers, error: playersError } = await supabase!
    .from('players')
    .select('*')
    .eq('game_id', gameId)
  
  if (playersError) {
    console.error('Error checking remaining players:', playersError)
    return NextResponse.json({ error: 'Failed to check remaining players' }, { status: 500 })
  }
  
  console.log('🔧 Remaining players after removal:', remainingPlayers?.length, remainingPlayers?.map(p => ({ id: p.id, name: p.name, is_host: p.is_host })))
  
  // If less than 6 non-host players remain, reset game to lobby state
  const nonHostPlayers = remainingPlayers.filter(p => !p.is_host)
  console.log('🔧 Non-host players count:', nonHostPlayers?.length)
  if (nonHostPlayers.length < 6) {
    console.log('🔧 Less than 6 players remaining, resetting game to lobby state')
    
    // Reset game to lobby phase and clear any game progress
    const { error: resetGameError } = await supabase!
      .from('games')
      .update({ 
        phase: 'lobby',
        day_count: 0,
        win_state: null
      })
      .eq('id', gameId)
    
    if (resetGameError) {
      console.error('Error resetting game to lobby after player removed:', resetGameError)
      return NextResponse.json({ error: 'Failed to reset game' }, { status: 500 })
    }
    
    console.log('🔧 Game reset to lobby state successfully')
    
    // Clear any round state and votes (but keep players)
    await supabase!
      .from('round_state')
      .delete()
      .eq('game_id', gameId)
    
    await supabase!
      .from('votes')
      .delete()
      .eq('game_id', gameId)
    
    // Clear any pending leave requests
    await supabase!
      .from('leave_requests')
      .delete()
      .eq('game_id', gameId)
    
    return NextResponse.json({ 
      success: true, 
      gameEnded: false,
      gameReset: true,
      message: 'Player removed and game reset to lobby due to insufficient players' 
    })
  }
  
  return NextResponse.json({ 
    success: true, 
    gameEnded: false,
    message: 'Player successfully removed from game' 
  })
}
