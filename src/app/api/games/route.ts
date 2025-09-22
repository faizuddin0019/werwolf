import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { generateGameCode, sortPlayers } from '@/lib/game-utils'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 API: Game creation request received')
    
    if (!isSupabaseConfigured() || !supabase) {
      console.error('❌ API: Supabase not configured')
      return NextResponse.json({ 
        error: 'Supabase not configured. Please set up your environment variables.' 
      }, { status: 503 })
    }
    
    console.log('✅ API: Supabase is configured')

    const body = await request.json()
    console.log('🔧 API: Request body:', body)
    
    const { hostName, clientId } = body
    
    if (!hostName || !clientId) {
      console.error('❌ API: Missing required fields:', { hostName, clientId })
      return NextResponse.json({ error: 'Host name and client ID are required' }, { status: 400 })
    }
    
    console.log('✅ API: Request validation passed')
    
    // Generate unique game code
    let gameCode: string
    let attempts = 0
    const maxAttempts = 5
    
    do {
      gameCode = generateGameCode()
      attempts++
      
      // Check if code already exists today
      const { data: existingGame } = await supabase
        .from('games')
        .select('id')
        .eq('code', gameCode)
        .gte('created_at', new Date().toISOString().split('T')[0])
        .single()
      
      if (!existingGame) break
      
      if (attempts >= maxAttempts) {
        return NextResponse.json({ error: 'Failed to generate unique game code' }, { status: 500 })
      }
    } while (true)
    
    // Create game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        code: gameCode,
        host_client_id: clientId,
        phase: 'lobby'
      })
      .select()
      .single()
    
    if (gameError) {
      console.error('Error creating game:', gameError)
      return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
    }
    
    // Create host player
    const { data: hostPlayer, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        client_id: clientId,
        name: hostName,
        is_host: true
      })
      .select()
      .single()
    
    if (playerError) {
      console.error('Error creating host player:', playerError)
      return NextResponse.json({ error: 'Failed to create host player' }, { status: 500 })
    }
    
    // Create round state
    const { error: roundStateError } = await supabase
      .from('round_state')
      .insert({
        game_id: game.id
      })
    
    if (roundStateError) {
      console.error('Error creating round state:', roundStateError)
      return NextResponse.json({ error: 'Failed to create round state' }, { status: 500 })
    }
    
    return NextResponse.json({
      game,
      player: hostPlayer,
      gameCode
    })
    
  } catch (error) {
    console.error('Error in POST /api/games:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ 
        error: 'Supabase not configured. Please set up your environment variables.' 
      }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code) {
      return NextResponse.json({ error: 'Game code is required' }, { status: 400 })
    }
    
    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code)
      .single()
    
    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    // Get players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', game.id)
      .order('id')
    
    if (playersError) {
      console.error('Error fetching players:', playersError)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    // Get current player from cookie to implement role visibility security
    const clientId = request.cookies.get('clientId')?.value
    const currentPlayer = players?.find(p => p.client_id === clientId)
    const isHost = currentPlayer?.is_host || false

    // Filter roles based on security rules:
    // - Host can see all roles
    // - Players can only see their own role
    // - Other players' roles are hidden (set to null)
    const filteredPlayers = players?.map(player => {
      if (isHost) {
        // Host can see all roles
        return player
      } else if (player.client_id === clientId) {
        // Player can see their own role
        return player
      } else {
        // Hide other players' roles
        return {
          ...player,
          role: undefined
        }
      }
    }) || []
    
    // Get round state
    const { data: roundState, error: roundStateError } = await supabase
      .from('round_state')
      .select('*')
      .eq('game_id', game.id)
      .single()
    
    // Ignore "no rows" error for round state - it's normal when game is in lobby
    if (roundStateError && roundStateError.code !== 'PGRST116') {
      console.error('Error fetching round state:', roundStateError)
      return NextResponse.json({ error: 'Failed to fetch round state' }, { status: 500 })
    }
    
    // Get votes
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .eq('game_id', game.id)
      .eq('round', game.day_count)
    
    // Ignore errors for votes - it's normal when game is in lobby
    if (votesError) {
      console.error('Error fetching votes:', votesError)
    }
    
    // Get leave requests
    const { data: leaveRequests, error: leaveRequestsError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('game_id', game.id)
    
    // Ignore errors for leave requests
    if (leaveRequestsError) {
      console.error('Error fetching leave requests:', leaveRequestsError)
    }
    
    // Sort players based on current player's perspective
    const sortedPlayers = sortPlayers(filteredPlayers, currentPlayer?.id)
    
    return NextResponse.json({
      game,
      players: sortedPlayers,
      roundState,
      votes: votes || [],
      leaveRequests: leaveRequests || []
    })
    
  } catch (error) {
    console.error('Error in GET /api/games:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
