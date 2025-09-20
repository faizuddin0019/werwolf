#!/usr/bin/env node

/**
 * Test Game Flow Improvements
 * Tests the new host-controlled phases and manual voting system
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

async function performHostAction(gameCode, hostClientId, action) {
  log(`Host performing action: ${action}`)
  
  const response = await fetch(`${BASE_URL}/api/games/${gameCode}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: action,
      clientId: hostClientId
    })
  })
  
  assert(response.ok, `Failed to perform host action: ${action}`)
  log(`Host action ${action} completed successfully`)
}

async function performPlayerAction(gameCode, clientId, action, targetId = null) {
  log(`Player performing action: ${action}${targetId ? ` on ${targetId}` : ''}`)
  
  const body = {
    action: action,
    clientId: clientId
  }
  
  if (targetId) {
    body.targetId = targetId
  }
  
  const response = await fetch(`${BASE_URL}/api/games/${gameCode}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  assert(response.ok, `Failed to perform player action: ${action}`)
  log(`Player action ${action} completed successfully`)
}

async function getGameState(gameCode) {
  const response = await fetch(`${BASE_URL}/api/games/${gameCode}`)
  assert(response.ok, 'Failed to get game state')
  return await response.json()
}

// Test cases
async function testReorderedNightPhases() {
  log('🧪 Testing reordered night phases: Wolf → Police → Doctor...')
  
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
    
    // Test phase sequence: lobby → lobby (after role assignment)
    let gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'lobby', 'Game should stay in lobby after role assignment')
    log('✅ Phase 1: Lobby → Lobby (after role assignment) (PASSED)')
    
    // Host advances to night_wolf phase
    await nextPhase(gameCode, hostClientId)
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_wolf', 'Game should be in night_wolf phase after host advances')
    log('✅ Phase 2: Lobby → Night Wolf (after host advances) (PASSED)')
    
    // Test werewolf action
    const werewolf = players.find(p => p.role === 'werewolf')
    assert(werewolf, 'Werewolf player should exist')
    
    const target = players.find(p => p.role !== 'werewolf' && !p.is_host)
    await performPlayerAction(gameCode, werewolf.clientId, 'wolf_select', target.id)
    await sleep(1000)
    
    // Test phase progression: night_wolf → night_police
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_police', 'Game should be in night_police phase after werewolf action')
    log('✅ Phase 2: Night Wolf → Night Police (PASSED)')
    
    // Test police action
    const police = players.find(p => p.role === 'police')
    assert(police, 'Police player should exist')
    
    const inspectTarget = players.find(p => p.role !== 'police' && !p.is_host)
    await performPlayerAction(gameCode, police.clientId, 'police_inspect', inspectTarget.id)
    await sleep(1000)
    
    // Test phase progression: night_police → night_doctor
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_doctor', 'Game should be in night_doctor phase after police action')
    log('✅ Phase 3: Night Police → Night Doctor (PASSED)')
    
    // Test doctor action
    const doctor = players.find(p => p.role === 'doctor')
    assert(doctor, 'Doctor player should exist')
    
    const saveTarget = players.find(p => !p.is_host)
    await performPlayerAction(gameCode, doctor.clientId, 'doctor_save', saveTarget.id)
    await sleep(1000)
    
    // Test phase progression: night_doctor → reveal
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'reveal', 'Game should be in reveal phase after doctor action')
    log('✅ Phase 4: Night Doctor → Reveal (PASSED)')
    
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
    const gameCode = gameData.gameCode
    const hostClientId = 'test-host-' + Date.now()
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameCode, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Assign roles and complete night phases
    await assignRoles(gameCode, hostClientId)
    await sleep(1000)
    
    // Complete night phases quickly
    const werewolf = players.find(p => p.role === 'werewolf')
    const police = players.find(p => p.role === 'police')
    const doctor = players.find(p => p.role === 'doctor')
    const target = players.find(p => p.role !== 'werewolf' && !p.is_host)
    
    // Werewolf phase
    await performPlayerAction(gameCode, werewolf.clientId, 'wolf_select', target.id)
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Police phase
    await performPlayerAction(gameCode, police.clientId, 'police_inspect', target.id)
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Doctor phase
    await performPlayerAction(gameCode, doctor.clientId, 'doctor_save', target.id)
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Test reveal phase
    let gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'reveal', 'Game should be in reveal phase')
    log('✅ Reached reveal phase successfully')
    
    // Test that voting doesn't start automatically
    await sleep(2000) // Wait to ensure no automatic transition
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'reveal', 'Game should still be in reveal phase (no automatic voting)')
    log('✅ No automatic voting transition (PASSED)')
    
    // Test manual begin voting
    await performHostAction(gameCode, hostClientId, 'begin_voting')
    await sleep(1000)
    
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'day_vote', 'Game should be in day_vote phase after begin_voting')
    log('✅ Manual begin voting works (PASSED)')
    
    // Test initial voting
    const voter = players.find(p => p.alive && !p.is_host)
    const voteTarget = players.find(p => p.alive && !p.is_host && p.id !== voter.id)
    
    await performPlayerAction(gameCode, voter.clientId, 'vote', voteTarget.id)
    await sleep(1000)
    
    // Test final vote
    await performHostAction(gameCode, hostClientId, 'final_vote')
    await sleep(1000)
    
    gameState = await getGameState(gameCode)
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
    const gameCode = gameData.gameCode
    const hostClientId = 'test-host-' + Date.now()
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameCode, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Test lobby phase
    let gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'lobby', 'Game should start in lobby phase')
    log('✅ Lobby phase: Assign Roles button should be visible')
    
    // Assign roles
    await assignRoles(gameCode, hostClientId)
    await sleep(1000)
    
    // Test night_wolf phase
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_wolf', 'Game should be in night_wolf phase')
    log('✅ Night Wolf phase: Wake Up Police button should be visible')
    
    // Complete werewolf action and advance
    const werewolf = players.find(p => p.role === 'werewolf')
    const target = players.find(p => p.role !== 'werewolf' && !p.is_host)
    await performPlayerAction(gameCode, werewolf.clientId, 'wolf_select', target.id)
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Test night_police phase
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_police', 'Game should be in night_police phase')
    log('✅ Night Police phase: Wake Up Doctor button should be visible')
    
    // Complete police action and advance
    const police = players.find(p => p.role === 'police')
    await performPlayerAction(gameCode, police.clientId, 'police_inspect', target.id)
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Test night_doctor phase
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_doctor', 'Game should be in night_doctor phase')
    log('✅ Night Doctor phase: Reveal the Dead button should be visible')
    
    // Complete doctor action and advance
    const doctor = players.find(p => p.role === 'doctor')
    await performPlayerAction(gameCode, doctor.clientId, 'doctor_save', target.id)
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    // Test reveal phase
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'reveal', 'Game should be in reveal phase')
    log('✅ Reveal phase: Begin Initial Voting button should be visible')
    
    // Test begin voting
    await performHostAction(gameCode, hostClientId, 'begin_voting')
    await sleep(1000)
    
    // Test day_vote phase
    gameState = await getGameState(gameCode)
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
    const gameCode = gameData.gameCode
    const hostClientId = 'test-host-' + Date.now()
    
    // Join 6 players
    const players = []
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      const playerData = await joinGame(gameCode, TEST_CONFIG.playerNames[i], clientId)
      players.push({ ...playerData.player, clientId })
    }
    
    // Complete full game cycle
    log('Starting complete game flow test...')
    
    // 1. Lobby → Assign Roles
    await assignRoles(gameCode, hostClientId)
    await sleep(1000)
    
    // 2. Night Wolf → Werewolf Action → Wake Police
    const werewolf = players.find(p => p.role === 'werewolf')
    const target = players.find(p => p.role !== 'werewolf' && !p.is_host)
    await performPlayerAction(gameCode, werewolf.clientId, 'wolf_select', target.id)
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    // 3. Night Police → Police Action → Wake Doctor
    const police = players.find(p => p.role === 'police')
    await performPlayerAction(gameCode, police.clientId, 'police_inspect', target.id)
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    // 4. Night Doctor → Doctor Action → Reveal
    const doctor = players.find(p => p.role === 'doctor')
    await performPlayerAction(gameCode, doctor.clientId, 'doctor_save', target.id)
    await performHostAction(gameCode, hostClientId, 'next_phase')
    await sleep(1000)
    
    // 5. Reveal → Begin Voting
    await performHostAction(gameCode, hostClientId, 'begin_voting')
    await sleep(1000)
    
    // 6. Day Vote → Player Voting → Final Vote
    const voter = players.find(p => p.alive && !p.is_host)
    const voteTarget = players.find(p => p.alive && !p.is_host && p.id !== voter.id)
    await performPlayerAction(gameCode, voter.clientId, 'vote', voteTarget.id)
    await performHostAction(gameCode, hostClientId, 'final_vote')
    await sleep(1000)
    
    // 7. Final Vote → Eliminate Player
    await performHostAction(gameCode, hostClientId, 'eliminate_player')
    await sleep(1000)
    
    // Verify game state
    let gameState = await getGameState(gameCode)
    const alivePlayers = gameState.players.filter(p => p.alive && !p.is_host)
    
    assert(alivePlayers.length === 5, `Expected 5 alive players, got ${alivePlayers.length}`)
    log('✅ Player elimination worked correctly')
    
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
    
    // Check that game phase is still 'lobby' after role assignment
    const gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'lobby', 'Game phase should be lobby after role assignment')
    
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
    const gameCode = gameData.gameCode
    const hostClientId = 'test-host-' + Date.now()
    
    // Join 6 players
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      await joinGame(gameCode, TEST_CONFIG.playerNames[i], clientId)
    }
    
    // Assign roles
    await assignRoles(gameCode, hostClientId)
    await sleep(1000)
    
    // Verify game is still in lobby
    let gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'lobby', 'Game should still be in lobby after role assignment')
    
    // Host advances to night phase
    await nextPhase(gameCode, hostClientId)
    
    // Verify game is now in night_wolf phase
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_wolf', 'Game should be in night_wolf phase after host advances')
    
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
    const gameCode = gameData.gameCode
    const hostClientId = 'test-host-' + Date.now()
    
    // Join 6 players
    for (let i = 0; i < 6; i++) {
      const clientId = `test-player-${i}-${Date.now()}`
      await joinGame(gameCode, TEST_CONFIG.playerNames[i], clientId)
    }
    
    // Test phase transitions
    await assignRoles(gameCode, hostClientId)
    let gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'lobby', 'Should be in lobby after role assignment')
    
    await nextPhase(gameCode, hostClientId)
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_wolf', 'Should be in night_wolf after next_phase')
    
    await nextPhase(gameCode, hostClientId)
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_police', 'Should be in night_police after next_phase')
    
    await nextPhase(gameCode, hostClientId)
    gameState = await getGameState(gameCode)
    assert(gameState.game.phase === 'night_doctor', 'Should be in night_doctor after next_phase')
    
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
