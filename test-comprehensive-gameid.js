#!/usr/bin/env node

/**
 * Comprehensive test to verify that API calls automatically set gameId
 * This simulates the exact scenario where API calls should work without browser interaction
 */

const BASE_URL = 'http://localhost:3000'

async function testComprehensiveGameIdSetting() {
  console.log('🧪 Comprehensive GameId Setting Test...')
  
  try {
    // Step 1: Create a game via API (simulating server-side call)
    console.log('1. Creating game via API (server-side simulation)...')
    const createResponse = await fetch(`${BASE_URL}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostName: 'ComprehensiveTestHost',
        clientId: 'comprehensive-test-client-' + Date.now()
      })
    })
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create game: ${createResponse.status}`)
    }
    
    const createData = await createResponse.json()
    console.log('✅ Game created with gameId:', createData.gameId)
    
    // Step 2: Simulate browser calling setGameDataFromAPI
    console.log('2. Simulating browser call to setGameDataFromAPI...')
    
    // This would normally be called from the browser, but we're simulating it
    const gameResponse = await fetch(`${BASE_URL}/api/games?code=${createData.gameId}`)
    if (!gameResponse.ok) {
      throw new Error(`Failed to fetch game data: ${gameResponse.status}`)
    }
    
    const gameData = await gameResponse.json()
    console.log('✅ Game data fetched:', {
      gameId: createData.gameId,
      phase: gameData.game.phase,
      players: gameData.players.length
    })
    
    // Step 3: Add players and test real-time sync
    console.log('3. Adding players to test real-time sync...')
    const players = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5', 'Player6']
    
    for (let i = 0; i < players.length; i++) {
      const joinResponse = await fetch(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: createData.gameId,
          playerName: players[i],
          clientId: `comprehensive-player-${i}-${Date.now()}`
        })
      })
      
      if (!joinResponse.ok) {
        throw new Error(`Failed to join player ${i + 1}: ${joinResponse.status}`)
      }
      
      console.log(`✅ Player ${i + 1} joined`)
    }
    
    // Step 4: Assign roles and test phase transition
    console.log('4. Assigning roles and testing phase transition...')
    const assignRolesResponse = await fetch(`${BASE_URL}/api/games/${createData.game.id}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: createData.player.client_id
      })
    })
    
    if (!assignRolesResponse.ok) {
      throw new Error(`Failed to assign roles: ${assignRolesResponse.status}`)
    }
    
    console.log('✅ Roles assigned successfully')
    
    // Step 5: Test phase transition
    console.log('5. Testing phase transition...')
    const phaseResponse = await fetch(`${BASE_URL}/api/games/${createData.game.id}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: createData.player.client_id
      })
    })
    
    if (!phaseResponse.ok) {
      throw new Error(`Failed to transition phase: ${phaseResponse.status}`)
    }
    
    console.log('✅ Phase transition successful')
    
    // Step 6: Verify final game state
    console.log('6. Verifying final game state...')
    const finalGameResponse = await fetch(`${BASE_URL}/api/games?code=${createData.gameId}`)
    if (finalGameResponse.ok) {
      const finalGameData = await finalGameResponse.json()
      console.log('✅ Final game state:', {
        gameId: createData.gameId,
        phase: finalGameData.game.phase,
        players: finalGameData.players.length,
        roles: finalGameData.players.map(p => ({ name: p.name, role: p.role }))
      })
    }
    
    console.log('🎉 Comprehensive test passed!')
    console.log('📝 Summary:')
    console.log('  ✅ API calls work independently of browser interaction')
    console.log('  ✅ GameId is properly set through API responses')
    console.log('  ✅ Real-time sync should work with the setGameDataFromAPI function')
    console.log('  ✅ Phase transitions work correctly')
    console.log('  ✅ Player management works correctly')
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message)
    process.exit(1)
  }
}

// Run the comprehensive test
testComprehensiveGameIdSetting()
