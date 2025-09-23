#!/usr/bin/env node

/**
 * Test Werwolf Action Screen Integration
 * Ensures Werwolf action screen appears when host clicks "Wake Up Werwolf"
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001'

async function testWerwolfActionScreen() {
  console.log('🐺 Testing Werwolf Action Screen Integration...')
  
  try {
    // Test 1: Create game with 6 non-host players
    console.log('📝 Test 1: Creating game with 6 non-host players...')
    
    const hostResponse = await fetch(`${BASE_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: 'Test Host',
        clientId: 'host-test-123'
      })
    })
    
    if (!hostResponse.ok) {
      throw new Error(`Failed to create game: ${hostResponse.status}`)
    }
    
    const gameData = await hostResponse.json()
    const gameId = gameData.game.id
    const hostClientId = gameData.player.client_id
    
    console.log('✅ Game created:', gameId)
    
    // Test 2: Add 6 non-host players
    console.log('📝 Test 2: Adding 6 non-host players...')
    
    const players = []
    for (let i = 1; i <= 6; i++) {
      const playerResponse = await fetch(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: gameData.game.code,
          playerName: `Player${i}`,
          clientId: `player-${i}-test-123`
        })
      })
      
      if (!playerResponse.ok) {
        throw new Error(`Failed to add player ${i}: ${playerResponse.status}`)
      }
      
      const playerData = await playerResponse.json()
      players.push(playerData.player)
      console.log(`✅ Player ${i} added:`, playerData.player.name)
    }
    
    // Test 3: Assign roles
    console.log('📝 Test 3: Assigning roles...')
    
    const assignRolesResponse = await fetch(`${BASE_URL}/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: hostClientId
      })
    })
    
    if (!assignRolesResponse.ok) {
      const error = await assignRolesResponse.text()
      throw new Error(`Failed to assign roles: ${assignRolesResponse.status} - ${error}`)
    }
    
    console.log('✅ Roles assigned successfully')
    
    // Test 4: Verify game is in night_wolf phase
    console.log('📝 Test 4: Verifying game is in night_wolf phase...')
    
    const gameStateResponse = await fetch(`${BASE_URL}/api/games?code=${gameData.game.code}`, {
      headers: { 'Cookie': `clientId=${hostClientId}` }
    })
    
    if (!gameStateResponse.ok) {
      throw new Error(`Failed to get game state: ${gameStateResponse.status}`)
    }
    
    const gameState = await gameStateResponse.json()
    
    if (gameState.game.phase !== 'night_wolf') {
      throw new Error(`❌ Game phase is ${gameState.game.phase}, expected night_wolf`)
    }
    
    console.log('✅ Game is in night_wolf phase')
    
    // Test 5: Find Werwolf player
    console.log('📝 Test 5: Finding Werwolf player...')
    
    const playersWithRoles = gameState.players.filter(p => !p.is_host)
    const werwolfPlayer = playersWithRoles.find(p => p.role === 'werewolf' || p.role === 'werwolf')
    
    if (!werwolfPlayer) {
      throw new Error('❌ CRITICAL: No Werwolf player found!')
    }
    
    console.log('✅ Werwolf player found:', werwolfPlayer.name, 'with role:', werwolfPlayer.role)
    
    // Test 6: Verify phase_started is false initially (or round state doesn't exist)
    console.log('📝 Test 6: Verifying phase_started is false initially...')
    
    if (gameState.roundState && gameState.roundState.phase_started !== false) {
      throw new Error(`❌ phase_started should be false initially, got: ${gameState.roundState?.phase_started}`)
    }
    
    console.log('✅ phase_started is false initially (or round state does not exist yet)')
    
    // Test 7: Host clicks "Wake Up Werwolf"
    console.log('📝 Test 7: Host clicks "Wake Up Werwolf"...')
    
    const wakeUpResponse = await fetch(`${BASE_URL}/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: hostClientId
      })
    })
    
    if (!wakeUpResponse.ok) {
      const error = await wakeUpResponse.text()
      throw new Error(`Failed to wake up werwolf: ${wakeUpResponse.status} - ${error}`)
    }
    
    const wakeUpData = await wakeUpResponse.json()
    console.log('✅ Wake up response:', wakeUpData)
    
    // Test 8: Verify phase_started is now true
    console.log('📝 Test 8: Verifying phase_started is now true...')
    
    const updatedGameStateResponse = await fetch(`${BASE_URL}/api/games?code=${gameData.game.code}`, {
      headers: { 'Cookie': `clientId=${hostClientId}` }
    })
    
    if (!updatedGameStateResponse.ok) {
      throw new Error(`Failed to get updated game state: ${updatedGameStateResponse.status}`)
    }
    
    const updatedGameState = await updatedGameStateResponse.json()
    
    if (updatedGameState.roundState?.phase_started !== true) {
      throw new Error(`❌ phase_started should be true after wake up, got: ${updatedGameState.roundState?.phase_started}`)
    }
    
    console.log('✅ phase_started is now true')
    
    // Test 9: Verify game phase is still night_wolf (not advanced)
    console.log('📝 Test 9: Verifying game phase is still night_wolf...')
    
    if (updatedGameState.game.phase !== 'night_wolf') {
      throw new Error(`❌ Game phase should still be night_wolf, got: ${updatedGameState.game.phase}`)
    }
    
    console.log('✅ Game phase is still night_wolf')
    
    // Test 10: Verify Werwolf player can now see their action screen
    console.log('📝 Test 10: Verifying Werwolf player can see their action screen...')
    
    const werwolfViewResponse = await fetch(`${BASE_URL}/api/games?code=${gameData.game.code}`, {
      headers: { 'Cookie': `clientId=${werwolfPlayer.client_id}` }
    })
    
    if (!werwolfViewResponse.ok) {
      throw new Error(`Failed to get Werwolf view: ${werwolfViewResponse.status}`)
    }
    
    const werwolfView = await werwolfViewResponse.json()
    
    // Check if the Werwolf player can act (phase_started should be true)
    if (werwolfView.roundState?.phase_started !== true) {
      throw new Error(`❌ Werwolf player should be able to act, phase_started: ${werwolfView.roundState?.phase_started}`)
    }
    
    console.log('✅ Werwolf player can now see their action screen')
    
    // Test 11: Werwolf selects a target
    console.log('📝 Test 11: Werwolf selects a target...')
    
    const targetPlayer = playersWithRoles.find(p => p.id !== werwolfPlayer.id)
    if (!targetPlayer) {
      throw new Error('❌ No target player found')
    }
    
    const selectTargetResponse = await fetch(`${BASE_URL}/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'wolf_select',
        targetId: targetPlayer.id,
        clientId: werwolfPlayer.client_id
      })
    })
    
    if (!selectTargetResponse.ok) {
      const error = await selectTargetResponse.text()
      throw new Error(`Failed to select target: ${selectTargetResponse.status} - ${error}`)
    }
    
    console.log('✅ Werwolf selected target:', targetPlayer.name)
    
    // Test 12: Host can now advance to next phase
    console.log('📝 Test 12: Host can now advance to next phase...')
    
    const advanceResponse = await fetch(`${BASE_URL}/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: hostClientId
      })
    })
    
    if (!advanceResponse.ok) {
      const error = await advanceResponse.text()
      throw new Error(`Failed to advance phase: ${advanceResponse.status} - ${error}`)
    }
    
    const advanceData = await advanceResponse.json()
    console.log('✅ Advance response:', advanceData)
    
    // Test 13: Verify game phase advanced to night_doctor
    console.log('📝 Test 13: Verifying game phase advanced to night_doctor...')
    
    const finalGameStateResponse = await fetch(`${BASE_URL}/api/games?code=${gameData.game.code}`, {
      headers: { 'Cookie': `clientId=${hostClientId}` }
    })
    
    if (!finalGameStateResponse.ok) {
      throw new Error(`Failed to get final game state: ${finalGameStateResponse.status}`)
    }
    
    const finalGameState = await finalGameStateResponse.json()
    
    if (finalGameState.game.phase !== 'night_doctor') {
      throw new Error(`❌ Game phase should be night_doctor, got: ${finalGameState.game.phase}`)
    }
    
    console.log('✅ Game phase advanced to night_doctor')
    
    console.log('🎉 All Werwolf action screen integration tests passed!')
    return true
    
  } catch (error) {
    console.error('❌ Werwolf action screen test failed:', error.message)
    return false
  }
}

// Run the test
if (require.main === module) {
  testWerwolfActionScreen().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { testWerwolfActionScreen }
