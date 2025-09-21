#!/usr/bin/env node

/**
 * Test Phase Timing Security
 * 
 * This test verifies the phase timing security:
 * 1. Players cannot act until host starts their phase
 * 2. phase_started field properly controls when players can act
 * 3. Security against premature action screens
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

async function testPhaseTimingSecurity() {
  console.log('🔒 Testing Phase Timing Security...')
  
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
    
    // Test 2: Verify initial phase_started state
    console.log('📝 Test 2: Verifying initial phase_started state...')
    
    const initialGameData = await fetch(`${BASE_URL}/api/games?code=${gameCode}`, {
      headers: { 'Cookie': `clientId=host-client-123` }
    }).then(r => r.json())
    
    const initialRoundState = initialGameData.roundState
    
    if (initialRoundState && initialRoundState.phase_started) {
      throw new Error('❌ phase_started should be false initially')
    }
    console.log('✅ phase_started is false initially')
    
    // Test 3: Verify werewolf cannot act before host starts phase
    console.log('📝 Test 3: Verifying werewolf cannot act before host starts phase...')
    
    const werewolfGameData = await fetch(`${BASE_URL}/api/games?code=${gameCode}`, {
      headers: { 'Cookie': `clientId=host-client-123` }
    }).then(r => r.json())
    
    // Find the actual werwolf player
    const werewolfPlayer = werewolfGameData.players.find(p => p.role === 'werewolf' || p.role === 'werwolf')
    const werewolfRoundState = werewolfGameData.roundState
    
    if (!werewolfPlayer) {
      throw new Error('❌ No werwolf player found in the game')
    }
    
    // Try to perform werewolf action (should fail)
    const wolfActionResponse = await fetch(`${BASE_URL}/api/games/${hostData.game.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'wolf_select',
        clientId: werewolfPlayer.client_id,
        data: { targetId: werewolfGameData.players.find(p => !p.is_host && p.role !== 'werewolf' && p.role !== 'werwolf').id }
      })
    })
    
    if (wolfActionResponse.ok) {
      throw new Error('❌ Werewolf should not be able to act before host starts phase')
    }
    console.log('✅ Werewolf cannot act before host starts phase')
    
    // Test 4: Host starts werewolf phase
    console.log('📝 Test 4: Host starting werewolf phase...')
    
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
    
    // Test 5: Verify phase_started is now true
    console.log('📝 Test 5: Verifying phase_started is now true...')
    
    const updatedGameData = await fetch(`${BASE_URL}/api/games?code=${gameCode}`, {
      headers: { 'Cookie': `clientId=host-client-123` }
    }).then(r => r.json())
    
    const updatedRoundState = updatedGameData.roundState
    
    if (!updatedRoundState || !updatedRoundState.phase_started) {
      throw new Error('❌ phase_started should be true after host starts phase')
    }
    console.log('✅ phase_started is true after host starts phase')
    
    // Test 6: Verify werewolf can now act
    console.log('📝 Test 6: Verifying werewolf can now act...')
    
    const updatedWerewolfGameData = await fetch(`${BASE_URL}/api/games?code=${gameCode}`, {
      headers: { 'Cookie': `clientId=host-client-123` }
    }).then(r => r.json())
    
    // Debug: Check what roles were assigned
    console.log('🔧 Debug: All players and their roles:')
    updatedWerewolfGameData.players.forEach(p => {
      console.log(`  - ${p.name} (${p.client_id}): ${p.role || 'no role'} ${p.is_host ? '(HOST)' : ''}`)
    })
    
    // Find the actual werwolf player (not hardcoded)
    const updatedWerewolfPlayer = updatedWerewolfGameData.players.find(p => p.role === 'werewolf' || p.role === 'werwolf')
    const targetPlayer = updatedWerewolfGameData.players.find(p => !p.is_host && p.role !== 'werewolf' && p.role !== 'werwolf')
    
    console.log('🔧 Debug: Werewolf player:', updatedWerewolfPlayer ? { name: updatedWerewolfPlayer.name, role: updatedWerewolfPlayer.role, clientId: updatedWerewolfPlayer.client_id } : 'NOT FOUND')
    console.log('🔧 Debug: Target player:', targetPlayer ? { name: targetPlayer.name, role: targetPlayer.role, clientId: targetPlayer.client_id } : 'NOT FOUND')
    
    if (!updatedWerewolfPlayer) {
      throw new Error('❌ No werwolf player found in the game')
    }
    
    if (!targetPlayer) {
      throw new Error('❌ No target player found for werwolf action')
    }
    
    // Try to perform werewolf action (should succeed)
    const wolfActionResponse2 = await fetch(`${BASE_URL}/api/games/${hostData.game.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'wolf_select',
        clientId: updatedWerewolfPlayer.client_id,
        data: { targetId: targetPlayer.id }
      })
    })
    
    if (!wolfActionResponse2.ok) {
      const errorText = await wolfActionResponse2.text()
      throw new Error(`❌ Werewolf should be able to act after host starts phase. Error: ${wolfActionResponse2.status} - ${errorText}`)
    }
    console.log('✅ Werewolf can act after host starts phase')
    
    // Test 7: Verify doctor cannot act during werewolf phase
    console.log('📝 Test 7: Verifying doctor cannot act during werewolf phase...')
    
    const doctorGameData = await fetch(`${BASE_URL}/api/games?code=${gameCode}`, {
      headers: { 'Cookie': `clientId=player2-client-789` }
    }).then(r => r.json())
    
    const doctorPlayer = doctorGameData.players.find(p => p.client_id === 'player2-client-789')
    const doctorTarget = doctorGameData.players.find(p => !p.is_host && p.client_id !== 'player2-client-789')
    
    // Try to perform doctor action (should fail)
    const doctorActionResponse = await fetch(`${BASE_URL}/api/games/${hostData.game.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'doctor_save',
        clientId: 'player2-client-789',
        data: { targetId: doctorTarget.id }
      })
    })
    
    if (doctorActionResponse.ok) {
      throw new Error('❌ Doctor should not be able to act during werewolf phase')
    }
    console.log('✅ Doctor cannot act during werewolf phase')
    
    // Test 8: Verify police cannot act during werewolf phase
    console.log('📝 Test 8: Verifying police cannot act during werewolf phase...')
    
    const policeGameData = await fetch(`${BASE_URL}/api/games?code=${gameCode}`, {
      headers: { 'Cookie': `clientId=player3-client-101` }
    }).then(r => r.json())
    
    const policePlayer = policeGameData.players.find(p => p.client_id === 'player3-client-101')
    const policeTarget = policeGameData.players.find(p => !p.is_host && p.client_id !== 'player3-client-101')
    
    // Try to perform police action (should fail)
    const policeActionResponse = await fetch(`${BASE_URL}/api/games/${hostData.game.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'police_inspect',
        clientId: 'player3-client-101',
        data: { targetId: policeTarget.id }
      })
    })
    
    if (policeActionResponse.ok) {
      throw new Error('❌ Police should not be able to act during werewolf phase')
    }
    console.log('✅ Police cannot act during werewolf phase')
    
    console.log('🎉 All phase timing security tests passed!')
    
  } catch (error) {
    console.error('❌ Phase timing security test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testPhaseTimingSecurity()
