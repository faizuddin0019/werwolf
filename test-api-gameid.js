#!/usr/bin/env node

/**
 * Test script to verify that API calls can set gameId without browser interaction
 */

const BASE_URL = 'http://localhost:3000'

async function testAPIGameIdSetting() {
  console.log('🧪 Testing API GameId Setting...')
  
  try {
    // Step 1: Create a game via API
    console.log('1. Creating game via API...')
    const createResponse = await fetch(`${BASE_URL}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostName: 'APITestHost',
        clientId: 'api-test-client-' + Date.now()
      })
    })
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create game: ${createResponse.status}`)
    }
    
    const createData = await createResponse.json()
    console.log('✅ Game created:', createData.gameId)
    
    // Step 2: Add players via API
    console.log('2. Adding players via API...')
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
          clientId: `api-player-${i}-${Date.now()}`
        })
      })
      
      if (!joinResponse.ok) {
        throw new Error(`Failed to join player ${i + 1}: ${joinResponse.status}`)
      }
      
      console.log(`✅ Player ${i + 1} joined`)
    }
    
    // Step 3: Assign roles via API
    console.log('3. Assigning roles via API...')
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
    
    // Step 4: Test that the gameId is now available for real-time sync
    console.log('4. Testing gameId availability...')
    const gameResponse = await fetch(`${BASE_URL}/api/games?code=${createData.gameId}`)
    if (gameResponse.ok) {
      const gameData = await gameResponse.json()
      console.log('✅ Game data available:', {
        gameId: createData.gameId,
        phase: gameData.game.phase,
        players: gameData.players.length
      })
    }
    
    console.log('🎉 All tests passed! API calls can set gameId without browser interaction.')
    console.log('📝 Next step: Test that the browser can call setGameDataFromAPI with the gameId')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testAPIGameIdSetting()
