#!/usr/bin/env node

/**
 * Test Role Assignment Logic
 * Ensures proper role distribution including Werwolf assignment
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001'

async function testRoleAssignment() {
  console.log('🎯 Testing Role Assignment Logic...')
  
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
          gameId: gameData.game.code,
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
    
    // Test 4: Verify role distribution
    console.log('📝 Test 4: Verifying role distribution...')
    
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
    
    // Test 5: Verify specific roles exist
    const roles = playersWithRoles.map(p => p.role).filter(Boolean)
    const werwolfCount = roles.filter(r => r === 'werewolf' || r === 'werwolf').length
    const doctorCount = roles.filter(r => r === 'doctor').length
    const policeCount = roles.filter(r => r === 'police').length
    const villagerCount = roles.filter(r => r === 'villager').length
    
    console.log('📊 Role distribution:')
    console.log(`  - Werwolf: ${werwolfCount}`)
    console.log(`  - Doctor: ${doctorCount}`)
    console.log(`  - Police: ${policeCount}`)
    console.log(`  - Villager: ${villagerCount}`)
    
    // Test 6: Verify required roles
    if (werwolfCount === 0) {
      throw new Error('❌ CRITICAL: No Werwolf assigned!')
    }
    
    if (doctorCount === 0) {
      throw new Error('❌ CRITICAL: No Doctor assigned!')
    }
    
    if (policeCount === 0) {
      throw new Error('❌ CRITICAL: No Police assigned!')
    }
    
    if (werwolfCount !== 1) {
      throw new Error(`❌ Expected 1 Werwolf, got ${werwolfCount}`)
    }
    
    if (doctorCount !== 1) {
      throw new Error(`❌ Expected 1 Doctor, got ${doctorCount}`)
    }
    
    if (policeCount !== 1) {
      throw new Error(`❌ Expected 1 Police, got ${policeCount}`)
    }
    
    if (villagerCount !== 3) {
      throw new Error(`❌ Expected 3 Villagers, got ${villagerCount}`)
    }
    
    console.log('✅ All role assignments verified!')
    
    // Test 7: Verify Werwolf can see their role
    console.log('📝 Test 7: Verifying Werwolf can see their role...')
    
    const werwolfPlayer = playersWithRoles.find(p => p.role === 'werewolf' || p.role === 'werwolf')
    if (!werwolfPlayer) {
      throw new Error('❌ No Werwolf player found!')
    }
    
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
    
    console.log('🎉 All role assignment tests passed!')
    return true
    
  } catch (error) {
    console.error('❌ Role assignment test failed:', error.message)
    return false
  }
}

// Run the test
if (require.main === module) {
  testRoleAssignment().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { testRoleAssignment }
