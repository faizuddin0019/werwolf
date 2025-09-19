#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Game Flow Fixes
 * Tests all the critical issues that were fixed:
 * 1. Real-time events for host
 * 2. Host exclusion from voting
 * 3. Win conditions at 2 players
 * 4. Host redirect prevention
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

// Test configuration
const TEST_CONFIG = {
  baseUrl: BASE_URL,
  timeout: 30000,
  retries: 3
}

// Utility functions
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

// Test cases
class GameFlowTestSuite {
  constructor() {
    this.results = []
    this.gameCode = null
    this.hostClientId = null
    this.playerClientIds = []
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`)
    try {
      await testFunction()
      console.log(`✅ ${testName} - PASSED`)
      this.results.push({ test: testName, status: 'PASSED' })
    } catch (error) {
      console.log(`❌ ${testName} - FAILED: ${error.message}`)
      this.results.push({ test: testName, status: 'FAILED', error: error.message })
    }
  }

  async setupGame() {
    console.log('\n🎮 Setting up test game...')
    
    // Create host
    const hostResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games`, {
      method: 'POST',
      body: JSON.stringify({
        hostName: 'TestHost',
        clientId: 'test-host-' + Date.now()
      })
    })
    
    this.gameCode = hostResponse.gameCode
    this.hostClientId = hostResponse.player.client_id
    
    console.log(`✅ Game created with code: ${this.gameCode}`)
    
    // Add 6 players (minimum required)
    for (let i = 1; i <= 6; i++) {
      const playerResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/join`, {
        method: 'POST',
        body: JSON.stringify({
          gameCode: this.gameCode,
          playerName: `Player${i}`,
          clientId: `test-player-${i}-${Date.now()}`
        })
      })
      
      this.playerClientIds.push(playerResponse.player.client_id)
      console.log(`✅ Player ${i} joined: ${playerResponse.player.name}`)
    }
    
    console.log(`✅ Game setup complete with ${this.playerClientIds.length + 1} total players`)
  }

  async testRealTimeEvents() {
    console.log('\n🔧 Testing real-time events for host...')
    
    // Start the game
    const startResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    
    if (!startResponse.success) {
      throw new Error('Failed to start game')
    }
    
    console.log('✅ Game started successfully')
    
    // Get game state to verify round state was created
    const gameState = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games?code=${this.gameCode}`)
    
    if (!gameState.roundState) {
      throw new Error('Round state not created when game started')
    }
    
    console.log('✅ Round state created for real-time tracking')
    
    // Simulate werewolf action
    const werewolfPlayer = gameState.players.find(p => p.role === 'werewolf' && !p.is_host)
    if (!werewolfPlayer) {
      throw new Error('No werewolf player found')
    }
    
    const targetPlayer = gameState.players.find(p => p.id !== werewolfPlayer.id && !p.is_host)
    if (!targetPlayer) {
      throw new Error('No target player found for werewolf')
    }
    
    const wolfAction = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'wolf_select',
        clientId: werewolfPlayer.client_id,
        data: { targetId: targetPlayer.id }
      })
    })
    
    if (!wolfAction.success) {
      throw new Error('Werewolf action failed')
    }
    
    console.log('✅ Werewolf action completed')
    
    // Verify round state was updated
    await sleep(1000) // Wait for real-time sync
    const updatedGameState = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games?code=${this.gameCode}`)
    
    if (!updatedGameState.roundState.wolf_target_player_id) {
      throw new Error('Round state not updated with werewolf target')
    }
    
    console.log('✅ Real-time round state update verified')
  }

  async testHostVotingExclusion() {
    console.log('\n🗳️ Testing host voting exclusion...')
    
    // Advance to day vote phase
    const nextPhaseResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    
    if (!nextPhaseResponse.success) {
      throw new Error('Failed to advance to day vote phase')
    }
    
    console.log('✅ Advanced to day vote phase')
    
    // Try to have host vote (should fail)
    try {
      await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/${this.gameCode}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'vote',
          clientId: this.hostClientId,
          data: { targetId: this.playerClientIds[0] }
        })
      })
      throw new Error('Host should not be able to vote')
    } catch (error) {
      if (error.message.includes('HTTP 403')) {
        console.log('✅ Host correctly prevented from voting')
      } else {
        throw error
      }
    }
    
    // Verify a regular player can vote
    const playerVote = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'vote',
        clientId: this.playerClientIds[0],
        data: { targetId: this.playerClientIds[1] }
      })
    })
    
    if (!playerVote.success) {
      throw new Error('Regular player should be able to vote')
    }
    
    console.log('✅ Regular player voting works correctly')
  }

  async testWinConditions() {
    console.log('\n🏆 Testing win conditions...')
    
    // Get current game state
    const gameState = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games?code=${this.gameCode}`)
    const alivePlayers = gameState.players.filter(p => p.alive)
    
    console.log(`Current alive players: ${alivePlayers.length}`)
    
    // Eliminate players until only 2 are left
    let eliminatedCount = 0
    const targetEliminations = alivePlayers.length - 2
    
    for (let i = 0; i < targetEliminations; i++) {
      // Advance to final vote phase
      await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/${this.gameCode}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'next_phase',
          clientId: this.hostClientId
        })
      })
      
      // Get current state
      const currentState = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games?code=${this.gameCode}`)
      const currentAlivePlayers = currentState.players.filter(p => p.alive && !p.is_host)
      
      if (currentAlivePlayers.length <= 1) {
        break
      }
      
      // Have all players vote for the first alive player
      for (const player of currentAlivePlayers) {
        try {
          await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/${this.gameCode}/actions`, {
            method: 'POST',
            body: JSON.stringify({
              action: 'vote',
              clientId: player.client_id,
              data: { targetId: currentAlivePlayers[0].id }
            })
          })
        } catch (error) {
          // Some players might already be dead, continue
        }
      }
      
      // Eliminate the voted player
      const eliminateResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/${this.gameCode}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'eliminate_player',
          clientId: this.hostClientId
        })
      })
      
      if (eliminateResponse.success) {
        eliminatedCount++
        console.log(`✅ Eliminated player ${eliminatedCount}/${targetEliminations}`)
      }
      
      await sleep(1000) // Wait between eliminations
    }
    
    // Check final game state
    const finalState = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games?code=${this.gameCode}`)
    
    if (finalState.game.phase !== 'ended') {
      throw new Error('Game should have ended when 2 players were left')
    }
    
    if (!finalState.game.win_state) {
      throw new Error('Win state should be set when game ends')
    }
    
    const finalAlivePlayers = finalState.players.filter(p => p.alive)
    const aliveWerewolves = finalAlivePlayers.filter(p => p.role === 'werewolf')
    
    // Verify win condition logic
    if (aliveWerewolves.length > 0 && finalState.game.win_state !== 'werewolves') {
      throw new Error('Werewolves should win if any are alive with 2 players left')
    }
    
    if (aliveWerewolves.length === 0 && finalState.game.win_state !== 'villagers') {
      throw new Error('Villagers should win if no werewolves are alive')
    }
    
    console.log(`✅ Win condition correctly determined: ${finalState.game.win_state}`)
    console.log(`✅ Final alive players: ${finalAlivePlayers.length}`)
  }

  async testHostRedirectPrevention() {
    console.log('\n🚫 Testing host redirect prevention...')
    
    // The game should already be ended from previous test
    const gameState = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games?code=${this.gameCode}`)
    
    if (gameState.game.phase !== 'ended') {
      throw new Error('Game should be ended for this test')
    }
    
    // Host should still be able to access the game
    const hostGameState = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games?code=${this.gameCode}`)
    
    if (!hostGameState.game) {
      throw new Error('Host should still have access to ended game')
    }
    
    if (hostGameState.game.phase !== 'ended') {
      throw new Error('Game should still be in ended phase for host')
    }
    
    console.log('✅ Host correctly retained access to ended game')
    
    // Verify host can end the game manually
    const endGameResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'end_game',
        clientId: this.hostClientId
      })
    })
    
    if (!endGameResponse.success) {
      throw new Error('Host should be able to end the game manually')
    }
    
    console.log('✅ Host can manually end the game')
  }

  async runAllTests() {
    console.log('🚀 Starting Game Flow Fixes Test Suite')
    console.log(`📍 Testing against: ${TEST_CONFIG.baseUrl}`)
    
    try {
      await this.setupGame()
      
      await this.runTest('Real-time Events for Host', () => this.testRealTimeEvents())
      await this.runTest('Host Voting Exclusion', () => this.testHostVotingExclusion())
      await this.runTest('Win Conditions at 2 Players', () => this.testWinConditions())
      await this.runTest('Host Redirect Prevention', () => this.testHostRedirectPrevention())
      
    } catch (error) {
      console.error('❌ Test suite setup failed:', error.message)
      this.results.push({ test: 'Setup', status: 'FAILED', error: error.message })
    }
    
    this.printResults()
  }

  printResults() {
    console.log('\n📊 Test Results Summary:')
    console.log('=' .repeat(50))
    
    const passed = this.results.filter(r => r.status === 'PASSED').length
    const failed = this.results.filter(r => r.status === 'FAILED').length
    
    this.results.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌'
      console.log(`${icon} ${result.test}: ${result.status}`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
    })
    
    console.log('=' .repeat(50))
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`)
    
    if (failed === 0) {
      console.log('🎉 All tests passed! Game flow fixes are working correctly.')
    } else {
      console.log('⚠️ Some tests failed. Please review the issues above.')
      process.exit(1)
    }
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new GameFlowTestSuite()
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
}

module.exports = GameFlowTestSuite
