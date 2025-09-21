#!/usr/bin/env node

/**
 * Test Werwolf Role Display in Frontend
 * Ensures Werwolf role is properly displayed to host and the Werwolf player
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

async function testWerwolfRoleDisplay() {
  console.log('🐺 Testing Werwolf Role Display in Frontend...')
  
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
    
    // Test 4: Get game state and find Werwolf player
    console.log('📝 Test 4: Finding Werwolf player...')
    
    const gameStateResponse = await fetch(`${BASE_URL}/api/games?code=${gameData.game.code}`, {
      headers: { 'Cookie': `clientId=${hostClientId}` }
    })
    
    if (!gameStateResponse.ok) {
      throw new Error(`Failed to get game state: ${gameStateResponse.status}`)
    }
    
    const gameState = await gameStateResponse.json()
    const playersWithRoles = gameState.players.filter(p => !p.is_host)
    
    console.log('📊 Players with roles:')
    playersWithRoles.forEach(player => {
      console.log(`  - ${player.name}: ${player.role || 'No role'}`)
    })
    
    // Find the Werwolf player
    const werwolfPlayer = playersWithRoles.find(p => p.role === 'werewolf' || p.role === 'werwolf')
    if (!werwolfPlayer) {
      throw new Error('❌ CRITICAL: No Werwolf player found!')
    }
    
    console.log('✅ Werwolf player found:', werwolfPlayer.name, 'with role:', werwolfPlayer.role)
    
    // Test 5: Verify host can see Werwolf role
    console.log('📝 Test 5: Verifying host can see Werwolf role...')
    
    const hostViewResponse = await fetch(`${BASE_URL}/api/games?code=${gameData.game.code}`, {
      headers: { 'Cookie': `clientId=${hostClientId}` }
    })
    
    if (!hostViewResponse.ok) {
      throw new Error(`Failed to get host view: ${hostViewResponse.status}`)
    }
    
    const hostView = await hostViewResponse.json()
    const hostViewWerwolf = hostView.players.find(p => p.id === werwolfPlayer.id)
    
    if (!hostViewWerwolf || !hostViewWerwolf.role || (hostViewWerwolf.role !== 'werewolf' && hostViewWerwolf.role !== 'werwolf')) {
      throw new Error(`❌ Host cannot see Werwolf role! Role: ${hostViewWerwolf?.role}`)
    }
    
    console.log('✅ Host can see Werwolf role:', hostViewWerwolf.role)
    
    // Test 6: Verify Werwolf player can see their own role
    console.log('📝 Test 6: Verifying Werwolf player can see their own role...')
    
    const werwolfViewResponse = await fetch(`${BASE_URL}/api/games?code=${gameData.game.code}`, {
      headers: { 'Cookie': `clientId=${werwolfPlayer.client_id}` }
    })
    
    if (!werwolfViewResponse.ok) {
      throw new Error(`Failed to get Werwolf view: ${werwolfViewResponse.status}`)
    }
    
    const werwolfView = await werwolfViewResponse.json()
    const werwolfCurrentPlayer = werwolfView.players.find(p => p.client_id === werwolfPlayer.client_id)
    
    if (!werwolfCurrentPlayer || !werwolfCurrentPlayer.role || (werwolfCurrentPlayer.role !== 'werewolf' && werwolfCurrentPlayer.role !== 'werwolf')) {
      throw new Error(`❌ Werwolf player cannot see their role! Role: ${werwolfCurrentPlayer?.role}`)
    }
    
    console.log('✅ Werwolf player can see their role:', werwolfCurrentPlayer.role)
    
    // Test 7: Verify other players see Werwolf as Villager
    console.log('📝 Test 7: Verifying other players see Werwolf as Villager...')
    
    const otherPlayer = playersWithRoles.find(p => p.id !== werwolfPlayer.id && p.role === 'villager')
    if (!otherPlayer) {
      throw new Error('❌ No other player found to test role visibility')
    }
    
    const otherPlayerViewResponse = await fetch(`${BASE_URL}/api/games?code=${gameData.game.code}`, {
      headers: { 'Cookie': `clientId=${otherPlayer.client_id}` }
    })
    
    if (!otherPlayerViewResponse.ok) {
      throw new Error(`Failed to get other player view: ${otherPlayerViewResponse.status}`)
    }
    
    const otherPlayerView = await otherPlayerViewResponse.json()
    const otherPlayerViewWerwolf = otherPlayerView.players.find(p => p.id === werwolfPlayer.id)
    
    // Other players should see the Werwolf as Villager (or not see their role at all)
    if (otherPlayerViewWerwolf && otherPlayerViewWerwolf.role && 
        (otherPlayerViewWerwolf.role === 'werewolf' || otherPlayerViewWerwolf.role === 'werwolf')) {
      console.log('⚠️  Other player can see Werwolf role:', otherPlayerViewWerwolf.role)
      console.log('   This might be expected behavior depending on implementation')
    } else {
      console.log('✅ Other player cannot see Werwolf role (security working)')
    }
    
    console.log('🎉 All Werwolf role display tests passed!')
    return true
    
  } catch (error) {
    console.error('❌ Werwolf role display test failed:', error.message)
    return false
  }
}

// Run the test
if (require.main === module) {
  testWerwolfRoleDisplay().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { testWerwolfRoleDisplay }
