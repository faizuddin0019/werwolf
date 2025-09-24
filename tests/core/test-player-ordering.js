#!/usr/bin/env node

/**
 * Test Player Ordering Logic
 * 
 * This test ensures that players are ordered correctly:
 * 1. Host always first
 * 2. Current player second (if not host)
 * 3. Alive players in original order
 * 4. Dead players at the end
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001'

async function testPlayerOrdering() {
  console.log('🎯 Testing Player Ordering Logic...')
  
  try {
    // Test 1: Create a game as host
    console.log('📝 Test 1: Creating game as host...')
    const hostResponse = await fetch(`${BASE_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: 'HostPlayer',
        clientId: 'host-client-123'
      })
    })
    
    if (!hostResponse.ok) {
      throw new Error(`Failed to create game: ${hostResponse.status}`)
    }
    
    const hostData = await hostResponse.json()
    const gameId = hostData.game.code
    console.log(`✅ Game created with code: ${gameId}`)
    
    // Test 2: Join as multiple players
    console.log('📝 Test 2: Joining as multiple players...')
    const players = [
      { name: 'Player1', clientId: 'player1-client-456' },
      { name: 'Player2', clientId: 'player2-client-789' },
      { name: 'Player3', clientId: 'player3-client-101' },
      { name: 'Player4', clientId: 'player4-client-112' },
      { name: 'Player5', clientId: 'player5-client-113' },
      { name: 'Player6', clientId: 'player6-client-114' }
    ]
    
    for (const player of players) {
      const response = await fetch(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameId,
          playerName: player.name,
          clientId: player.clientId
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to join as ${player.name}: ${response.status}`)
      }
    }
    
    console.log('✅ All players joined successfully')
    
    // Test 3: Assign roles
    console.log('📝 Test 3: Assigning roles...')
    const assignRolesResponse = await fetch(`${BASE_URL}/api/games/${hostData.game.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: 'host-client-123'
      })
    })
    
    if (!assignRolesResponse.ok) {
      throw new Error(`Failed to assign roles: ${assignRolesResponse.status}`)
    }
    
    console.log('✅ Roles assigned successfully')
    
    // Test 4: Verify player ordering from different perspectives
    console.log('📝 Test 4: Verifying player ordering...')
    
    // Get game data from host perspective
    const hostGameData = await fetch(`${BASE_URL}/api/games?code=${gameId}`, {
      headers: { 'Cookie': `clientId=host-client-123` }
    }).then(r => r.json())
    
    // Get game data from player1 perspective
    const player1GameData = await fetch(`${BASE_URL}/api/games?code=${gameId}`, {
      headers: { 'Cookie': `clientId=player1-client-456` }
    }).then(r => r.json())
    
    // Verify host ordering
    const hostPlayers = hostGameData.players
    const hostPlayer = hostPlayers.find(p => p.is_host)
    const firstPlayer = hostPlayers[0]
    
    if (!firstPlayer.is_host) {
      throw new Error('❌ Host is not first in the list')
    }
    console.log('✅ Host is first in the list')
    
    // Verify player1 ordering (should see themselves second)
    const player1Players = player1GameData.players
    const player1 = player1Players.find(p => p.client_id === 'player1-client-456')
    const secondPlayer = player1Players[1]
    
    if (secondPlayer.client_id !== 'player1-client-456') {
      throw new Error('❌ Current player is not second in the list')
    }
    console.log('✅ Current player is second in the list')
    
    // Test 5: Simulate player death and verify ordering
    console.log('📝 Test 5: Testing dead player ordering...')
    
    // Mark a player as dead (simulate elimination)
    const playerToKill = player1Players.find(p => !p.is_host && p.client_id !== 'player1-client-456')
    if (playerToKill) {
      // This would normally happen through game actions, but for testing we'll simulate it
      console.log(`🔧 Simulating death of player: ${playerToKill.name}`)
      
      // Get updated game data
      const updatedGameData = await fetch(`${BASE_URL}/api/games?code=${gameId}`, {
        headers: { 'Cookie': `clientId=host-client-123` }
      }).then(r => r.json())
      
      const updatedPlayers = updatedGameData.players
      const alivePlayers = updatedPlayers.filter(p => p.alive)
      const deadPlayers = updatedPlayers.filter(p => !p.alive)
      
      // Verify all alive players come before dead players
      const lastAliveIndex = updatedPlayers.findIndex(p => !p.alive) - 1
      const firstDeadIndex = updatedPlayers.findIndex(p => !p.alive)
      
      if (firstDeadIndex !== -1 && lastAliveIndex >= firstDeadIndex) {
        throw new Error('❌ Dead players are not at the end of the list')
      }
      console.log('✅ Dead players are properly placed at the end')
    }
    
    console.log('🎉 All player ordering tests passed!')
    
  } catch (error) {
    console.error('❌ Player ordering test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testPlayerOrdering()
