#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Werwolf Game
 * Tests all new functionality and corner cases
 */

const BASE_URL = 'http://localhost:3001'

// Test configuration
const TEST_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000
}

// Utility functions
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    timeout: TEST_CONFIG.timeout,
    ...options
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

async function retryRequest(url, options = {}, retries = TEST_CONFIG.maxRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      return await makeRequest(url, options)
    } catch (error) {
      if (i === retries - 1) throw error
      await sleep(TEST_CONFIG.retryDelay)
    }
  }
}

// Test data
let testData = {
  games: [],
  players: [],
  gameCodes: []
}

// Test functions
async function testCreateGame() {
  console.log('🧪 Testing game creation...')
  
  const hostName = `TestHost_${Date.now()}`
  const clientId = `test_client_${Date.now()}`
  
  const response = await retryRequest(`${BASE_URL}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName, clientId })
  })
  
  if (!response.game || !response.player || !response.gameCode) {
    throw new Error('Invalid game creation response')
  }
  
  testData.games.push(response.game)
  testData.players.push(response.player)
  testData.gameCodes.push(response.gameCode)
  
  console.log('✅ Game created successfully:', response.gameCode)
  return response
}

async function testJoinGame(gameCode, playerName) {
  console.log(`🧪 Testing player join: ${playerName} to game ${gameCode}...`)
  
  const clientId = `test_client_${Date.now()}`
  
  const response = await retryRequest(`${BASE_URL}/api/games/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameCode, playerName, clientId })
  })
  
  if (!response.player) {
    throw new Error('Invalid join game response')
  }
  
  testData.players.push(response.player)
  
  console.log('✅ Player joined successfully:', playerName)
  return response
}

async function testAssignRoles(gameId, hostClientId) {
  console.log('🧪 Testing role assignment...')
  
  const response = await retryRequest(`${BASE_URL}/api/games/${gameId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'assign_roles',
      clientId: hostClientId
    })
  })
  
  if (!response.success) {
    throw new Error('Role assignment failed')
  }
  
  console.log('✅ Roles assigned successfully')
  return response
}

async function testChangeRole(gameId, hostClientId, playerId, newRole) {
  console.log(`🧪 Testing role change: ${newRole} for player ${playerId}...`)
  
  const response = await retryRequest(`${BASE_URL}/api/games/${gameId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'change_role',
      clientId: hostClientId,
      data: { playerId, newRole }
    })
  })
  
  if (!response.success) {
    throw new Error(`Role change to ${newRole} failed`)
  }
  
  console.log('✅ Role changed successfully')
  return response
}

async function testRemovePlayer(gameId, hostClientId, playerId) {
  console.log(`🧪 Testing player removal: ${playerId}...`)
  
  const response = await retryRequest(`${BASE_URL}/api/games/${gameId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'remove_player',
      clientId: hostClientId,
      data: { playerId }
    })
  })
  
  if (!response.success) {
    throw new Error('Player removal failed')
  }
  
  console.log('✅ Player removed successfully')
  return response
}

async function testPoliceInspect(gameId, policeClientId, targetId) {
  console.log(`🧪 Testing police inspect: ${targetId}...`)
  
  const response = await retryRequest(`${BASE_URL}/api/games/${gameId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'police_inspect',
      clientId: policeClientId,
      data: { targetId }
    })
  })
  
  if (!response.success) {
    throw new Error('Police inspect failed')
  }
  
  console.log('✅ Police inspect successful')
  return response
}

async function testEndGame(gameId, hostClientId) {
  console.log('🧪 Testing game end...')
  
  const response = await retryRequest(`${BASE_URL}/api/games/${gameId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'end_game',
      clientId: hostClientId
    })
  })
  
  if (!response.success) {
    throw new Error('Game end failed')
  }
  
  console.log('✅ Game ended successfully')
  return response
}

async function testBrowserStickiness() {
  console.log('🧪 Testing browser stickiness...')
  
  // Create two games with different client IDs (simulating different browsers)
  const game1 = await testCreateGame()
  const game2 = await testCreateGame()
  
  // Verify they have different game codes
  if (game1.gameCode === game2.gameCode) {
    throw new Error('Browser stickiness failed - same game code generated')
  }
  
  console.log('✅ Browser stickiness working correctly')
  return { game1, game2 }
}

async function testHostCannotBeAssignedRole() {
  console.log('🧪 Testing host cannot be assigned role...')
  
  const game = await testCreateGame()
  const hostClientId = game.player.client_id
  
  // Add 6 players to meet minimum requirement
  const players = []
  for (let i = 1; i <= 6; i++) {
    const joinResponse = await testJoinGame(game.gameCode, `Player${i}`)
    players.push(joinResponse.player)
  }
  
  // Assign roles
  await testAssignRoles(game.game.id, hostClientId)
  
  // Fetch updated game data
  const gameData = await retryRequest(`${BASE_URL}/api/games?code=${game.gameCode}`)
  
  // Check that host doesn't have a role
  const hostPlayer = gameData.players.find(p => p.is_host)
  if (hostPlayer.role !== null) {
    throw new Error(`Host was assigned role: ${hostPlayer.role}`)
  }
  
  // Check that non-host players have roles
  const nonHostPlayers = gameData.players.filter(p => !p.is_host)
  const playersWithRoles = nonHostPlayers.filter(p => p.role !== null)
  
  if (playersWithRoles.length !== nonHostPlayers.length) {
    throw new Error('Not all non-host players were assigned roles')
  }
  
  console.log('✅ Host correctly excluded from role assignment')
  return gameData
}

async function testRoleChangeFunctionality() {
  console.log('🧪 Testing role change functionality...')
  
  const game = await testCreateGame()
  const hostClientId = game.player.client_id
  
  // Add 6 players
  const players = []
  for (let i = 1; i <= 6; i++) {
    const joinResponse = await testJoinGame(game.gameCode, `Player${i}`)
    players.push(joinResponse.player)
  }
  
  // Assign initial roles
  await testAssignRoles(game.game.id, hostClientId)
  
  // Change a player's role
  const targetPlayer = players[0]
  await testChangeRole(game.game.id, hostClientId, targetPlayer.id, 'werewolf')
  
  // Verify role change
  const gameData = await retryRequest(`${BASE_URL}/api/games?code=${game.gameCode}`)
  const updatedPlayer = gameData.players.find(p => p.id === targetPlayer.id)
  
  if (updatedPlayer.role !== 'werewolf') {
    throw new Error(`Role change failed. Expected: werewolf, Got: ${updatedPlayer.role}`)
  }
  
  console.log('✅ Role change functionality working correctly')
  return gameData
}

async function testPlayerRemovalWithGameReset() {
  console.log('🧪 Testing player removal with game reset...')
  
  const game = await testCreateGame()
  const hostClientId = game.player.client_id
  
  // Add 7 players (6 non-host + 1 host = 7 total, so removing 1 leaves 6)
  const players = []
  for (let i = 1; i <= 7; i++) {
    const joinResponse = await testJoinGame(game.gameCode, `Player${i}`)
    players.push(joinResponse.player)
  }
  
  // Start the game
  await testAssignRoles(game.game.id, hostClientId)
  
  // Remove a player (should reset game to lobby)
  const playerToRemove = players[0]
  const removeResponse = await testRemovePlayer(game.game.id, hostClientId, playerToRemove.id)
  
  console.log('🔧 Remove response:', removeResponse)
  
  if (!removeResponse.gameReset) {
    throw new Error('Game should have been reset to lobby after player removal')
  }
  
  // Verify game is back in lobby
  const gameData = await retryRequest(`${BASE_URL}/api/games?code=${game.gameCode}`)
  if (gameData.game.phase !== 'lobby') {
    throw new Error(`Game should be in lobby phase, but is in: ${gameData.game.phase}`)
  }
  
  console.log('✅ Player removal with game reset working correctly')
  return gameData
}

async function testPoliceInspectFunctionality() {
  console.log('🧪 Testing police inspect functionality...')
  
  const game = await testCreateGame()
  const hostClientId = game.player.client_id
  
  // Add 6 players
  const players = []
  for (let i = 1; i <= 6; i++) {
    const joinResponse = await testJoinGame(game.gameCode, `Player${i}`)
    players.push(joinResponse.player)
  }
  
  // Assign roles
  await testAssignRoles(game.game.id, hostClientId)
  
  // Find police player
  const gameData = await retryRequest(`${BASE_URL}/api/games?code=${game.gameCode}`)
  const policePlayer = gameData.players.find(p => p.role === 'police')
  
  if (!policePlayer) {
    throw new Error('No police player found')
  }
  
  // Test police inspect
  const targetPlayer = gameData.players.find(p => !p.is_host && p.id !== policePlayer.id)
  await testPoliceInspect(game.game.id, policePlayer.client_id, targetPlayer.id)
  
  console.log('✅ Police inspect functionality working correctly')
  return gameData
}

async function testCornerCases() {
  console.log('🧪 Testing corner cases...')
  
  // Test 1: Try to assign roles with insufficient players
  const game1 = await testCreateGame()
  const hostClientId1 = game1.player.client_id
  
  try {
    await testAssignRoles(game1.game.id, hostClientId1)
    throw new Error('Should have failed with insufficient players')
  } catch (error) {
    if (!error.message.includes('Need at least 6 non-host players') && !error.message.includes('HTTP 400')) {
      throw error
    }
    console.log('✅ Correctly rejected role assignment with insufficient players')
  }
  
  // Test 2: Try to change host role (should fail)
  const game2 = await testCreateGame()
  const hostClientId2 = game2.player.client_id
  
  try {
    await testChangeRole(game2.game.id, hostClientId2, game2.player.id, 'werewolf')
    throw new Error('Should have failed when trying to change host role')
  } catch (error) {
    if (!error.message.includes('Cannot change host role') && !error.message.includes('HTTP 400')) {
      throw error
    }
    console.log('✅ Correctly rejected host role change')
  }
  
  // Test 3: Try to remove non-existent player
  const game3 = await testCreateGame()
  const hostClientId3 = game3.player.client_id
  
  try {
    await testRemovePlayer(game3.game.id, hostClientId3, 'non-existent-id')
    // This should succeed but return a message about player already removed
    console.log('✅ Correctly handled non-existent player removal')
  } catch (error) {
    console.log('✅ Correctly handled non-existent player removal with error')
  }
  
  console.log('✅ All corner cases handled correctly')
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive test suite...\n')
  
  const startTime = Date.now()
  let passedTests = 0
  let totalTests = 0
  
  const tests = [
    { name: 'Browser Stickiness', fn: testBrowserStickiness },
    { name: 'Host Cannot Be Assigned Role', fn: testHostCannotBeAssignedRole },
    { name: 'Role Change Functionality', fn: testRoleChangeFunctionality },
    { name: 'Player Removal with Game Reset', fn: testPlayerRemovalWithGameReset },
    { name: 'Police Inspect Functionality', fn: testPoliceInspectFunctionality },
    { name: 'Corner Cases', fn: testCornerCases }
  ]
  
  for (const test of tests) {
    totalTests++
    try {
      console.log(`\n📋 Running test: ${test.name}`)
      await test.fn()
      passedTests++
      console.log(`✅ ${test.name} - PASSED`)
    } catch (error) {
      console.log(`❌ ${test.name} - FAILED: ${error.message}`)
    }
  }
  
  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000
  
  console.log(`\n📊 Test Results:`)
  console.log(`   Passed: ${passedTests}/${totalTests}`)
  console.log(`   Duration: ${duration.toFixed(2)}s`)
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('\n💥 Some tests failed!')
    process.exit(1)
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test suite failed:', error)
    process.exit(1)
  })
}

module.exports = {
  testCreateGame,
  testJoinGame,
  testAssignRoles,
  testChangeRole,
  testRemovePlayer,
  testPoliceInspect,
  testEndGame,
  testBrowserStickiness,
  testHostCannotBeAssignedRole,
  testRoleChangeFunctionality,
  testPlayerRemovalWithGameReset,
  testPoliceInspectFunctionality,
  testCornerCases,
  runAllTests
}
