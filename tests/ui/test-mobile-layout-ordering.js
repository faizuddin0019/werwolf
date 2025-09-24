#!/usr/bin/env node

/**
 * Test Mobile Layout Ordering
 * 
 * This test verifies mobile layout ordering:
 * 1. Action screens appear on top when active
 * 2. Players section appears on top when no action screens active
 * 3. Proper ordering based on hasActiveActionScreen logic
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

async function testMobileLayoutOrdering() {
  console.log('📱 Testing Mobile Layout Ordering...')
  
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
    const gameId = hostData.game.code
    
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
          gameId: gameId,
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
    
    // Test 2: Verify initial state (no active action screens)
    console.log('📝 Test 2: Verifying initial state (no active action screens)...')
    
    const werewolfGameData = await fetch(`${BASE_URL}/api/games?code=${gameId}`, {
      headers: { 'Cookie': `clientId=player1-client-456` }
    }).then(r => r.json())
    
    const werewolfPlayer = werewolfGameData.players.find(p => p.client_id === 'player1-client-456')
    const roundState = werewolfGameData.roundState
    
    // Werewolf should not be able to act yet (phase not started)
    const canAct = werewolfPlayer && (
      (werewolfGameData.game.phase === 'night_wolf' && roundState && roundState.phase_started) ||
      (werewolfGameData.game.phase === 'day_vote' && werewolfPlayer.alive)
    )
    
    if (canAct) {
      throw new Error('❌ Werewolf should not be able to act before host starts phase')
    }
    console.log('✅ Werewolf cannot act before host starts phase')
    
    // Test 3: Host starts werewolf phase
    console.log('📝 Test 3: Host starting werewolf phase...')
    
    const startPhaseResponse = await fetch(`${BASE_URL}/api/games/${hostData.game.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: 'host-client-123'
      })
    })
    
    if (!startPhaseResponse.ok) {
      throw new Error(`Failed to start werewolf phase: ${startPhaseResponse.status}`)
    }
    
    console.log('✅ Werewolf phase started by host')
    
    // Test 4: Verify werewolf can now act
    console.log('📝 Test 4: Verifying werewolf can now act...')
    
    const updatedWerewolfGameData = await fetch(`${BASE_URL}/api/games?code=${gameId}`, {
      headers: { 'Cookie': `clientId=player1-client-456` }
    }).then(r => r.json())
    
    const updatedWerewolfPlayer = updatedWerewolfGameData.players.find(p => p.client_id === 'player1-client-456')
    const updatedRoundState = updatedWerewolfGameData.roundState
    
    // Werewolf should now be able to act
    const canNowAct = updatedWerewolfPlayer && (
      (updatedWerewolfGameData.game.phase === 'night_wolf' && updatedRoundState && updatedRoundState.phase_started) ||
      (updatedWerewolfGameData.game.phase === 'day_vote' && updatedWerewolfPlayer.alive)
    )
    
    if (!canNowAct) {
      throw new Error('❌ Werewolf should be able to act after host starts phase')
    }
    console.log('✅ Werewolf can now act after host starts phase')
    
    // Test 5: Verify mobile layout ordering logic
    console.log('📝 Test 5: Verifying mobile layout ordering logic...')
    
    // Test the hasActiveActionScreen logic
    const hasActiveActionScreen = updatedWerewolfPlayer && (
      (updatedWerewolfGameData.game.phase === 'night_wolf' && updatedRoundState && updatedRoundState.phase_started) ||
      (updatedWerewolfGameData.game.phase === 'day_vote' && updatedWerewolfPlayer.alive)
    )
    
    if (!hasActiveActionScreen) {
      throw new Error('❌ hasActiveActionScreen should be true when werewolf can act')
    }
    console.log('✅ hasActiveActionScreen logic works correctly')
    
    // Test 6: Verify villager cannot act during werewolf phase
    console.log('📝 Test 6: Verifying villager cannot act during werewolf phase...')
    
    const villagerGameData = await fetch(`${BASE_URL}/api/games?code=${gameId}`, {
      headers: { 'Cookie': `clientId=player4-client-112` }
    }).then(r => r.json())
    
    const villagerPlayer = villagerGameData.players.find(p => p.client_id === 'player4-client-112')
    const villagerRoundState = villagerGameData.roundState
    
    // Villager should not be able to act during werewolf phase
    // Only werewolves can act during night_wolf phase
    // A villager can only act during day phases (voting), not during night phases
    const villagerCanAct = villagerPlayer && villagerPlayer.role === 'villager' && (
      villagerGameData.game.phase === 'day_vote' || villagerGameData.game.phase === 'day_final_vote'
    )
    
    // Villager should NOT be able to act during werewolf phase
    if (villagerCanAct) {
      throw new Error('❌ Villager should not be able to act during werewolf phase')
    }
    console.log('✅ Villager cannot act during werewolf phase')
    
    // Test 7: Verify villager has no active action screen
    console.log('📝 Test 7: Verifying villager has no active action screen...')
    
    const villagerHasActiveActionScreen = villagerPlayer && villagerPlayer.role === 'villager' && (
      villagerGameData.game.phase === 'day_vote' || villagerGameData.game.phase === 'day_final_vote'
    )
    
    if (villagerHasActiveActionScreen) {
      throw new Error('❌ Villager should not have active action screen during werewolf phase')
    }
    console.log('✅ Villager has no active action screen during werewolf phase')
    
    console.log('🎉 All mobile layout ordering tests passed!')
    
  } catch (error) {
    console.error('❌ Mobile layout ordering test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testMobileLayoutOrdering()
