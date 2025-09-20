#!/usr/bin/env node

/**
 * Test End Game Logic and Winner Declaration
 * Tests the critical game logic fixes implemented today
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.error('You can find these values in your Supabase project settings')
  console.error('')
  console.error('Example:')
  console.error('export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"')
  console.error('export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"')
  console.error('')
  console.error('Or create a .env.local file with these variables')
  process.exit(1)
}

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
async function createTestGame() {
  log('Creating test game...')
  
  const response = await fetch(`${BASE_URL}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostName: TEST_CONFIG.hostName,
      clientId: 'test-host-' + Date.now()
    })
  })
  
  assert(response.ok, 'Failed to create test game')
  const data = await response.json()
  assert(data.gameCode, 'Game code not returned')
  
  log(`Game created with code: ${data.gameCode}`)
  return data
}

async function joinGame(gameCode, playerName, clientId) {
  log(`Player ${playerName} joining game ${gameCode}...`)
  
  const response = await fetch(`${BASE_URL}/api/games/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameCode,
      playerName,
      clientId
    })
  })
  
  assert(response.ok, `Failed to join game: ${await response.text()}`)
  const data = await response.json()
  assert(data.player, 'Player data not returned')
  
  log(`Player ${playerName} joined successfully`)
  return data
}

async function assignRoles(gameCode, hostClientId) {
  log('Assigning roles to players...')
  
  const response = await fetch(`${BASE_URL}/api/games/${gameCode}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'assign_roles',
      clientId: hostClientId
    })
  })
  
  assert(response.ok, 'Failed to assign roles')
  log('Roles assigned successfully')
}

async function eliminatePlayer(gameCode, hostClientId, targetPlayerId) {
  log(`Eliminating player ${targetPlayerId}...`)
  
  // First, vote for the player
  const voteResponse = await fetch(`${BASE_URL}/api/games/${gameCode}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'vote',
      clientId: hostClientId,
      targetPlayerId
    })
  })
  
  assert(voteResponse.ok, 'Failed to vote for player')
  
  // Then eliminate the player
  const eliminateResponse = await fetch(`${BASE_URL}/api/games/${gameCode}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'eliminate_player',
      clientId: hostClientId
    })
  })
  
  assert(eliminateResponse.ok, 'Failed to eliminate player')
  log(`Player ${targetPlayerId} eliminated successfully`)
}

async function getGameState(gameCode) {
  const response = await fetch(`${BASE_URL}/api/games/${gameCode}`)
  assert(response.ok, 'Failed to get game state')
  return await response.json()
}

// Test cases
async function testEndGameLogicWithTwoPlayers() {
  log('🧪 Testing end game logic when only 2 players remain...')
  
  try {
    // Create game
    const gameData = await createTestGame()
    const gameCode = gameData.gameCode
    const hostClientId = 'test-host-' + Date.now()
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameCode, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles
    await assignRoles(gameCode, hostClientId)
    await sleep(1000)
    
    // Get initial game state
    let gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'lobby', 'Game should stay in lobby after role assignment')
    
    // Host advances to night_wolf phase
    await nextPhase(gameCode, hostClientId)
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_wolf', 'Game should be in night_wolf phase after host advances')
    
    // Eliminate players one by one until only 2 remain
    for (let i = 0; i < 4; i++) {
      const targetPlayer = players[i]
      await eliminatePlayer(gameCode, hostClientId, targetPlayer.id)
      await sleep(1000)
    }
    
    // Check final game state
    gameState = await getGameState(gameCode)
    const alivePlayers = gameState.players.filter(p => p.alive && !p.is_host)
    
    assert(alivePlayers.length === 2, `Expected 2 alive players, got ${alivePlayers.length}`)
    assert(gameState.game.phase === 'ended', 'Game should be ended when only 2 players remain')
    assert(gameState.game.win_state, 'Win state should be set')
    
    // Check win condition logic
    const aliveWerewolves = alivePlayers.filter(p => p.role === 'werewolf')
    const aliveVillagers = alivePlayers.filter(p => p.role !== 'werewolf')
    
    if (aliveWerewolves.length > 0) {
      assert(gameState.game.win_state === 'werewolves', 'Werewolves should win if any are alive')
    } else {
      assert(gameState.game.win_state === 'villagers', 'Villagers should win if no werewolves are alive')
    }
    
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
    const gameCode = gameData.gameCode
    const hostClientId = 'test-host-' + Date.now()
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameCode, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles
    await assignRoles(gameCode, hostClientId)
    await sleep(1000)
    
    // Get game state
    let gameState = await getGameState(gameCode)
    const hostPlayer = gameState.players.find(p => p.is_host)
    const nonHostPlayers = gameState.players.filter(p => !p.is_host)
    
    assert(hostPlayer, 'Host player should exist')
    assert(nonHostPlayers.length === 6, 'Should have 6 non-host players')
    
    // Eliminate all non-host players
    for (const player of nonHostPlayers) {
      await eliminatePlayer(gameCode, hostClientId, player.id)
      await sleep(1000)
    }
    
    // Check final state
    gameState = await getGameState(gameCode)
    const aliveNonHostPlayers = gameState.players.filter(p => p.alive && !p.is_host)
    const aliveHostPlayers = gameState.players.filter(p => p.alive && p.is_host)
    
    assert(aliveNonHostPlayers.length === 0, 'No non-host players should be alive')
    assert(aliveHostPlayers.length === 1, 'Host should still be alive')
    assert(gameState.game.phase === 'ended', 'Game should be ended')
    assert(gameState.game.win_state === 'villagers', 'Villagers should win (no werewolves alive)')
    
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
    const gameCode = gameData.gameCode
    const hostClientId = 'test-host-' + Date.now()
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameCode, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles and eliminate players to reach end state
    await assignRoles(gameCode, hostClientId)
    await sleep(1000)
    
    for (let i = 0; i < 4; i++) {
      const targetPlayer = players[i]
      await eliminatePlayer(gameCode, hostClientId, targetPlayer.id)
      await sleep(1000)
    }
    
    // Check that game is ended
    let gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'ended', 'Game should be ended')
    assert(gameState.game.win_state, 'Win state should be set')
    
    // Test that host can end the game
    const endGameResponse = await fetch(`${BASE_URL}/api/games/${gameCode}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'end_game',
        clientId: hostClientId
      })
    })
    
    assert(endGameResponse.ok, 'Host should be able to end the game')
    
    // Verify game is properly ended
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'ended', 'Game should remain ended')
    
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
    const gameCode = gameData.gameCode
    const hostClientId = 'test-host-' + Date.now()
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameCode, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Test that game state updates in real-time
    let gameState = await getGameState(gameCode)
    const initialPlayerCount = gameState.players.length
    
    // Assign roles and check immediate update
    await assignRoles(gameCode, hostClientId)
    await sleep(2000) // Wait for real-time sync
    
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'lobby', 'Game should stay in lobby after role assignment')
    
    // Host advances to night_wolf phase
    await nextPhase(gameCode, hostClientId)
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_wolf', 'Game phase should update in real-time')
    
    // Test vote updates
    const voteResponse = await fetch(`${BASE_URL}/api/games/${gameCode}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vote',
        clientId: hostClientId,
        targetPlayerId: players[0].id
      })
    })
    
    assert(voteResponse.ok, 'Vote should be recorded')
    await sleep(2000) // Wait for real-time sync
    
    // Check that votes are reflected
    gameState = await getGameState(gameCode)
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
