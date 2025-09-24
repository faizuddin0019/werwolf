#!/usr/bin/env node

/**
 * Test Role Visibility Security
 * 
 * This test ensures that player roles are only visible to:
 * 1. The host (can see all roles)
 * 2. The player themselves (can see their own role)
 * 3. Other players should only see "Villager" for non-host players
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001'

async function testRoleVisibility() {
  console.log('🔒 Testing Role Visibility Security...')
  
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
    
    // Test 2: Join as player 1 (will be assigned werewolf)
    console.log('📝 Test 2: Joining as player 1...')
    const player1Response = await fetch(`${BASE_URL}/api/games/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameId,
        playerName: 'WerewolfPlayer',
        clientId: 'player1-client-456'
      })
    })
    
    if (!player1Response.ok) {
      throw new Error(`Failed to join as player 1: ${player1Response.status}`)
    }
    
    // Test 3: Join as player 2 (will be assigned doctor)
    console.log('📝 Test 3: Joining as player 2...')
    const player2Response = await fetch(`${BASE_URL}/api/games/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameId,
        playerName: 'DoctorPlayer',
        clientId: 'player2-client-789'
      })
    })
    
    if (!player2Response.ok) {
      throw new Error(`Failed to join as player 2: ${player2Response.status}`)
    }
    
    // Test 4: Join as player 3 (will be assigned police)
    console.log('📝 Test 4: Joining as player 3...')
    const player3Response = await fetch(`${BASE_URL}/api/games/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameId,
        playerName: 'PolicePlayer',
        clientId: 'player3-client-101'
      })
    })
    
    if (!player3Response.ok) {
      throw new Error(`Failed to join as player 3: ${player3Response.status}`)
    }
    
    // Test 5: Join as player 4 (will be assigned villager)
    console.log('📝 Test 5: Joining as player 4...')
    const player4Response = await fetch(`${BASE_URL}/api/games/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameId,
        playerName: 'VillagerPlayer1',
        clientId: 'player4-client-112'
      })
    })
    
    if (!player4Response.ok) {
      throw new Error(`Failed to join as player 4: ${player4Response.status}`)
    }
    
    // Test 6: Join as player 5 (will be assigned villager)
    console.log('📝 Test 6: Joining as player 5...')
    const player5Response = await fetch(`${BASE_URL}/api/games/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameId,
        playerName: 'VillagerPlayer2',
        clientId: 'player5-client-113'
      })
    })
    
    if (!player5Response.ok) {
      throw new Error(`Failed to join as player 5: ${player5Response.status}`)
    }
    
    // Test 7: Join as player 6 (will be assigned villager)
    console.log('📝 Test 7: Joining as player 6...')
    const player6Response = await fetch(`${BASE_URL}/api/games/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: gameId,
        playerName: 'VillagerPlayer3',
        clientId: 'player6-client-114'
      })
    })
    
    if (!player6Response.ok) {
      throw new Error(`Failed to join as player 6: ${player6Response.status}`)
    }
    
    // Test 8: Assign roles as host
    console.log('📝 Test 8: Assigning roles as host...')
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
    
    // Test 9: Verify role visibility security
    console.log('📝 Test 9: Verifying role visibility security...')
    
    // Get game data for each player to check what they can see
    const gameDataResponses = await Promise.all([
      fetch(`${BASE_URL}/api/games?code=${gameId}`, {
        headers: { 'Cookie': `clientId=host-client-123` }
      }),
      fetch(`${BASE_URL}/api/games?code=${gameId}`, {
        headers: { 'Cookie': `clientId=player1-client-456` }
      }),
      fetch(`${BASE_URL}/api/games?code=${gameId}`, {
        headers: { 'Cookie': `clientId=player2-client-789` }
      })
    ])
    
    const gameDataResults = await Promise.all(gameDataResponses.map(r => r.json()))
    
    // Verify host can see all roles
    const hostGameData = gameDataResults[0]
    const hostPlayers = hostGameData.players
    const hostCanSeeAllRoles = hostPlayers.every(p => p.role !== undefined)
    
    if (!hostCanSeeAllRoles) {
      throw new Error('❌ Host cannot see all player roles')
    }
    console.log('✅ Host can see all roles correctly')
    
    // Verify players can only see their own role
    const player1GameData = gameDataResults[1]
    const player1Players = player1GameData.players
    const player1CanSeeOwnRole = player1Players.find(p => p.client_id === 'player1-client-456')?.role !== undefined
    const player1CannotSeeOthers = player1Players.filter(p => p.client_id !== 'player1-client-456' && !p.is_host).every(p => p.role === undefined)
    
    if (!player1CanSeeOwnRole) {
      throw new Error('❌ Player 1 cannot see their own role')
    }
    if (!player1CannotSeeOthers) {
      throw new Error('❌ Player 1 can see other players\' roles (SECURITY BREACH!)')
    }
    console.log('✅ Player 1 can only see their own role')
    
    // Verify player 2 can only see their own role
    const player2GameData = gameDataResults[2]
    const player2Players = player2GameData.players
    const player2CanSeeOwnRole = player2Players.find(p => p.client_id === 'player2-client-789')?.role !== undefined
    const player2CannotSeeOthers = player2Players.filter(p => p.client_id !== 'player2-client-789' && !p.is_host).every(p => p.role === undefined)
    
    if (!player2CanSeeOwnRole) {
      throw new Error('❌ Player 2 cannot see their own role')
    }
    if (!player2CannotSeeOthers) {
      throw new Error('❌ Player 2 can see other players\' roles (SECURITY BREACH!)')
    }
    console.log('✅ Player 2 can only see their own role')
    
    console.log('🎉 All role visibility security tests passed!')
    
  } catch (error) {
    console.error('❌ Role visibility security test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testRoleVisibility()
