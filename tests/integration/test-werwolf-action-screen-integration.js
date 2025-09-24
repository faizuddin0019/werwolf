// Test: Werwolf Action Screen Integration
// Tests the complete flow from host clicking "Wake Up Werwolf" to Werwolf seeing action screen

import { createClient } from '@supabase/supabase-js'

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  timeout: 30000
}

if (!TEST_CONFIG.supabaseUrl || !TEST_CONFIG.supabaseKey) {
  console.log('⚠️ Skipping Werwolf Action Screen Integration Test - Missing Supabase environment variables')
  process.exit(0)
}

const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey)

async function testWerwolfActionScreenIntegration() {
  console.log('🧪 Testing Werwolf Action Screen Integration...')
  
  let gameId = null
  let hostClientId = null
  let werwolfClientId = null
  let werwolfPlayerId = null
  
  try {
    // Step 1: Create game as host
    console.log('🔧 Step 1: Creating game as host...')
    const hostResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: 'Test Host',
        clientId: 'host-test-werwolf-' + Date.now()
      })
    })
    
    if (!hostResponse.ok) {
      throw new Error(`Failed to create game: ${hostResponse.status}`)
    }
    
    const hostData = await hostResponse.json()
    gameId = hostData.game.id
    hostClientId = hostData.player.client_id
    console.log('✅ Game created:', gameId)
    
    // Step 2: Join as Werwolf player
    console.log('🔧 Step 2: Joining as Werwolf player...')
    const werwolfResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/games/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameId,
        playerName: 'Werwolf Player',
        clientId: 'werwolf-test-' + Date.now()
      })
    })
    
    if (!werwolfResponse.ok) {
      throw new Error(`Failed to join game: ${werwolfResponse.status}`)
    }
    
    const werwolfData = await werwolfResponse.json()
    werwolfClientId = werwolfData.player.client_id
    werwolfPlayerId = werwolfData.player.id
    console.log('✅ Werwolf player joined:', werwolfPlayerId)
    
    // Step 3: Add more players (need at least 4 for roles)
    console.log('🔧 Step 3: Adding more players...')
    const playerNames = ['Player1', 'Player2', 'Player3']
    for (const name of playerNames) {
      const response = await fetch(`${TEST_CONFIG.baseUrl}/api/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameId,
          playerName: name,
          clientId: `player-${name}-${Date.now()}`
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to add player ${name}: ${response.status}`)
      }
    }
    console.log('✅ Additional players added')
    
    // Step 4: Assign roles (make sure Werwolf gets werwolf role)
    console.log('🔧 Step 4: Assigning roles...')
    const assignResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: hostClientId
      })
    })
    
    if (!assignResponse.ok) {
      throw new Error(`Failed to assign roles: ${assignResponse.status}`)
    }
    
    const assignData = await assignResponse.json()
    console.log('✅ Roles assigned')
    
    // Step 5: Manually assign Werwolf role to our test player
    console.log('🔧 Step 5: Manually assigning Werwolf role...')
    const { error: roleError } = await supabase
      .from('players')
      .update({ role: 'werwolf' })
      .eq('id', werwolfPlayerId)
    
    if (roleError) {
      throw new Error(`Failed to assign werwolf role: ${roleError.message}`)
    }
    console.log('✅ Werwolf role assigned')
    
    // Step 6: Check initial state - Werwolf should NOT see action screen
    console.log('🔧 Step 6: Checking initial state...')
    const initialGameResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/games?code=${hostData.gameId}`)
    const initialGameData = await initialGameResponse.json()
    
    if (initialGameData.game.phase !== 'night_wolf') {
      throw new Error(`Expected phase 'night_wolf', got '${initialGameData.game.phase}'`)
    }
    
    if (initialGameData.roundState && initialGameData.roundState.phase_started === true) {
      throw new Error('Phase should not be started initially')
    }
    console.log('✅ Initial state correct - phase not started')
    
    // Step 7: Host clicks "Wake Up Werwolf"
    console.log('🔧 Step 7: Host clicking "Wake Up Werwolf"...')
    const wakeUpResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: hostClientId
      })
    })
    
    if (!wakeUpResponse.ok) {
      throw new Error(`Failed to wake up werwolf: ${wakeUpResponse.status}`)
    }
    
    const wakeUpData = await wakeUpResponse.json()
    console.log('✅ Host clicked "Wake Up Werwolf"')
    
    // Step 8: Check that phase_started is now true
    console.log('🔧 Step 8: Verifying phase_started is true...')
    const afterWakeUpResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/games?code=${hostData.gameId}`)
    const afterWakeUpData = await afterWakeUpResponse.json()
    
    if (!afterWakeUpData.roundState || afterWakeUpData.roundState.phase_started !== true) {
      throw new Error('Phase should be started after host action')
    }
    console.log('✅ Phase started successfully')
    
    // Step 9: Test that Werwolf can now act
    console.log('🔧 Step 9: Testing Werwolf action capability...')
    
    // Simulate the frontend logic
    const werwolfPlayer = afterWakeUpData.players.find(p => p.id === werwolfPlayerId)
    if (!werwolfPlayer) {
      throw new Error('Werwolf player not found')
    }
    
    if (werwolfPlayer.role !== 'werwolf' && werwolfPlayer.role !== 'werewolf') {
      throw new Error(`Werwolf player has wrong role: ${werwolfPlayer.role}`)
    }
    
    if (!werwolfPlayer.alive) {
      throw new Error('Werwolf player is not alive')
    }
    
    // Check if phase is night_wolf
    if (afterWakeUpData.game.phase !== 'night_wolf') {
      throw new Error(`Expected phase 'night_wolf', got '${afterWakeUpData.game.phase}'`)
    }
    
    // Check if phase_started is true
    if (!afterWakeUpData.roundState.phase_started) {
      throw new Error('Phase should be started')
    }
    
    console.log('✅ Werwolf should now be able to see action screen')
    
    // Step 10: Test Werwolf action (eliminate a player)
    console.log('🔧 Step 10: Testing Werwolf elimination action...')
    const targetPlayer = afterWakeUpData.players.find(p => p.id !== werwolfPlayerId && p.alive && !p.is_host)
    if (!targetPlayer) {
      throw new Error('No target player found for elimination')
    }
    
    const eliminateResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'wolf_select',
        clientId: werwolfClientId,
        data: { targetId: targetPlayer.id }
      })
    })
    
    if (!eliminateResponse.ok) {
      throw new Error(`Failed to eliminate player: ${eliminateResponse.status}`)
    }
    
    const eliminateData = await eliminateResponse.json()
    console.log('✅ Werwolf successfully eliminated player')
    
    console.log('🎉 Werwolf Action Screen Integration Test PASSED!')
    return true
    
  } catch (error) {
    console.error('❌ Werwolf Action Screen Integration Test FAILED:', error.message)
    return false
  } finally {
    // Cleanup
    if (gameId) {
      try {
        await supabase.from('games').delete().eq('id', gameId)
        console.log('🧹 Cleaned up test game')
      } catch (cleanupError) {
        console.error('⚠️ Cleanup error:', cleanupError.message)
      }
    }
  }
}

// Run the test
testWerwolfActionScreenIntegration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test execution error:', error)
    process.exit(1)
  })
