import { NextRequest, NextResponse } from 'next/server'
import { supabase, Game, Player, RoundState, LeaveRequest, isSupabaseConfigured } from '@/lib/supabase'
import { assignRoles, getNextPhase, checkWinCondition } from '@/lib/game-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
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
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()
    
    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    // Get current player
    const { data: currentPlayer, error: playerError } = await supabase
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
        return await handleEndGame(gameId, game)
      
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
        return await handleBeginVoting(gameId, game)
      
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
  if (game.phase !== 'lobby') {
    return NextResponse.json({ error: 'Roles can only be assigned in lobby' }, { status: 400 })
  }
  
  // Get all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
  
  if (playersError || !players) {
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
  
  // Check if we have enough non-host players (need 6 non-host players + 1 host = 7 total)
  const nonHostPlayers = players.filter(p => !p.is_host)
  if (nonHostPlayers.length < 6) {
    return NextResponse.json({ error: 'Need at least 6 non-host players to start' }, { status: 400 })
  }
  
  // Assign roles (excluding host)
  let playersWithRoles: Player[]
  try {
    playersWithRoles = assignRoles(players)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to assign roles' }, { status: 400 })
  }
  
  // Update players with roles
  for (const player of playersWithRoles) {
    await supabase
      .from('players')
      .update({ role: player.role })
      .eq('id', player.id)
  }
  
  // Create initial round state
  await supabase
    .from('round_state')
    .insert({
      game_id: gameId,
      phase: 'night_wolf',
      day_count: 1
    })
  
  // Update game phase
  await supabase
    .from('games')
    .update({ phase: 'night_wolf' })
    .eq('id', gameId)
  
  return NextResponse.json({ success: true })
}

async function handleNextPhase(gameId: string, game: Game, targetPhase?: string) {
  const nextPhase = targetPhase || getNextPhase(game.phase)
  
  await supabase
    .from('games')
    .update({ phase: nextPhase })
    .eq('id', gameId)
  
  return NextResponse.json({ success: true, phase: nextPhase })
}

async function handleWolfSelect(gameId: string, player: Player, targetId: string) {
  if (player.role !== 'werewolf') {
    return NextResponse.json({ error: 'Only werewolves can select targets' }, { status: 403 })
  }
  
  await supabase
    .from('round_state')
    .update({ wolf_target_player_id: targetId })
    .eq('game_id', gameId)
  
  // Don't automatically advance phase - let host control it
  return NextResponse.json({ success: true })
}

async function handlePoliceInspect(gameId: string, player: Player, targetId: string) {
  if (player.role !== 'police') {
    return NextResponse.json({ error: 'Only police can inspect players' }, { status: 403 })
  }
  
  // Get target player
  const { data: targetPlayer } = await supabase
    .from('players')
    .select('role')
    .eq('id', targetId)
    .single()
  
  const result = targetPlayer?.role === 'werewolf' ? 'werewolf' : 'not_werewolf'
  
  await supabase
    .from('round_state')
    .update({ 
      police_inspect_player_id: targetId,
      police_inspect_result: result
    })
    .eq('game_id', gameId)
  
  // Don't automatically advance phase - let host control it
  return NextResponse.json({ success: true, result })
}

async function handleDoctorSave(gameId: string, player: Player, targetId: string) {
  if (player.role !== 'doctor') {
    return NextResponse.json({ error: 'Only doctors can save players' }, { status: 403 })
  }
  
  await supabase
    .from('round_state')
    .update({ doctor_save_player_id: targetId })
    .eq('game_id', gameId)
  
  // Don't automatically advance phase - let host control it
  return NextResponse.json({ success: true })
}

async function handleRevealDead(gameId: string, game: Game) {
  try {
    console.log('🔧 handleRevealDead called for game:', gameId)
    
    // Get round state
    const { data: roundState, error: roundStateError } = await supabase
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
    
    // Check if doctor saved the werwolf target
    let deadPlayerId = null
    if (roundState.wolf_target_player_id && 
        roundState.doctor_save_player_id !== roundState.wolf_target_player_id) {
      deadPlayerId = roundState.wolf_target_player_id
    }
    
    console.log('🔧 Dead player determined:', deadPlayerId)
    
    // Update round state with resolved death
    const { error: updateRoundStateError } = await supabase
      .from('round_state')
      .update({ resolved_death_player_id: deadPlayerId })
      .eq('game_id', gameId)
    
    if (updateRoundStateError) {
      console.error('Error updating round state:', updateRoundStateError)
      return NextResponse.json({ error: `Failed to update round state: ${updateRoundStateError.message}` }, { status: 500 })
    }
    
    // Mark player as dead if they died
    if (deadPlayerId) {
      const { error: updatePlayerError } = await supabase
        .from('players')
        .update({ alive: false })
        .eq('id', deadPlayerId)
      
      if (updatePlayerError) {
        console.error('Error updating player alive status:', updatePlayerError)
        return NextResponse.json({ error: `Failed to update player status: ${updatePlayerError.message}` }, { status: 500 })
      }
    }
    
    // Advance to day_vote phase after revealing dead
    const { error: updateGameError } = await supabase
      .from('games')
      .update({ phase: 'day_vote' })
      .eq('id', gameId)
    
    if (updateGameError) {
      console.error('Error updating game phase:', updateGameError)
      return NextResponse.json({ error: `Failed to update game phase: ${updateGameError.message}` }, { status: 500 })
    }
    
    console.log('🔧 Reveal dead completed successfully')
    return NextResponse.json({ success: true, deadPlayerId })
    
  } catch (error) {
    console.error('Unexpected error in handleRevealDead:', error)
    return NextResponse.json({ error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}

async function handleBeginVoting(gameId: string, game: Game) {
  console.log('🔧 handleBeginVoting called for game:', gameId)
  
  // Update game phase to day_vote
  const { error: updateError } = await supabase
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
  
  if (!['day_vote', 'day_final_vote'].includes(phase)) {
    return NextResponse.json({ error: 'Voting is only allowed during day phases' }, { status: 400 })
  }
  
  // Upsert vote (replace existing vote for this player/round/phase)
  await supabase
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
  await supabase
    .from('votes')
    .delete()
    .eq('game_id', gameId)
    .eq('voter_player_id', player.id)
    .eq('round', round)
    .eq('phase', phase)
  
  return NextResponse.json({ success: true })
}

async function handleFinalVote(gameId: string, game: Game) {
  // Clear all votes for current round/phase
  await supabase
    .from('votes')
    .delete()
    .eq('game_id', gameId)
    .eq('round', game.day_count)
    .eq('phase', 'day_vote')
  
  // Move to final vote phase
  await supabase
    .from('games')
    .update({ phase: 'day_final_vote' })
    .eq('id', gameId)
  
  return NextResponse.json({ success: true })
}

async function handleEliminatePlayer(gameId: string, game: Game) {
  // Get vote counts for final vote
  const { data: votes } = await supabase
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
  await supabase
    .from('players')
    .update({ alive: false })
    .eq('id', eliminatedPlayerId)
  
  // Get eliminated player to check if they were a werwolf
  const { data: eliminatedPlayer } = await supabase
    .from('players')
    .select('role')
    .eq('id', eliminatedPlayerId)
    .single()
  
  // Check win condition
  const { data: allPlayers } = await supabase
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
  
  await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId)
  
  return NextResponse.json({ 
    success: true, 
    eliminatedPlayerId,
    wasWerewolf: eliminatedPlayer?.role === 'werewolf',
    winState
  })
}

async function handleEndGame(gameId: string, game: Game) {
  console.log('🔧 handleEndGame called - this should only happen when host clicks End Game button')
  
  // Update game phase to ended
  const { error: updateError } = await supabase
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
  const { data: playerToChange, error: playerError } = await supabase
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
  const validRoles = ['villager', 'werewolf', 'doctor', 'police']
  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  
  // Update player role
  const { error: updateError } = await supabase
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
  const { error: deleteError } = await supabase
    .from('players')
    .delete()
    .eq('id', currentPlayer.id)
  
  if (deleteError) {
    console.error('Error removing player:', deleteError)
    return NextResponse.json({ error: 'Failed to leave game' }, { status: 500 })
  }
  
  // Check remaining player count
  const { data: remainingPlayers, error: playersError } = await supabase
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
    const { error: resetGameError } = await supabase
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
    await supabase
      .from('round_state')
      .delete()
      .eq('game_id', gameId)
    
    await supabase
      .from('votes')
      .delete()
      .eq('game_id', gameId)
    
    // Clear any pending leave requests
    await supabase
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
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .eq('game_id', gameId)
    
    if (playersError) {
      console.error('Error deleting players:', playersError)
    }
    
    // Delete all round states from the game
    const { error: roundsError } = await supabase
      .from('round_state')
      .delete()
      .eq('game_id', gameId)
    
    if (roundsError) {
      console.error('Error deleting round states:', roundsError)
    }
    
    // Delete all votes from the game
    const { error: votesError } = await supabase
      .from('votes')
      .delete()
      .eq('game_id', gameId)
    
    if (votesError) {
      console.error('Error deleting votes:', votesError)
    }
    
    // Delete all leave requests from the game
    const { error: leaveRequestsError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('game_id', gameId)
    
    if (leaveRequestsError) {
      console.error('Error deleting leave requests:', leaveRequestsError)
    }
    
    // Finally, delete the game itself
    const { error: gameError } = await supabase
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
  const { data: existingRequest } = await supabase
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
  const { data: leaveRequest, error: createError } = await supabase
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
  const { data: leaveRequest, error: requestError } = await supabase
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
  const { error: updateError } = await supabase
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
  const { error: deleteError } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId)
  
  if (deleteError) {
    console.error('Error removing player:', deleteError)
    return NextResponse.json({ error: 'Failed to remove player' }, { status: 500 })
  }
  
  // Check if game should reset (less than 6 players)
  const { data: remainingPlayers, error: playersError } = await supabase
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
    const { error: resetGameError } = await supabase
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
    await supabase
      .from('round_state')
      .delete()
      .eq('game_id', gameId)
    
    await supabase
      .from('votes')
      .delete()
      .eq('game_id', gameId)
    
    // Clear any pending leave requests
    await supabase
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
  const { data: leaveRequest, error: requestError } = await supabase
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
  const { error: updateError } = await supabase
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
  const { data: playerToRemove, error: playerError } = await supabase
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
  
  // Remove any pending leave requests for this player
  await supabase
    .from('leave_requests')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId)
  
  // Remove the player from the game
  const { error: deleteError } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId)

  if (deleteError) {
    console.error('Error removing player:', deleteError)
    return NextResponse.json({ error: 'Failed to remove player' }, { status: 500 })
  }
  
  console.log('🔧 Player removed successfully from database:', playerId)
  
  // Verify the player was actually removed
  const { data: verifyPlayer, error: verifyError } = await supabase
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
  const { data: remainingPlayers, error: playersError } = await supabase
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
    const { error: resetGameError } = await supabase
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
    await supabase
      .from('round_state')
      .delete()
      .eq('game_id', gameId)
    
    await supabase
      .from('votes')
      .delete()
      .eq('game_id', gameId)
    
    // Clear any pending leave requests
    await supabase
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
