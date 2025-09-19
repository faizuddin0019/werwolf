import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ 
        error: 'Supabase not configured. Please set up your environment variables.' 
      }, { status: 503 })
    }

    const { gameCode, playerName, clientId } = await request.json()
    
    if (!gameCode || !playerName || !clientId) {
      return NextResponse.json({ error: 'Game code, player name, and client ID are required' }, { status: 400 })
    }
    
    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('code', gameCode)
      .single()
    
    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    // Check if game is in lobby phase
    if (game.phase !== 'lobby') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 })
    }
    
    // Check player count limits
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', game.id)
    
    if (playersError) {
      console.error('Error checking player count:', playersError)
      return NextResponse.json({ error: 'Failed to check player count' }, { status: 500 })
    }
    
    const playerCount = players?.length || 0
    if (playerCount >= 20) {
      return NextResponse.json({ error: 'Game is full (max 20 players)' }, { status: 400 })
    }
    
    // Check if client already exists in this game
    // Note: clientId is browser-specific, so this prevents the same browser from joining twice
    const { data: existingPlayer, error: existingError } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', game.id)
      .eq('client_id', clientId)
      .single()
    
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing player:', existingError)
      return NextResponse.json({ error: 'Failed to check existing player' }, { status: 500 })
    }
    
    if (existingPlayer) {
      return NextResponse.json({ error: 'You are already in this game from this browser' }, { status: 400 })
    }
    
    // Create player
    const { data: newPlayer, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        client_id: clientId,
        name: playerName,
        is_host: false
      })
      .select()
      .single()
    
    if (playerError) {
      console.error('Error creating player:', playerError)
      return NextResponse.json({ error: 'Failed to join game' }, { status: 500 })
    }
    
    // Get all players in the game to return complete list
    const { data: allPlayers, error: allPlayersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', game.id)
      .order('id')
    
    if (allPlayersError) {
      console.error('Error fetching all players:', allPlayersError)
      // Still return success with just the new player if we can't fetch all
      return NextResponse.json({
        game,
        player: newPlayer,
        players: [newPlayer]
      })
    }
    
    return NextResponse.json({
      game,
      player: newPlayer,
      players: allPlayers
    })
    
  } catch (error) {
    console.error('Error in POST /api/games/join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
