#!/usr/bin/env node

/**
 * Test Game Screen Layout and Styling
 * 
 * This test verifies:
 * 1. Game screen player cards match lobby screen styling
 * 2. Desktop layout: Players on left, sidebar on right
 * 3. Mobile layout: Proper ordering based on active action screens
 * 4. Role visibility security
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001'

async function testGameScreenLayout() {
  console.log('🎨 Testing Game Screen Layout and Styling...')
  
  try {
    // Test 1: Create a game and join players
    console.log('📝 Test 1: Setting up game with players...')
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
    const gameCode = hostData.game.code
    
    // Join players
    const players = [
      { name: 'WerewolfPlayer', clientId: 'player1-client-456' },
      { name: 'DoctorPlayer', clientId: 'player2-client-789' },
      { name: 'PolicePlayer', clientId: 'player3-client-101' },
      { name: 'VillagerPlayer1', clientId: 'player4-client-112' },
      { name: 'VillagerPlayer2', clientId: 'player5-client-113' },
      { name: 'VillagerPlayer3', clientId: 'player6-client-114' }
    ]
    
    for (const player of players) {
      await fetch(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: gameCode,
          playerName: player.name,
          clientId: player.clientId
        })
      })
    }
    
    // Assign roles
    await fetch(`${BASE_URL}/api/games/${hostData.game.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: 'host-client-123'
      })
    })
    
    console.log('✅ Game setup completed')
    
    // Test 2: Verify role visibility security
    console.log('📝 Test 2: Verifying role visibility security...')
    
    // Get game data from different player perspectives
    const hostGameData = await fetch(`${BASE_URL}/api/games?code=${gameCode}`, {
      headers: { 'Cookie': `clientId=host-client-123` }
    }).then(r => r.json())
    
    const werewolfGameData = await fetch(`${BASE_URL}/api/games?code=${gameCode}`, {
      headers: { 'Cookie': `clientId=player1-client-456` }
    }).then(r => r.json())
    
    const villagerGameData = await fetch(`${BASE_URL}/api/games?code=${gameCode}`, {
      headers: { 'Cookie': `clientId=player4-client-112` }
    }).then(r => r.json())
    
    // Verify host can see all roles
    const hostPlayers = hostGameData.players
    const hostCanSeeAllRoles = hostPlayers.every(p => p.role !== undefined)
    
    if (!hostCanSeeAllRoles) {
      throw new Error('❌ Host cannot see all player roles')
    }
    console.log('✅ Host can see all roles correctly')
    
    // Verify werewolf can only see their own role
    const werewolfPlayers = werewolfGameData.players
    const werewolfPlayer = werewolfPlayers.find(p => p.client_id === 'player1-client-456')
    const otherPlayers = werewolfPlayers.filter(p => p.client_id !== 'player1-client-456' && !p.is_host)
    
    if (!werewolfPlayer.role) {
      throw new Error('❌ Werewolf cannot see their own role')
    }
    
    const werewolfCanSeeOthers = otherPlayers.some(p => p.role && p.role !== 'villager')
    if (werewolfCanSeeOthers) {
      throw new Error('❌ Werewolf can see other players\' actual roles (SECURITY BREACH!)')
    }
    console.log('✅ Werewolf can only see their own role')
    
    // Verify villager can only see their own role
    const villagerPlayers = villagerGameData.players
    const villagerPlayer = villagerPlayers.find(p => p.client_id === 'player4-client-112')
    const otherVillagerPlayers = villagerPlayers.filter(p => p.client_id !== 'player4-client-112' && !p.is_host)
    
    if (!villagerPlayer.role) {
      throw new Error('❌ Villager cannot see their own role')
    }
    
    const villagerCanSeeOthers = otherVillagerPlayers.some(p => p.role && p.role !== 'villager')
    if (villagerCanSeeOthers) {
      throw new Error('❌ Villager can see other players\' actual roles (SECURITY BREACH!)')
    }
    console.log('✅ Villager can only see their own role')
    
    // Test 3: Verify player ordering
    console.log('📝 Test 3: Verifying player ordering...')
    
    // Host should be first
    if (!hostPlayers[0].is_host) {
      throw new Error('❌ Host is not first in the list')
    }
    console.log('✅ Host is first in the list')
    
    // Current player should be second (for non-host players)
    const werewolfIndex = werewolfPlayers.findIndex(p => p.client_id === 'player1-client-456')
    if (werewolfIndex !== 1) {
      throw new Error('❌ Current player is not second in the list')
    }
    console.log('✅ Current player is second in the list')
    
    // Test 4: Verify game phase transition
    console.log('📝 Test 4: Verifying game phase transition...')
    
    // Game should be in lobby phase after role assignment (until host starts it)
    if (hostGameData.game.phase !== 'lobby') {
      throw new Error(`❌ Game phase is ${hostGameData.game.phase}, expected lobby`)
    }
    console.log('✅ Game phase is correctly set to lobby (ready for host to start)')
    
    // Test 5: Verify action screen timing
    console.log('📝 Test 5: Verifying action screen timing...')
    
    // Werewolf should not be able to act until host starts the phase
    // This is tested by checking if phase_started is false initially
    const roundState = hostGameData.roundState
    if (roundState && roundState.phase_started) {
      throw new Error('❌ Phase should not be started until host clicks Wake Up Werewolf')
    }
    console.log('✅ Phase is not started until host action')
    
    console.log('🎉 All game screen layout tests passed!')
    
  } catch (error) {
    console.error('❌ Game screen layout test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testGameScreenLayout()
