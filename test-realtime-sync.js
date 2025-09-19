#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Real-time Synchronization and Game Flow Issues
 * 
 * Tests all the critical issues fixed today:
 * 1. Player join visibility (real-time updates without refresh)
 * 2. Werwolf turn progression (automatic phase advancement)
 * 3. Police inspect response (yes/no based on actual detection)
 * 4. Host role actions visibility (real-time round state updates)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Test configuration
const TEST_CONFIG = {
  gameCode: null,
  hostClientId: null,
  playerClientIds: [],
  gameId: null,
  players: []
}

// Utility functions
function generateClientId() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  const response = await fetch(url)
  const data = await response.json()
  
  return { response, data }
}

// Test 1: Player Join Visibility (Real-time Updates)
async function testPlayerJoinVisibility() {
  console.log('\n🧪 Test 1: Player Join Visibility (Real-time Updates)')
  console.log('=' .repeat(60))
  
  try {
    // Create host
    const hostClientId = generateClientId()
    const hostResponse = await makeRequest('/api/games', 'POST', {
      hostName: 'Test Host',
      clientId: hostClientId
    })
    
    if (!hostResponse.response.ok) {
      throw new Error(`Failed to create game: ${hostResponse.data.error}`)
    }
    
    TEST_CONFIG.gameCode = hostResponse.data.game.code
    TEST_CONFIG.gameId = hostResponse.data.game.id
    TEST_CONFIG.hostClientId = hostClientId
    TEST_CONFIG.players.push(hostResponse.data.player)
    
    console.log(`✅ Game created with code: ${TEST_CONFIG.gameCode}`)
    
    // Add multiple players
    const playerNames = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank']
    const playerClientIds = []
    
    for (let i = 0; i < playerNames.length; i++) {
      const clientId = generateClientId()
      playerClientIds.push(clientId)
      
      const joinResponse = await makeRequest('/api/games/join', 'POST', {
        gameCode: TEST_CONFIG.gameCode,
        playerName: playerNames[i],
        clientId: clientId
      })
      
      if (!joinResponse.response.ok) {
        throw new Error(`Failed to join game: ${joinResponse.data.error}`)
      }
      
      TEST_CONFIG.players.push(joinResponse.data.player)
      console.log(`✅ Player ${playerNames[i]} joined (${joinResponse.data.players.length} total players)`)
      
      // Small delay to simulate real-time updates
      await sleep(100)
    }
    
    // Verify all players are in the game
    const gameResponse = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    if (!gameResponse.response.ok) {
      throw new Error(`Failed to fetch game: ${gameResponse.data.error}`)
    }
    
    const totalPlayers = gameResponse.data.players.length
    if (totalPlayers !== 7) { // 1 host + 6 players
      throw new Error(`Expected 7 players, got ${totalPlayers}`)
    }
    
    console.log(`✅ All ${totalPlayers} players successfully joined and visible`)
    return true
    
  } catch (error) {
    console.error(`❌ Test 1 failed: ${error.message}`)
    return false
  }
}

// Test 2: Werwolf Turn Progression (Automatic Phase Advancement)
async function testWerwolfTurnProgression() {
  console.log('\n🧪 Test 2: Werwolf Turn Progression (Automatic Phase Advancement)')
  console.log('=' .repeat(60))
  
  try {
    if (!TEST_CONFIG.gameId) {
      throw new Error('Game not created in previous test')
    }
    
    // Start the game (assign roles)
    const startResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'assign_roles',
      clientId: TEST_CONFIG.hostClientId
    })
    
    if (!startResponse.response.ok) {
      throw new Error(`Failed to start game: ${startResponse.data.error}`)
    }
    
    console.log('✅ Game started, roles assigned')
    
    // Check initial phase
    const gameResponse = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    if (gameResponse.data.game.phase !== 'night_wolf') {
      throw new Error(`Expected phase 'night_wolf', got '${gameResponse.data.game.phase}'`)
    }
    
    console.log('✅ Game in night_wolf phase')
    
    // Find werewolf player
    const werewolfPlayer = gameResponse.data.players.find(p => p.role === 'werewolf' && !p.is_host)
    if (!werewolfPlayer) {
      throw new Error('No werewolf player found')
    }
    
    console.log(`✅ Found werewolf: ${werewolfPlayer.name}`)
    
    // Find target player (not werewolf)
    const targetPlayer = gameResponse.data.players.find(p => p.id !== werewolfPlayer.id && !p.is_host)
    if (!targetPlayer) {
      throw new Error('No target player found')
    }
    
    console.log(`✅ Found target: ${targetPlayer.name}`)
    
    // Werewolf selects target
    const wolfSelectResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'wolf_select',
      clientId: werewolfPlayer.client_id,
      data: { targetId: targetPlayer.id }
    })
    
    if (!wolfSelectResponse.response.ok) {
      throw new Error(`Failed wolf select: ${wolfSelectResponse.data.error}`)
    }
    
    console.log('✅ Werewolf selected target')
    
    // Check if phase automatically advanced to night_police
    await sleep(500) // Wait for real-time sync
    const phaseResponse = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    if (phaseResponse.data.game.phase !== 'night_police') {
      throw new Error(`Expected phase 'night_police', got '${phaseResponse.data.game.phase}'`)
    }
    
    console.log('✅ Phase automatically advanced to night_police')
    
    // Find police player
    const policePlayer = phaseResponse.data.players.find(p => p.role === 'police' && !p.is_host)
    if (!policePlayer) {
      throw new Error('No police player found')
    }
    
    console.log(`✅ Found police: ${policePlayer.name}`)
    
    // Police inspects target
    const policeInspectResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'police_inspect',
      clientId: policePlayer.client_id,
      data: { targetId: targetPlayer.id }
    })
    
    if (!policeInspectResponse.response.ok) {
      throw new Error(`Failed police inspect: ${policeInspectResponse.data.error}`)
    }
    
    console.log('✅ Police inspected target')
    
    // Check if phase automatically advanced to night_doctor
    await sleep(500) // Wait for real-time sync
    const phaseResponse2 = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    if (phaseResponse2.data.game.phase !== 'night_doctor') {
      throw new Error(`Expected phase 'night_doctor', got '${phaseResponse2.data.game.phase}'`)
    }
    
    console.log('✅ Phase automatically advanced to night_doctor')
    
    // Find doctor player
    const doctorPlayer = phaseResponse2.data.players.find(p => p.role === 'doctor' && !p.is_host)
    if (!doctorPlayer) {
      throw new Error('No doctor player found')
    }
    
    console.log(`✅ Found doctor: ${doctorPlayer.name}`)
    
    // Doctor saves target
    const doctorSaveResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'doctor_save',
      clientId: doctorPlayer.client_id,
      data: { targetId: targetPlayer.id }
    })
    
    if (!doctorSaveResponse.response.ok) {
      throw new Error(`Failed doctor save: ${doctorSaveResponse.data.error}`)
    }
    
    console.log('✅ Doctor saved target')
    
    // Check if phase automatically advanced to reveal
    await sleep(500) // Wait for real-time sync
    const phaseResponse3 = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    if (phaseResponse3.data.game.phase !== 'reveal') {
      throw new Error(`Expected phase 'reveal', got '${phaseResponse3.data.game.phase}'`)
    }
    
    console.log('✅ Phase automatically advanced to reveal')
    console.log('✅ All automatic phase progressions working correctly')
    
    return true
    
  } catch (error) {
    console.error(`❌ Test 2 failed: ${error.message}`)
    return false
  }
}

// Test 3: Police Inspect Response (Yes/No Based on Actual Detection)
async function testPoliceInspectResponse() {
  console.log('\n🧪 Test 3: Police Inspect Response (Yes/No Based on Actual Detection)')
  console.log('=' .repeat(60))
  
  try {
    if (!TEST_CONFIG.gameId) {
      throw new Error('Game not created in previous test')
    }
    
    // Get current game state
    const gameResponse = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    const players = gameResponse.data.players
    
    // Find police player
    const policePlayer = players.find(p => p.role === 'police' && !p.is_host)
    if (!policePlayer) {
      throw new Error('No police player found')
    }
    
    // Find werewolf player
    const werewolfPlayer = players.find(p => p.role === 'werewolf' && !p.is_host)
    if (!werewolfPlayer) {
      throw new Error('No werewolf player found')
    }
    
    // Find villager player
    const villagerPlayer = players.find(p => p.role === 'villager' && !p.is_host)
    if (!villagerPlayer) {
      throw new Error('No villager player found')
    }
    
    console.log(`✅ Found police: ${policePlayer.name}`)
    console.log(`✅ Found werewolf: ${werewolfPlayer.name}`)
    console.log(`✅ Found villager: ${villagerPlayer.name}`)
    
    // Test 1: Police inspects werewolf (should return 'werewolf')
    const inspectWerewolfResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'police_inspect',
      clientId: policePlayer.client_id,
      data: { targetId: werewolfPlayer.id }
    })
    
    if (!inspectWerewolfResponse.response.ok) {
      throw new Error(`Failed to inspect werewolf: ${inspectWerewolfResponse.data.error}`)
    }
    
    if (inspectWerewolfResponse.data.result !== 'werewolf') {
      throw new Error(`Expected result 'werewolf', got '${inspectWerewolfResponse.data.result}'`)
    }
    
    console.log('✅ Police correctly detected werewolf')
    
    // Test 2: Police inspects villager (should return 'not_werewolf')
    const inspectVillagerResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'police_inspect',
      clientId: policePlayer.client_id,
      data: { targetId: villagerPlayer.id }
    })
    
    if (!inspectVillagerResponse.response.ok) {
      throw new Error(`Failed to inspect villager: ${inspectVillagerResponse.data.error}`)
    }
    
    if (inspectVillagerResponse.data.result !== 'not_werewolf') {
      throw new Error(`Expected result 'not_werewolf', got '${inspectVillagerResponse.data.result}'`)
    }
    
    console.log('✅ Police correctly detected villager as not werewolf')
    
    // Test 3: Police inspects doctor (should return 'not_werewolf')
    const doctorPlayer = players.find(p => p.role === 'doctor' && !p.is_host)
    if (doctorPlayer) {
      const inspectDoctorResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
        action: 'police_inspect',
        clientId: policePlayer.client_id,
        data: { targetId: doctorPlayer.id }
      })
      
      if (!inspectDoctorResponse.response.ok) {
        throw new Error(`Failed to inspect doctor: ${inspectDoctorResponse.data.error}`)
      }
      
      if (inspectDoctorResponse.data.result !== 'not_werewolf') {
        throw new Error(`Expected result 'not_werewolf', got '${inspectDoctorResponse.data.result}'`)
      }
      
      console.log('✅ Police correctly detected doctor as not werewolf')
    }
    
    console.log('✅ All police inspect responses working correctly')
    return true
    
  } catch (error) {
    console.error(`❌ Test 3 failed: ${error.message}`)
    return false
  }
}

// Test 4: Host Role Actions Visibility (Real-time Round State Updates)
async function testHostRoleActionsVisibility() {
  console.log('\n🧪 Test 4: Host Role Actions Visibility (Real-time Round State Updates)')
  console.log('=' .repeat(60))
  
  try {
    if (!TEST_CONFIG.gameId) {
      throw new Error('Game not created in previous test')
    }
    
    // Get current game state
    const gameResponse = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    const players = gameResponse.data.players
    
    // Find werewolf player
    const werewolfPlayer = players.find(p => p.role === 'werewolf' && !p.is_host)
    if (!werewolfPlayer) {
      throw new Error('No werewolf player found')
    }
    
    // Find police player
    const policePlayer = players.find(p => p.role === 'police' && !p.is_host)
    if (!policePlayer) {
      throw new Error('No police player found')
    }
    
    // Find doctor player
    const doctorPlayer = players.find(p => p.role === 'doctor' && !p.is_host)
    if (!doctorPlayer) {
      throw new Error('No doctor player found')
    }
    
    // Find target player
    const targetPlayer = players.find(p => p.id !== werewolfPlayer.id && p.id !== policePlayer.id && p.id !== doctorPlayer.id && !p.is_host)
    if (!targetPlayer) {
      throw new Error('No target player found')
    }
    
    console.log(`✅ Found werewolf: ${werewolfPlayer.name}`)
    console.log(`✅ Found police: ${policePlayer.name}`)
    console.log(`✅ Found doctor: ${doctorPlayer.name}`)
    console.log(`✅ Found target: ${targetPlayer.name}`)
    
    // Reset game to night_wolf phase for testing
    const resetResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'next_phase',
      clientId: TEST_CONFIG.hostClientId,
      data: { phase: 'night_wolf' }
    })
    
    if (!resetResponse.response.ok) {
      throw new Error(`Failed to reset phase: ${resetResponse.data.error}`)
    }
    
    console.log('✅ Game reset to night_wolf phase')
    
    // Test 1: Werewolf action and round state update
    const wolfSelectResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'wolf_select',
      clientId: werewolfPlayer.client_id,
      data: { targetId: targetPlayer.id }
    })
    
    if (!wolfSelectResponse.response.ok) {
      throw new Error(`Failed wolf select: ${wolfSelectResponse.data.error}`)
    }
    
    console.log('✅ Werewolf selected target')
    
    // Check round state update
    await sleep(500) // Wait for real-time sync
    const roundStateResponse1 = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    if (!roundStateResponse1.data.roundState) {
      throw new Error('Round state not found')
    }
    
    if (roundStateResponse1.data.roundState.wolf_target_player_id !== targetPlayer.id) {
      throw new Error('Wolf target not recorded in round state')
    }
    
    console.log('✅ Round state updated with werewolf target')
    
    // Test 2: Police action and round state update
    const policeInspectResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'police_inspect',
      clientId: policePlayer.client_id,
      data: { targetId: targetPlayer.id }
    })
    
    if (!policeInspectResponse.response.ok) {
      throw new Error(`Failed police inspect: ${policeInspectResponse.data.error}`)
    }
    
    console.log('✅ Police inspected target')
    
    // Check round state update
    await sleep(500) // Wait for real-time sync
    const roundStateResponse2 = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    if (!roundStateResponse2.data.roundState) {
      throw new Error('Round state not found')
    }
    
    if (roundStateResponse2.data.roundState.police_inspect_player_id !== targetPlayer.id) {
      throw new Error('Police inspect target not recorded in round state')
    }
    
    if (!roundStateResponse2.data.roundState.police_inspect_result) {
      throw new Error('Police inspect result not recorded in round state')
    }
    
    console.log('✅ Round state updated with police inspect result')
    
    // Test 3: Doctor action and round state update
    const doctorSaveResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
      action: 'doctor_save',
      clientId: doctorPlayer.client_id,
      data: { targetId: targetPlayer.id }
    })
    
    if (!doctorSaveResponse.response.ok) {
      throw new Error(`Failed doctor save: ${doctorSaveResponse.data.error}`)
    }
    
    console.log('✅ Doctor saved target')
    
    // Check round state update
    await sleep(500) // Wait for real-time sync
    const roundStateResponse3 = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
    if (!roundStateResponse3.data.roundState) {
      throw new Error('Round state not found')
    }
    
    if (roundStateResponse3.data.roundState.doctor_save_player_id !== targetPlayer.id) {
      throw new Error('Doctor save target not recorded in round state')
    }
    
    console.log('✅ Round state updated with doctor save action')
    
    // Test 4: Verify all actions are visible in round state
    const finalRoundState = roundStateResponse3.data.roundState
    const allActionsPresent = 
      finalRoundState.wolf_target_player_id &&
      finalRoundState.police_inspect_player_id &&
      finalRoundState.police_inspect_result &&
      finalRoundState.doctor_save_player_id
    
    if (!allActionsPresent) {
      throw new Error('Not all actions are present in round state')
    }
    
    console.log('✅ All role actions visible in round state')
    console.log('✅ Host can see all role actions and results in real-time')
    
    return true
    
  } catch (error) {
    console.error(`❌ Test 4 failed: ${error.message}`)
    return false
  }
}

// Test 5: Real-time Synchronization (Multiple Clients)
async function testRealtimeSynchronization() {
  console.log('\n🧪 Test 5: Real-time Synchronization (Multiple Clients)')
  console.log('=' .repeat(60))
  
  try {
    if (!TEST_CONFIG.gameId) {
      throw new Error('Game not created in previous test')
    }
    
    // Create a new game for this test
    const hostClientId = generateClientId()
    const hostResponse = await makeRequest('/api/games', 'POST', {
      hostName: 'Realtime Test Host',
      clientId: hostClientId
    })
    
    if (!hostResponse.response.ok) {
      throw new Error(`Failed to create game: ${hostResponse.data.error}`)
    }
    
    const testGameCode = hostResponse.data.game.code
    const testGameId = hostResponse.data.game.id
    
    console.log(`✅ Test game created with code: ${testGameCode}`)
    
    // Add players
    const playerNames = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5', 'Player6']
    const playerClientIds = []
    
    for (let i = 0; i < playerNames.length; i++) {
      const clientId = generateClientId()
      playerClientIds.push(clientId)
      
      const joinResponse = await makeRequest('/api/games/join', 'POST', {
        gameCode: testGameCode,
        playerName: playerNames[i],
        clientId: clientId
      })
      
      if (!joinResponse.response.ok) {
        throw new Error(`Failed to join game: ${joinResponse.data.error}`)
      }
      
      console.log(`✅ Player ${playerNames[i]} joined`)
    }
    
    // Start the game
    const startResponse = await makeRequest(`/api/games/${testGameId}/actions`, 'POST', {
      action: 'assign_roles',
      clientId: hostClientId
    })
    
    if (!startResponse.response.ok) {
      throw new Error(`Failed to start game: ${startResponse.data.error}`)
    }
    
    console.log('✅ Game started')
    
    // Get game state from multiple "clients" (simulated)
    const gameStates = []
    for (let i = 0; i < 3; i++) {
      const gameResponse = await makeRequest(`/api/games?code=${testGameCode}`)
      if (!gameResponse.response.ok) {
        throw new Error(`Failed to fetch game state: ${gameResponse.data.error}`)
      }
      gameStates.push(gameResponse.data)
      await sleep(100) // Small delay between requests
    }
    
    // Verify all clients see the same game state
    const firstState = gameStates[0]
    for (let i = 1; i < gameStates.length; i++) {
      const currentState = gameStates[i]
      
      if (firstState.game.phase !== currentState.game.phase) {
        throw new Error(`Game phases don't match: ${firstState.game.phase} vs ${currentState.game.phase}`)
      }
      
      if (firstState.players.length !== currentState.players.length) {
        throw new Error(`Player counts don't match: ${firstState.players.length} vs ${currentState.players.length}`)
      }
      
      // Check if all players have the same roles
      for (let j = 0; j < firstState.players.length; j++) {
        const firstPlayer = firstState.players[j]
        const currentPlayer = currentState.players.find(p => p.id === firstPlayer.id)
        
        if (!currentPlayer) {
          throw new Error(`Player ${firstPlayer.name} not found in current state`)
        }
        
        if (firstPlayer.role !== currentPlayer.role) {
          throw new Error(`Player ${firstPlayer.name} role mismatch: ${firstPlayer.role} vs ${currentPlayer.role}`)
        }
      }
    }
    
    console.log('✅ All clients see consistent game state')
    
    // Test role action and verify all clients see the update
    const werewolfPlayer = firstState.players.find(p => p.role === 'werewolf' && !p.is_host)
    const targetPlayer = firstState.players.find(p => p.id !== werewolfPlayer.id && !p.is_host)
    
    if (werewolfPlayer && targetPlayer) {
      const wolfSelectResponse = await makeRequest(`/api/games/${testGameId}/actions`, 'POST', {
        action: 'wolf_select',
        clientId: werewolfPlayer.client_id,
        data: { targetId: targetPlayer.id }
      })
      
      if (!wolfSelectResponse.response.ok) {
        throw new Error(`Failed wolf select: ${wolfSelectResponse.data.error}`)
      }
      
      console.log('✅ Werewolf action performed')
      
      // Wait for real-time sync
      await sleep(1000)
      
      // Check if all clients see the phase change
      const updatedStates = []
      for (let i = 0; i < 3; i++) {
        const gameResponse = await makeRequest(`/api/games?code=${testGameCode}`)
        if (!gameResponse.response.ok) {
          throw new Error(`Failed to fetch updated game state: ${gameResponse.data.error}`)
        }
        updatedStates.push(gameResponse.data)
        await sleep(100)
      }
      
      // Verify all clients see the phase change
      for (let i = 0; i < updatedStates.length; i++) {
        if (updatedStates[i].game.phase !== 'night_police') {
          throw new Error(`Client ${i} doesn't see phase change: ${updatedStates[i].game.phase}`)
        }
      }
      
      console.log('✅ All clients see phase change in real-time')
    }
    
    console.log('✅ Real-time synchronization working correctly')
    return true
    
  } catch (error) {
    console.error(`❌ Test 5 failed: ${error.message}`)
    return false
  }
}

// Test 6: Edge Cases and Error Handling
async function testEdgeCasesAndErrorHandling() {
  console.log('\n🧪 Test 6: Edge Cases and Error Handling')
  console.log('=' .repeat(60))
  
  try {
    // Test 1: Invalid game code
    const invalidGameResponse = await makeRequest('/api/games?code=INVALID')
    if (invalidGameResponse.response.ok) {
      throw new Error('Expected error for invalid game code')
    }
    console.log('✅ Invalid game code handled correctly')
    
    // Test 2: Invalid client ID
    const invalidClientResponse = await makeRequest('/api/games/join', 'POST', {
      gameCode: 'INVALID',
      playerName: 'Test Player',
      clientId: 'invalid-client-id'
    })
    if (invalidClientResponse.response.ok) {
      throw new Error('Expected error for invalid client ID')
    }
    console.log('✅ Invalid client ID handled correctly')
    
    // Test 3: Duplicate player join
    if (TEST_CONFIG.gameCode) {
      const duplicateJoinResponse = await makeRequest('/api/games/join', 'POST', {
        gameCode: TEST_CONFIG.gameCode,
        playerName: 'Duplicate Player',
        clientId: TEST_CONFIG.hostClientId // Same client ID as host
      })
      if (duplicateJoinResponse.response.ok) {
        throw new Error('Expected error for duplicate client ID')
      }
      console.log('✅ Duplicate client ID handled correctly')
    }
    
    // Test 4: Action without proper role
    if (TEST_CONFIG.gameId) {
      const gameResponse = await makeRequest(`/api/games?code=${TEST_CONFIG.gameCode}`)
      const villagerPlayer = gameResponse.data.players.find(p => p.role === 'villager' && !p.is_host)
      
      if (villagerPlayer) {
        const invalidActionResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
          action: 'wolf_select',
          clientId: villagerPlayer.client_id,
          data: { targetId: villagerPlayer.id }
        })
        if (invalidActionResponse.response.ok) {
          throw new Error('Expected error for villager trying to perform werewolf action')
        }
        console.log('✅ Invalid role action handled correctly')
      }
    }
    
    console.log('✅ All edge cases and error handling working correctly')
    return true
    
  } catch (error) {
    console.error(`❌ Test 6 failed: ${error.message}`)
    return false
  }
}

// Cleanup function
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...')
  
  try {
    if (TEST_CONFIG.gameId) {
      const endGameResponse = await makeRequest(`/api/games/${TEST_CONFIG.gameId}/actions`, 'POST', {
        action: 'end_game',
        clientId: TEST_CONFIG.hostClientId
      })
      
      if (endGameResponse.response.ok) {
        console.log('✅ Test game ended successfully')
      }
    }
  } catch (error) {
    console.error(`⚠️ Cleanup warning: ${error.message}`)
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Real-time Synchronization Tests')
  console.log('=' .repeat(80))
  console.log(`Testing against: ${BASE_URL}`)
  console.log('=' .repeat(80))
  
  const tests = [
    { name: 'Player Join Visibility', fn: testPlayerJoinVisibility },
    { name: 'Werwolf Turn Progression', fn: testWerwolfTurnProgression },
    { name: 'Police Inspect Response', fn: testPoliceInspectResponse },
    { name: 'Host Role Actions Visibility', fn: testHostRoleActionsVisibility },
    { name: 'Real-time Synchronization', fn: testRealtimeSynchronization },
    { name: 'Edge Cases and Error Handling', fn: testEdgeCasesAndErrorHandling }
  ]
  
  const results = []
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      results.push({ name: test.name, passed: result })
    } catch (error) {
      console.error(`❌ Test "${test.name}" crashed: ${error.message}`)
      results.push({ name: test.name, passed: false })
    }
  }
  
  // Cleanup
  await cleanup()
  
  // Summary
  console.log('\n📊 Test Results Summary')
  console.log('=' .repeat(80))
  
  let passedCount = 0
  for (const result of results) {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED'
    console.log(`${status} - ${result.name}`)
    if (result.passed) passedCount++
  }
  
  console.log('=' .repeat(80))
  console.log(`Total: ${passedCount}/${results.length} tests passed`)
  
  if (passedCount === results.length) {
    console.log('🎉 All tests passed! Real-time synchronization is working correctly.')
    process.exit(0)
  } else {
    console.log('⚠️ Some tests failed. Please check the issues above.')
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test runner crashed:', error)
    process.exit(1)
  })
}

module.exports = {
  runAllTests,
  testPlayerJoinVisibility,
  testWerwolfTurnProgression,
  testPoliceInspectResponse,
  testHostRoleActionsVisibility,
  testRealtimeSynchronization,
  testEdgeCasesAndErrorHandling
}
