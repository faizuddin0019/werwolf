#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Leave Game Functionality
 * 
 * This script tests all scenarios for the leave game feature:
 * 1. Host leaving in lobby (should end game)
 * 2. Regular player leaving in lobby (should continue game)
 * 3. Player leaving during active game (should end if < 6 players)
 * 4. Data cleanup verification
 * 5. Real-time updates and redirects
 */

const BASE_URL = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  delay: 1000
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function recordTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`PASS: ${name}`, 'success');
  } else {
    testResults.failed++;
    log(`FAIL: ${name} - ${details}`, 'error');
  }
  testResults.details.push({ name, passed, details });
}

// Test helper functions
async function createGame(hostName, clientId) {
  const result = await makeRequest(`${BASE_URL}/api/games`, {
    method: 'POST',
    body: JSON.stringify({
      hostName,
      clientId
    })
  });
  
  if (result.success && result.data.game && result.data.player) {
    return {
      gameId: result.data.game.id,
      gameCode: result.data.gameCode,
      host: result.data.player
    };
  }
  
  throw new Error(`Failed to create game: ${JSON.stringify(result.data)}`);
}

async function joinGame(gameCode, playerName, clientId) {
  const result = await makeRequest(`${BASE_URL}/api/games/join`, {
    method: 'POST',
    body: JSON.stringify({
      gameCode,
      playerName,
      clientId
    })
  });
  
  if (result.success && result.data.player) {
    return result.data.player;
  }
  
  throw new Error(`Failed to join game: ${JSON.stringify(result.data)}`);
}

async function leaveGame(gameId, clientId) {
  const result = await makeRequest(`${BASE_URL}/api/games/${gameId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'leave_game',
      clientId
    })
  });
  
  return result;
}

async function endGame(gameId, clientId) {
  const result = await makeRequest(`${BASE_URL}/api/games/${gameId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'end_game',
      clientId
    })
  });
  
  return result;
}

async function getGame(gameCode) {
  const result = await makeRequest(`${BASE_URL}/api/games?code=${gameCode}`);
  return result;
}

async function assignRoles(gameId, clientId) {
  const result = await makeRequest(`${BASE_URL}/api/games/${gameId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'assign_roles',
      clientId
    })
  });
  
  return result;
}

// Test Cases
async function testHostLeavingInLobby() {
  log('🧪 Testing: Host cannot leave game (must end game instead)');
  
  try {
    // Create game with host
    const game = await createGame('TestHost1', 'host-client-1');
    log(`Created game ${game.gameCode} with host ${game.host.name}`);
    
    // Add a few players
    await joinGame(game.gameCode, 'Player1', 'player-client-1');
    await joinGame(game.gameCode, 'Player2', 'player-client-2');
    log('Added 2 players to the game');
    
    // Verify game exists
    let gameData = await getGame(game.gameCode);
    recordTest('Game exists before host tries to leave', gameData.success && gameData.data.game);
    
    // Host tries to leave (should fail)
    const leaveResult = await leaveGame(game.gameId, game.host.client_id);
    recordTest('Host leave request is blocked', !leaveResult.success);
    recordTest('Host leave returns correct error', leaveResult.data?.error === 'Host cannot leave game. Use "End Game" instead.');
    
    // Verify game still exists
    gameData = await getGame(game.gameCode);
    recordTest('Game still exists after host leave attempt', gameData.success && gameData.data.game);
    
    // Host ends game instead
    const endResult = await endGame(game.gameId, game.host.client_id);
    recordTest('Host end game works', endResult.success);
    
    // Verify game is deleted after ending
    await sleep(1000); // Wait for cleanup
    gameData = await getGame(game.gameCode);
    recordTest('Game deleted after host ended game', !gameData.success && gameData.data?.error === 'Game not found');
    
  } catch (error) {
    recordTest('Host leaving in lobby', false, error.message);
  }
}

async function testPlayerLeavingInLobby() {
  log('🧪 Testing: Regular player leaving in lobby should continue game');
  
  try {
    // Create game with host
    const game = await createGame('TestHost2', 'host-client-2');
    log(`Created game ${game.gameCode} with host ${game.host.name}`);
    
    // Add players
    const player1 = await joinGame(game.gameCode, 'Player1', 'player-client-3');
    const player2 = await joinGame(game.gameCode, 'Player2', 'player-client-4');
    log('Added 2 players to the game');
    
    // Verify game has 3 players (host + 2 players)
    let gameData = await getGame(game.gameCode);
    recordTest('Game has 3 players before player leaves', gameData.success && gameData.data.players.length === 3);
    
    // Player leaves
    const leaveResult = await leaveGame(game.gameId, player1.client_id);
    recordTest('Player leave request successful', leaveResult.success);
    recordTest('Game continued when player left', leaveResult.data?.gameEnded === false);
    
    // Verify game still exists with 2 players
    await sleep(1000); // Wait for updates
    gameData = await getGame(game.gameCode);
    recordTest('Game still exists after player left', gameData.success && gameData.data.game);
    recordTest('Game has 2 players after player left', gameData.success && gameData.data.players.length === 2);
    
    // Clean up - end the game
    await endGame(game.gameId, game.host.client_id);
    
  } catch (error) {
    recordTest('Player leaving in lobby', false, error.message);
  }
}

async function testPlayerLeavingDuringActiveGame() {
  log('🧪 Testing: Player leaving during active game should end if < 6 players');
  
  try {
    // Create game with host
    const game = await createGame('TestHost3', 'host-client-3');
    log(`Created game ${game.gameCode} with host ${game.host.name}`);
    
    // Add exactly 5 players to make 6 total (minimum for game start)
    const players = [];
    for (let i = 1; i <= 5; i++) {
      const player = await joinGame(game.gameCode, `Player${i}`, `player-client-${i + 10}`);
      players.push(player);
    }
    log('Added 5 players to make 6 total');
    
    // Verify we have 6 players
    let gameData = await getGame(game.gameCode);
    recordTest('Game has 6 players before starting', gameData.success && gameData.data.players.length === 6);
    
    // Start the game (assign roles)
    const startResult = await assignRoles(game.gameId, game.host.client_id);
    recordTest('Game started successfully', startResult.success);
    
    // Verify game is in active phase
    gameData = await getGame(game.gameCode);
    recordTest('Game is in active phase', gameData.success && gameData.data.game.phase !== 'lobby');
    
    // Player leaves during active game
    const leaveResult = await leaveGame(game.gameId, players[0].client_id);
    recordTest('Player leave request successful during active game', leaveResult.success);
    recordTest('Game ended when player left during active game', leaveResult.data?.gameEnded === true);
    
    // Verify game is deleted
    await sleep(1000); // Wait for cleanup
    gameData = await getGame(game.gameCode);
    recordTest('Game deleted after player left during active game', !gameData.success && gameData.data?.error === 'Game not found');
    
  } catch (error) {
    recordTest('Player leaving during active game', false, error.message);
  }
}

async function testDataCleanup() {
  log('🧪 Testing: Data cleanup when game ends');
  
  try {
    // Create game
    const game = await createGame('TestHost4', 'host-client-4');
    log(`Created game ${game.gameCode} for cleanup test`);
    
    // Add players and start game
    await joinGame(game.gameCode, 'Player1', 'player-client-20');
    await joinGame(game.gameCode, 'Player2', 'player-client-21');
    await joinGame(game.gameCode, 'Player3', 'player-client-22');
    await joinGame(game.gameCode, 'Player4', 'player-client-23');
    await joinGame(game.gameCode, 'Player5', 'player-client-24');
    
    // Start game
    await assignRoles(game.gameId, game.host.client_id);
    log('Game started for cleanup test');
    
    // End game
    const endResult = await endGame(game.gameId, game.host.client_id);
    recordTest('Game ended successfully', endResult.success);
    
    // Wait for cleanup
    await sleep(2000);
    
    // Verify complete cleanup
    const gameData = await getGame(game.gameCode);
    recordTest('Game completely deleted', !gameData.success && gameData.data?.error === 'Game not found');
    
  } catch (error) {
    recordTest('Data cleanup test', false, error.message);
  }
}

async function testMultiplePlayersLeaving() {
  log('🧪 Testing: Multiple players leaving scenarios');
  
  try {
    // Create game with 8 players
    const game = await createGame('TestHost5', 'host-client-5');
    log(`Created game ${game.gameCode} for multiple player test`);
    
    // Add 7 players
    const players = [];
    for (let i = 1; i <= 7; i++) {
      const player = await joinGame(game.gameCode, `Player${i}`, `player-client-${i + 30}`);
      players.push(player);
    }
    
    // Verify 8 players total
    let gameData = await getGame(game.gameCode);
    recordTest('Game has 8 players initially', gameData.success && gameData.data.players.length === 8);
    
    // Start game
    await assignRoles(game.gameId, game.host.client_id);
    log('Game started with 8 players');
    
    // Player 1 leaves (7 players remain - game continues)
    let leaveResult = await leaveGame(game.gameId, players[0].client_id);
    recordTest('First player left successfully', leaveResult.success);
    recordTest('Game continued with 7 players', leaveResult.data?.gameEnded === false);
    
    // Player 2 leaves (6 players remain - game continues)
    leaveResult = await leaveGame(game.gameId, players[1].client_id);
    recordTest('Second player left successfully', leaveResult.success);
    recordTest('Game continued with 6 players', leaveResult.data?.gameEnded === false);
    
    // Player 3 leaves (5 players remain - game should end)
    leaveResult = await leaveGame(game.gameId, players[2].client_id);
    recordTest('Third player left successfully', leaveResult.success);
    recordTest('Game ended when dropped to 5 players', leaveResult.data?.gameEnded === true);
    
    // Verify game is deleted
    await sleep(1000);
    gameData = await getGame(game.gameCode);
    recordTest('Game deleted after dropping below 6 players', !gameData.success && gameData.data?.error === 'Game not found');
    
  } catch (error) {
    recordTest('Multiple players leaving test', false, error.message);
  }
}

async function testErrorHandling() {
  log('🧪 Testing: Error handling scenarios');
  
  try {
    // Test leaving non-existent game
    const fakeGameId = '00000000-0000-0000-0000-000000000000';
    const leaveResult = await leaveGame(fakeGameId, 'fake-client');
    recordTest('Leave non-existent game returns error', !leaveResult.success);
    
    // Test leaving with invalid client ID
    const game = await createGame('TestHost6', 'host-client-6');
    const invalidLeaveResult = await leaveGame(game.gameId, 'invalid-client-id');
    recordTest('Leave with invalid client ID returns error', !invalidLeaveResult.success);
    
    // Clean up
    await endGame(game.gameId, game.host.client_id);
    
  } catch (error) {
    recordTest('Error handling test', false, error.message);
  }
}

async function testPlayerDisplayFunctionality() {
  log('🧪 Testing: Player display functionality in lobby');
  
  try {
    // Create a game with multiple players
    const game = await createGame('DisplayTestHost', 'display-host-123');
    log(`Created game ${game.gameCode} with host DisplayTestHost`);
    
    // Add multiple players
    const players = [];
    for (let i = 1; i <= 5; i++) {
      const player = await joinGame(game.gameCode, `Player${i}`, `player-${i}-123`);
      players.push(player);
      await sleep(200); // Small delay between joins
    }
    log(`Added ${players.length} players to the game`);
    
    // Get game data and verify player display
    const gameData = await getGame(game.gameCode);
    recordTest('Game data retrieval works for player display test', gameData.success);
    
    if (gameData.success && gameData.data.players) {
      const allPlayers = gameData.data.players;
      
      // Check total player count (host + 5 players = 6)
      recordTest('Game has correct total player count', allPlayers.length === 6);
      
      // Check that all players have required fields
      const hasRequiredFields = allPlayers.every(player => 
        player.id && 
        player.name && 
        player.client_id && 
        typeof player.is_host === 'boolean' &&
        typeof player.alive === 'boolean'
      );
      recordTest('All players have required fields for display', hasRequiredFields);
      
      // Check that there's exactly one host
      const hostCount = allPlayers.filter(p => p.is_host).length;
      recordTest('Game has exactly one host for display', hostCount === 1);
      
      // Check that host is properly identified
      const host = allPlayers.find(p => p.is_host);
      recordTest('Host is properly identified for display', host && host.name === 'DisplayTestHost');
      
      // Check that all players are alive in lobby
      const allAlive = allPlayers.every(p => p.alive === true);
      recordTest('All players are alive in lobby for display', allAlive);
      
      // Check that player names are not empty and unique
      const playerNames = allPlayers.map(p => p.name);
      const uniqueNames = new Set(playerNames);
      recordTest('All player names are valid and unique', 
        playerNames.every(name => name && name.trim().length > 0) && 
        playerNames.length === uniqueNames.size
      );
      
      // Check that player IDs are unique
      const playerIds = allPlayers.map(p => p.id);
      const uniqueIds = new Set(playerIds);
      recordTest('All player IDs are unique for display', playerIds.length === uniqueIds.size);
      
      // Check that client IDs are unique
      const clientIds = allPlayers.map(p => p.client_id);
      const uniqueClientIds = new Set(clientIds);
      recordTest('All client IDs are unique for display', clientIds.length === uniqueClientIds.size);
      
      // Verify specific players exist
      const expectedNames = ['DisplayTestHost', 'Player1', 'Player2', 'Player3', 'Player4', 'Player5'];
      const actualNames = allPlayers.map(p => p.name).sort();
      const expectedNamesSorted = expectedNames.sort();
      recordTest('All expected players are present', 
        JSON.stringify(actualNames) === JSON.stringify(expectedNamesSorted)
      );
      
    } else {
      recordTest('Player display test failed - no game data', false);
    }
    
    // Clean up
    await endGame(game.gameId, game.host.client_id);
    
  } catch (error) {
    recordTest('Player display functionality test', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Leave Game Test Suite');
  log(`Base URL: ${BASE_URL}`);
  log(`Timeout: ${TEST_CONFIG.timeout}ms`);
  
  const startTime = Date.now();
  
  try {
    await testHostLeavingInLobby();
    await sleep(TEST_CONFIG.delay);
    
    await testPlayerLeavingInLobby();
    await sleep(TEST_CONFIG.delay);
    
    await testPlayerLeavingDuringActiveGame();
    await sleep(TEST_CONFIG.delay);
    
    await testDataCleanup();
    await sleep(TEST_CONFIG.delay);
    
    await testMultiplePlayersLeaving();
    await sleep(TEST_CONFIG.delay);
    
    await testErrorHandling();
    await sleep(TEST_CONFIG.delay);
    
    await testPlayerDisplayFunctionality();
    
  } catch (error) {
    log(`Test suite failed: ${error.message}`, 'error');
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Print results
  log('\n📊 Test Results Summary:');
  log(`Total Tests: ${testResults.total}`);
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  log(`Duration: ${duration}ms`);
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => log(`  - ${test.name}: ${test.details}`, 'error'));
  }
  
  log('\n🎯 Test Suite Complete');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n⚠️ Test suite interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testResults
};
