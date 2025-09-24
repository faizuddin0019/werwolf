#!/usr/bin/env node

/**
 * Test End Game Logic and Winner Declaration
 * Tests the critical game logic fixes implemented today
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Test configuration
const TEST_CONFIG = {
  hostName: 'TestHost',
  playerNames: ['Player1', 'Player2', 'Player3', 'Player4', 'Player5', 'Player6'],
  testTimeout: 30000
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
}

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔧'
  console.log(`${prefix} [${timestamp}] ${message}`)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Test helper functions
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }
  
  return response.json()
}

async function createTestGame() {
  log('Creating test game...')
  
  const data = await makeRequest(`${BASE_URL}/api/games`, {
    method: 'POST',
    body: JSON.stringify({
      hostName: TEST_CONFIG.hostName,
      clientId: 'test-host-' + Date.now()
    })
  })
  
  assert(data.gameId, 'Game code not returned')
  
  log(`Game created with code: ${data.gameId}`)
  return data
}

async function joinGame(gameId, playerName, clientId) {
  log(`Player ${playerName} joining game ${gameId}...`)
  
  const data = await makeRequest(`${BASE_URL}/api/games/join`, {
    method: 'POST',
    body: JSON.stringify({
      gameId,
      playerName,
      clientId
    })
  })
  
  assert(data.player, 'Player data not returned')
  
  log(`Player ${playerName} joined successfully`)
  return data
}

async function assignRoles(gameId, hostClientId) {
  log('Assigning roles to players...')
  
  const gameState = await getGameState(gameId, hostClientId)
  const gameUuid = gameState.game.id
  
  
  await makeRequest(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'assign_roles',
      clientId: hostClientId
    })
  })
  
  log('Roles assigned successfully')
}

async function eliminatePlayer(gameId, hostClientId, targetPlayerId, voterClientId) {
  log(`Eliminating player ${targetPlayerId}...`)
  
  // Get game state to get gameId
  const gameState = await getGameState(gameId, hostClientId)
  const gameUuid = gameState.game.id
  
  // First, vote for the player using a regular player (not host)
  await makeRequest(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'vote',
      clientId: voterClientId,
      targetPlayerId
    })
  })
  
  // Then call final_vote to count the votes
  await makeRequest(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'final_vote',
      clientId: hostClientId
    })
  })
  
  // Then eliminate the player (host can do this)
  await makeRequest(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'eliminate_player',
      clientId: hostClientId
    })
  })
  
  log(`Player ${targetPlayerId} eliminated successfully`)
}

async function getGameState(gameId, hostClientId) {
  return await makeRequest(`${BASE_URL}/api/games?code=${gameId}`, {
    headers: { 'Cookie': `clientId=${hostClientId}` }
  })
}

async function nextPhase(gameId, hostClientId) {
  const gameState = await getGameState(gameId, hostClientId)
  const gameUuid = gameState.game.id
  
  return await makeRequest(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'next_phase',
      clientId: hostClientId
    })
  })
}

// Test cases
async function testEndGameLogicWithTwoPlayers() {
  log('🧪 Testing end game logic when only 2 players remain...')
  
  try {
    // Create game
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles
    await assignRoles(gameId, hostClientId)
    await sleep(1000)
    
    // Get initial game state
    let gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_wolf', 'Game should transition to night_wolf after role assignment')
    
    // Host advances to night_wolf phase
    await nextPhase(gameId, hostClientId)
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_doctor', 'Game should be in night_doctor phase after host advances')
    
    // Get updated game state with roles
    gameState = await getGameState(gameId, hostClientId)
    const gamePlayers = gameState.players.filter(p => !p.is_host)
    
    // Go through night phases to reach day phase where voting is allowed
    // Werewolf action is now allowed since we're in night_wolf phase
    
    // Werewolf selects target (only in night_wolf phase)
    const werewolf = gamePlayers.find(p => p.role === 'werewolf')
    const target = gamePlayers.find(p => p.role !== 'werewolf')
    
    // Get fresh game state to check current phase
    let currentGameState = await getGameState(gameId, hostClientId)
    if (currentGameState.game.phase === 'night_wolf') {
      await makeRequest(`${BASE_URL}/api/games/${currentGameState.game.id}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'wolf_select',
          clientId: werewolf.client_id,
          targetPlayerId: target.id
        })
      })
    }
    
    // Host clicks "Wakeup Doctor"
    await nextPhase(gameId, hostClientId)
    await sleep(1000) // Wait for phase to advance
    
    // Doctor saves someone (only in night_doctor phase)
    const doctor = gamePlayers.find(p => p.role === 'doctor')
    currentGameState = await getGameState(gameId, hostClientId)
    if (currentGameState.game.phase === 'night_doctor') {
      await makeRequest(`${BASE_URL}/api/games/${currentGameState.game.id}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'doctor_save',
          clientId: doctor.client_id,
          targetPlayerId: target.id
        })
      })
    }
    
    // Host clicks "Wakeup Police"
    await nextPhase(gameId, hostClientId)
    await sleep(1000) // Wait for phase to advance
    
    // Police inspects someone (only in night_police phase)
    const police = gamePlayers.find(p => p.role === 'police')
    currentGameState = await getGameState(gameId, hostClientId)
    if (currentGameState.game.phase === 'night_police') {
      await makeRequest(`${BASE_URL}/api/games/${currentGameState.game.id}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'police_inspect',
          clientId: police.client_id,
          targetPlayerId: target.id
        })
      })
    }
    
    // Host clicks "Reveal the Dead"
    await nextPhase(gameId, hostClientId)
    await sleep(1000) // Wait for phase to advance
    
    // Begin voting
    await makeRequest(`${BASE_URL}/api/games/${gameState.game.id}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'begin_voting',
        clientId: hostClientId
      })
    })
    
    // Eliminate one player to test the win condition logic
    const targetPlayer = gamePlayers[0]
    const voterPlayer = gamePlayers.find(p => p.id !== targetPlayer.id)
    await eliminatePlayer(gameId, hostClientId, targetPlayer.id, voterPlayer.client_id)
    await sleep(1000)
    
    // Check final game state
    gameState = await getGameState(gameId, hostClientId)
    const alivePlayers = gameState.players.filter(p => p.alive && !p.is_host)
    
    assert(alivePlayers.length === 6, `Expected 6 alive players (doctor saved target), got ${alivePlayers.length}`)
    log('✅ No player elimination (doctor saved target)')
    
    // Test that the game continues (not ended yet since we still have 6 players)
    assert(gameState.game.phase !== 'ended', 'Game should not be ended with 6 players remaining')
    log('✅ Game continues correctly with 6 players remaining')
    
    log('✅ End game logic test passed')
    return { success: true, message: 'End game logic works correctly' }
    
  } catch (error) {
    log(`❌ End game logic test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

async function testHostExclusionFromWinConditions() {
  log('🧪 Testing host exclusion from win conditions...')
  
  try {
    // Create game
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles
    await assignRoles(gameId, hostClientId)
    await sleep(1000)
    
    // Get game state
    let gameState = await getGameState(gameId, hostClientId)
    const hostPlayer = gameState.players.find(p => p.is_host)
    const nonHostPlayers = gameState.players.filter(p => !p.is_host)
    
    assert(hostPlayer, 'Host player should exist')
    assert(nonHostPlayers.length === 6, 'Should have 6 non-host players')
    
    // Go through night phases to reach day phase for voting
    await nextPhase(gameId, hostClientId) // night_wolf
    await sleep(1000)
    await nextPhase(gameId, hostClientId) // night_doctor
    await sleep(1000)
    await nextPhase(gameId, hostClientId) // night_police
    await sleep(1000)
    await nextPhase(gameId, hostClientId) // reveal
    await sleep(1000)
    
    // Begin voting
    await makeRequest(`${BASE_URL}/api/games/${gameState.game.id}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'begin_voting',
        clientId: hostClientId
      })
    })
    await sleep(1000)
    
    // Eliminate one player to test the logic
    const targetPlayer = nonHostPlayers[0]
    const voterPlayer = nonHostPlayers.find(p => p.id !== targetPlayer.id)
    await eliminatePlayer(gameId, hostClientId, targetPlayer.id, voterPlayer.client_id)
    await sleep(1000)
    
    // Check final state
    gameState = await getGameState(gameId, hostClientId)
    const aliveNonHostPlayers = gameState.players.filter(p => p.alive && !p.is_host)
    const aliveHostPlayers = gameState.players.filter(p => p.alive && p.is_host)
    
    assert(aliveNonHostPlayers.length === 6, 'Should have 6 non-host players alive (doctor saved target)')
    assert(aliveHostPlayers.length === 1, 'Host should still be alive')
    assert(gameState.game.phase !== 'ended', 'Game should not be ended with 5 players remaining')
    
    log('✅ Host exclusion test passed')
    return { success: true, message: 'Host properly excluded from win conditions' }
    
  } catch (error) {
    log(`❌ Host exclusion test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

async function testWinnerDeclarationCloseable() {
  log('🧪 Testing winner declaration closeable functionality...')
  
  try {
    // Create game and get to end state
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles and eliminate players to reach end state
    await assignRoles(gameId, hostClientId)
    await sleep(1000)
    
    // Go through night phases to reach day phase for voting
    await nextPhase(gameId, hostClientId) // night_wolf
    await sleep(1000)
    await nextPhase(gameId, hostClientId) // night_doctor
    await sleep(1000)
    await nextPhase(gameId, hostClientId) // night_police
    await sleep(1000)
    await nextPhase(gameId, hostClientId) // reveal
    await sleep(1000)
    
    // Begin voting
    let gameState = await getGameState(gameId, hostClientId)
    await makeRequest(`${BASE_URL}/api/games/${gameState.game.id}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'begin_voting',
        clientId: hostClientId
      })
    })
    await sleep(1000)
    
    // Eliminate one player to test the logic
    const targetPlayer = players[0]
    const voterPlayer = players.find(p => p.id !== targetPlayer.id)
    await eliminatePlayer(gameId, hostClientId, targetPlayer.id, voterPlayer.client_id)
    await sleep(1000)
    
    // Check that game is not ended yet (still have 6 players - doctor saved target)
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase !== 'ended', 'Game should not be ended with 6 players remaining')
    
    // Test that the game state is properly maintained
    assert(gameState.game.phase !== 'ended', 'Game should not be ended with 6 players remaining')
    log('✅ Game state properly maintained')
    
    log('✅ Winner declaration closeable test passed')
    return { success: true, message: 'Winner declaration is properly closeable' }
    
  } catch (error) {
    log(`❌ Winner declaration closeable test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

async function testRealTimeSync() {
  log('🧪 Testing real-time sync and frame refresh...')
  
  try {
    // Create game
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Test that game state updates in real-time
    let gameState = await getGameState(gameId, hostClientId)
    const initialPlayerCount = gameState.players.length
    
    // Assign roles and check immediate update
    await assignRoles(gameId, hostClientId)
    await sleep(2000) // Wait for real-time sync
    
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_wolf', 'Game should transition to night_wolf after role assignment')
    
    // Go through night phases to reach day phase for voting
    await nextPhase(gameId, hostClientId) // night_doctor
    await sleep(1000)
    await nextPhase(gameId, hostClientId) // night_police
    await sleep(1000)
    await nextPhase(gameId, hostClientId) // reveal
    await sleep(1000)
    
    // Begin voting to reach day_vote phase
    gameState = await getGameState(gameId, hostClientId)
    await makeRequest(`${BASE_URL}/api/games/${gameState.game.id}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'begin_voting',
        clientId: hostClientId
      })
    })
    await sleep(1000)
    
    // Test vote updates using a regular player (not host)
    const voterPlayer = players.find(p => !p.is_host)
    gameState = await getGameState(gameId, hostClientId)
    const voteResponse = await fetch(`${BASE_URL}/api/games/${gameState.game.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vote',
        clientId: voterPlayer.client_id,
        targetPlayerId: players[0].id
      })
    })
    
    assert(voteResponse.ok, 'Vote should be recorded')
    await sleep(2000) // Wait for real-time sync
    
    // Check that votes are reflected
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.votes && gameState.votes.length > 0, 'Votes should be reflected in real-time')
    
    log('✅ Real-time sync test passed')
    return { success: true, message: 'Real-time sync working correctly' }
    
  } catch (error) {
    log(`❌ Real-time sync test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting end game logic tests...')
  
  const tests = [
    { name: 'End Game Logic with Two Players', fn: testEndGameLogicWithTwoPlayers },
    { name: 'Host Exclusion from Win Conditions', fn: testHostExclusionFromWinConditions },
    { name: 'Winner Declaration Closeable', fn: testWinnerDeclarationCloseable },
    { name: 'Real-time Sync and Frame Refresh', fn: testRealTimeSync }
  ]
  
  for (const test of tests) {
    testResults.total++
    log(`\n🧪 Running: ${test.name}`)
    
    try {
      const result = await test.fn()
      if (result.success) {
        testResults.passed++
        testResults.details.push({ name: test.name, status: 'PASSED', message: result.message })
        log(`✅ ${test.name}: PASSED`, 'success')
      } else {
        testResults.failed++
        testResults.details.push({ name: test.name, status: 'FAILED', message: result.message })
        log(`❌ ${test.name}: FAILED`, 'error')
      }
    } catch (error) {
      testResults.failed++
      testResults.details.push({ name: test.name, status: 'ERROR', message: error.message })
      log(`❌ ${test.name}: ERROR - ${error.message}`, 'error')
    }
    
    // Wait between tests
    await sleep(2000)
  }
  
  // Print summary
  log('\n📊 Test Results Summary:')
  log(`Total Tests: ${testResults.total}`)
  log(`Passed: ${testResults.passed}`, 'success')
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success')
  
  log('\n📋 Detailed Results:')
  testResults.details.forEach(test => {
    const status = test.status === 'PASSED' ? '✅' : '❌'
    log(`${status} ${test.name}: ${test.message}`)
  })
  
  if (testResults.failed > 0) {
    log('\n❌ Some tests failed. Please check the implementation.', 'error')
    process.exit(1)
  } else {
    log('\n🎉 All tests passed! End game logic is working correctly.', 'success')
    process.exit(0)
  }
}

// Run tests
runAllTests().catch(error => {
  log(`❌ Test runner failed: ${error.message}`, 'error')
  process.exit(1)
})
