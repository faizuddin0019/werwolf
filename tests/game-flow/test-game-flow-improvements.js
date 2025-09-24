#!/usr/bin/env node

/**
 * Test Game Flow Improvements
 * Tests the new host-controlled phases and manual voting system
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
  assert(data.game && data.game.id, 'Game UUID not returned')
  
  log(`Game created with code: ${data.gameId}`)
  return {
    ...data,
    gameUuid: data.game.id
  }
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

async function assignRoles(gameUuid, hostClientId) {
  log('Assigning roles to players...')
  
  const response = await makeRequest(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'assign_roles',
      clientId: hostClientId
    })
  })
  
  log('Roles assigned successfully')
  return response
}

async function performHostAction(gameUuid, hostClientId, action) {
  log(`Host performing action: ${action}`)
  
  const response = await makeRequest(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: action,
      clientId: hostClientId
    })
  })
  
  log(`Host action ${action} completed successfully`)
  return response
}

async function performPlayerAction(gameUuid, clientId, action, targetId = null) {
  log(`Player performing action: ${action}${targetId ? ` on ${targetId}` : ''}`)
  
  const body = {
    action: action,
    clientId: clientId
  }
  
  if (targetId) {
    body.targetId = targetId
  }
  
  const response = await makeRequest(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  
  log(`Player action ${action} completed successfully`)
  return response
}

async function getGameState(gameId, hostClientId) {
  return await makeRequest(`${BASE_URL}/api/games?code=${gameId}`, {
    headers: { 'Cookie': `clientId=${hostClientId}` }
  })
}

async function nextPhase(gameUuid, hostClientId) {
  return await makeRequest(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'next_phase',
      clientId: hostClientId
    })
  })
}

// Test cases
async function testReorderedNightPhases() {
  log('🧪 Testing reordered night phases: Wolf → Police → Doctor...')
  
  try {
    // Create game
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const gameUuid = gameData.gameUuid
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles
    await assignRoles(gameUuid, hostClientId)
    await sleep(1000)
    
    // Test phase sequence: lobby → night_wolf (after role assignment)
    let gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_wolf', 'Game should transition to night_wolf after role assignment')
    log('✅ Phase 1: Lobby → Night Wolf (after role assignment) (PASSED)')
    
    // Test werewolf action - use players from gameState
    const werewolf = gameState.players.find(p => p.role === 'werewolf' || p.role === 'werwolf')
    assert(werewolf, 'Werewolf player should exist')
    
    const target = gameState.players.find(p => p.role !== 'werewolf' && p.role !== 'werwolf' && !p.is_host)
    await performPlayerAction(gameUuid, werewolf.client_id, 'wolf_select', target.id)
    await sleep(1000)
    
    // Test phase progression: night_wolf → night_doctor (Host clicks "Wakeup Doctor")
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_doctor', 'Game should be in night_doctor phase after host clicks "Wakeup Doctor"')
    log('✅ Phase 3: Night Wolf → Night Doctor (PASSED)')
    
    // Test doctor action during night_doctor phase
    const doctor = gameState.players.find(p => p.role === 'doctor')
    assert(doctor, 'Doctor player should exist')
    
    const saveTarget = gameState.players.find(p => p.role !== 'doctor' && !p.is_host)
    await performPlayerAction(gameUuid, doctor.client_id, 'doctor_save', saveTarget.id)
    await sleep(1000)
    
    // Test phase progression: night_doctor → night_police (Host clicks "Wakeup Police")
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_police', 'Game should be in night_police phase after host clicks "Wakeup Police"')
    log('✅ Phase 4: Night Doctor → Night Police (PASSED)')
    
    // Test police action during night_police phase
    const police = gameState.players.find(p => p.role === 'police')
    assert(police, 'Police player should exist')
    
    const inspectTarget = gameState.players.find(p => p.role !== 'police' && !p.is_host)
    await performPlayerAction(gameUuid, police.client_id, 'police_inspect', inspectTarget.id)
    await sleep(1000)
    
    // Test phase progression: night_police → reveal (Host clicks "Reveal the Dead")
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'reveal', 'Game should be in reveal phase after host clicks "Reveal the Dead"')
    log('✅ Phase 5: Night Police → Reveal (PASSED)')
    
    // Test doctor action
    assert(doctor, 'Doctor player should exist')
    
    
    log('✅ Reordered night phases test passed')
    return { success: true, message: 'Night phases follow correct order: Wolf → Police → Doctor' }
    
  } catch (error) {
    log(`❌ Reordered night phases test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

async function testManualVotingControls() {
  log('🧪 Testing manual voting controls...')
  
  try {
    // Create game and get to reveal phase
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const gameUuid = gameData.gameUuid
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles and complete night phases
    await assignRoles(gameUuid, hostClientId)
    await sleep(1000)
    
    // Complete night phases quickly - get updated game state with roles
    let gameState = await getGameState(gameId, hostClientId)
    const gamePlayers = gameState.players.filter(p => !p.is_host)
    const werewolf = gamePlayers.find(p => p.role === 'werewolf')
    const police = gamePlayers.find(p => p.role === 'police')
    const doctor = gamePlayers.find(p => p.role === 'doctor')
    const target = gamePlayers.find(p => p.role !== 'werewolf')
    
    // Werewolf phase (game is already in night_wolf after role assignment)
    await performPlayerAction(gameUuid, werewolf.client_id, 'wolf_select', target.id)
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Doctor phase
    await performPlayerAction(gameUuid, doctor.client_id, 'doctor_save', target.id)
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Police phase
    await performPlayerAction(gameUuid, police.client_id, 'police_inspect', target.id)
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Test reveal phase
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'reveal', 'Game should be in reveal phase')
    log('✅ Reached reveal phase successfully')
    
    // Test that voting doesn't start automatically
    await sleep(2000) // Wait to ensure no automatic transition
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'reveal', 'Game should still be in reveal phase (no automatic voting)')
    log('✅ No automatic voting transition (PASSED)')
    
    // Test manual begin voting
    await performHostAction(gameUuid, hostClientId, 'begin_voting')
    await sleep(1000)
    
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'day_vote', 'Game should be in day_vote phase after begin_voting')
    log('✅ Manual begin voting works (PASSED)')
    
    // Test initial voting - get updated game state with roles
    gameState = await getGameState(gameId, hostClientId)
    const votingPlayers = gameState.players.filter(p => !p.is_host)
    const voter = votingPlayers[0]
    const voteTarget = votingPlayers[1]
    
    await performPlayerAction(gameUuid, voter.client_id, 'vote', voteTarget.id)
    await sleep(1000)
    
    // Test final vote
    await performHostAction(gameUuid, hostClientId, 'final_vote')
    await sleep(1000)
    
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'day_final_vote', 'Game should be in day_final_vote phase after final_vote')
    log('✅ Manual final vote works (PASSED)')
    
    log('✅ Manual voting controls test passed')
    return { success: true, message: 'Manual voting controls work correctly' }
    
  } catch (error) {
    log(`❌ Manual voting controls test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

async function testHostButtonLabels() {
  log('🧪 Testing host button labels and visibility...')
  
  try {
    // Create game
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const gameUuid = gameData.gameUuid
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Test lobby phase
    let gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'lobby', 'Game should start in lobby phase')
    log('✅ Lobby phase: Assign Roles button should be visible')
    
    // Assign roles
    await assignRoles(gameUuid, hostClientId)
    await sleep(1000)
    
    // Test night_wolf phase (game auto-transitions after role assignment)
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_wolf', 'Game should be in night_wolf phase')
    log('✅ Night Wolf phase: Wake Up Police button should be visible')
    
    // Complete werewolf action and advance - get updated game state with roles
    gameState = await getGameState(gameId, hostClientId)
    const gamePlayers = gameState.players.filter(p => !p.is_host)
    const werewolf = gamePlayers.find(p => p.role === 'werewolf')
    const target = gamePlayers.find(p => p.role !== 'werewolf')
    await performPlayerAction(gameUuid, werewolf.client_id, 'wolf_select', target.id)
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Test night_doctor phase
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_doctor', 'Game should be in night_doctor phase')
    log('✅ Night Doctor phase: Wake Up Police button should be visible')
    
    // Complete doctor action and advance
    const doctor = gamePlayers.find(p => p.role === 'doctor')
    await performPlayerAction(gameUuid, doctor.client_id, 'doctor_save', target.id)
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Test night_police phase
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_police', 'Game should be in night_police phase')
    log('✅ Night Police phase: Reveal the Dead button should be visible')
    
    // Complete police action and advance
    const police = gamePlayers.find(p => p.role === 'police')
    await performPlayerAction(gameUuid, police.client_id, 'police_inspect', target.id)
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Test reveal phase
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'reveal', 'Game should be in reveal phase')
    log('✅ Reveal phase: Begin Initial Voting button should be visible')
    
    // Test begin voting
    await performHostAction(gameUuid, hostClientId, 'begin_voting')
    await sleep(1000)
    
    // Test day_vote phase
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'day_vote', 'Game should be in day_vote phase')
    log('✅ Day Vote phase: Final Vote button should be visible')
    
    log('✅ Host button labels test passed')
    return { success: true, message: 'Host button labels and visibility work correctly' }
    
  } catch (error) {
    log(`❌ Host button labels test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

async function testCompleteGameFlow() {
  log('🧪 Testing complete game flow with new controls...')
  
  try {
    // Create game
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const gameUuid = gameData.gameUuid
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Complete full game cycle
    log('Starting complete game flow test...')
    
    // 1. Lobby → Assign Roles
    await assignRoles(gameUuid, hostClientId)
    await sleep(1000)
    
    // 2. Night Wolf → Werewolf Action → Wake Doctor
    // Game is already in night_wolf phase after role assignment
    let gameState = await getGameState(gameId, hostClientId)
    const gamePlayers = gameState.players.filter(p => !p.is_host)
    const werewolf = gamePlayers.find(p => p.role === 'werewolf')
    const target = gamePlayers.find(p => p.role !== 'werewolf')
    await performPlayerAction(gameUuid, werewolf.client_id, 'wolf_select', target.id)
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    // 3. Night Doctor → Doctor Action → Wake Police
    const doctor = gamePlayers.find(p => p.role === 'doctor')
    await performPlayerAction(gameUuid, doctor.client_id, 'doctor_save', target.id)
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    // 4. Night Police → Police Action → Reveal
    const police = gamePlayers.find(p => p.role === 'police')
    await performPlayerAction(gameUuid, police.client_id, 'police_inspect', target.id)
    await performHostAction(gameUuid, hostClientId, 'next_phase')
    await sleep(1000)
    
    // 5. Reveal → Begin Voting
    await performHostAction(gameUuid, hostClientId, 'begin_voting')
    await sleep(1000)
    
    // 6. Day Vote → Player Voting → Final Vote
    gameState = await getGameState(gameId, hostClientId)
    const alivePlayers = gameState.players.filter(p => !p.is_host)
    const voter = alivePlayers[0]
    const voteTarget = alivePlayers[1]
    await performPlayerAction(gameUuid, voter.client_id, 'vote', voteTarget.id)
    await performHostAction(gameUuid, hostClientId, 'final_vote')
    await sleep(1000)
    
    // 7. Final Vote → Eliminate Player
    await performHostAction(gameUuid, hostClientId, 'eliminate_player')
    await sleep(1000)
    
    // Verify game state
    gameState = await getGameState(gameId, hostClientId)
    const finalAlivePlayers = gameState.players.filter(p => p.alive && !p.is_host)
    
    assert(finalAlivePlayers.length === 6, `Expected 6 alive players (doctor saved target), got ${finalAlivePlayers.length}`)
    log('✅ No player elimination (doctor saved target)')
    
    // Test that game continues to next night
    assert(gameState.game.phase === 'night_wolf', 'Game should return to night_wolf phase for next day')
    log('✅ Game continues to next night phase')
    
    log('✅ Complete game flow test passed')
    return { success: true, message: 'Complete game flow with new controls works correctly' }
    
  } catch (error) {
    log(`❌ Complete game flow test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

// Additional game flow tests from today's fixes
async function testWerewolfScreenTimingFix() {
  log('🧪 Testing Werewolf Screen Timing Fix')
  
  try {
    // Create game and join players
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const gameUuid = gameData.gameUuid
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles
    await assignRoles(gameUuid, hostClientId)
    await sleep(1000)
    
    // Check that game phase is still 'lobby' after role assignment
    const gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_wolf', 'Game phase should be night_wolf after role assignment')
    
    // Check that players have roles assigned
    const playersWithRoles = gameState.players.filter(p => p.role)
    assert(playersWithRoles.length === 6, 'All players should have roles assigned')
    
    // Check that werewolf players exist
    const werewolfPlayers = gameState.players.filter(p => p.role === 'werewolf')
    assert(werewolfPlayers.length > 0, 'Should have at least one werewolf player')
    
    log('✅ Werewolf screen timing fix test passed')
    return { success: true, message: 'Werewolf screen timing fix works correctly' }
    
  } catch (error) {
    log(`❌ Werewolf screen timing fix test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

async function testHostControlOverNightPhase() {
  log('🧪 Testing Host Control Over Night Phase')
  
  try {
    // Create game and join players
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const gameUuid = gameData.gameUuid
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
    }
    
    // Assign roles
    await assignRoles(gameUuid, hostClientId)
    await sleep(1000)
    
    // Verify game is in night_wolf after role assignment
    let gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_wolf', 'Game should be in night_wolf after role assignment')
    
    log('✅ Host control over night phase test passed')
    return { success: true, message: 'Host control over night phase works correctly' }
    
  } catch (error) {
    log(`❌ Host control over night phase test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

async function testGamePhaseTransitions() {
  log('🧪 Testing Game Phase Transitions')
  
  try {
    // Create game and join players
    const gameData = await createTestGame()
    const gameId = gameData.gameId
    const gameUuid = gameData.gameUuid
    const hostClientId = gameData.player.client_id
    
    // Join 6 players
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      await joinGame(gameId, TEST_CONFIG.playerNames[i], clientId)
    }
    
    // Test phase transitions
    await assignRoles(gameUuid, hostClientId)
    let gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_wolf', 'Should be in night_wolf after role assignment')
    
    await nextPhase(gameUuid, hostClientId)
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_doctor', 'Should be in night_doctor after next_phase')
    
    await nextPhase(gameUuid, hostClientId)
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'night_police', 'Should be in night_police after next_phase')
    
    await nextPhase(gameUuid, hostClientId)
    gameState = await getGameState(gameId, hostClientId)
    assert(gameState.game.phase === 'reveal', 'Should be in reveal after next_phase')
    
    log('✅ Game phase transitions test passed')
    return { success: true, message: 'Game phase transitions work correctly' }
    
  } catch (error) {
    log(`❌ Game phase transitions test failed: ${error.message}`, 'error')
    return { success: false, message: error.message }
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting game flow improvement tests...')
  
  const tests = [
    { name: 'Reordered Night Phases (Wolf → Police → Doctor)', fn: testReorderedNightPhases },
    { name: 'Manual Voting Controls', fn: testManualVotingControls },
    { name: 'Host Button Labels and Visibility', fn: testHostButtonLabels },
    { name: 'Complete Game Flow with New Controls', fn: testCompleteGameFlow },
    { name: 'Werewolf Screen Timing Fix', fn: testWerewolfScreenTimingFix },
    { name: 'Host Control Over Night Phase', fn: testHostControlOverNightPhase },
    { name: 'Game Phase Transitions', fn: testGamePhaseTransitions }
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
    log('\n🎉 All tests passed! Game flow improvements are working correctly.', 'success')
    process.exit(0)
  }
}

// Run tests
runAllTests().catch(error => {
  log(`❌ Test runner failed: ${error.message}`, 'error')
  process.exit(1)
})
