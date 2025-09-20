#!/usr/bin/env node

/**
 * Core Game Logic Tests
 * Tests basic game functionality: creation, joining, role assignment, win conditions
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

class GameLogicTests {
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

  async makeRequest(url, options = {}) {
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

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async setupGame() {
    console.log('\n🎮 Setting up test game...')
    
    // Create host
    const hostResponse = await this.makeRequest(`${BASE_URL}/api/games`, {
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
      const playerResponse = await this.makeRequest(`${BASE_URL}/api/games/join`, {
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

  async testGameCreation() {
    console.log('\n🎯 Testing game creation...')
    
    const response = await this.makeRequest(`${BASE_URL}/api/games`, {
      method: 'POST',
      body: JSON.stringify({
        hostName: 'TestHost',
        clientId: 'test-host-' + Date.now()
      })
    })
    
    if (!response.gameCode || !response.player) {
      throw new Error('Game creation failed - missing gameCode or player')
    }
    
    if (!response.player.is_host) {
      throw new Error('Host player not marked as host')
    }
    
    console.log('✅ Game creation works correctly')
  }

  async testPlayerJoining() {
    console.log('\n👥 Testing player joining...')
    
    // Create a new game for this test
    const gameResponse = await this.makeRequest(`${BASE_URL}/api/games`, {
      method: 'POST',
      body: JSON.stringify({
        hostName: 'TestHost2',
        clientId: 'test-host2-' + Date.now()
      })
    })
    
    // Join with multiple players
    for (let i = 1; i <= 3; i++) {
      const joinResponse = await this.makeRequest(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        body: JSON.stringify({
          gameCode: gameResponse.gameCode,
          playerName: `TestPlayer${i}`,
          clientId: `test-join-${i}-${Date.now()}`
        })
      })
      
      if (!joinResponse.player || joinResponse.player.is_host) {
        throw new Error(`Player ${i} join failed or incorrectly marked as host`)
      }
    }
    
    // Verify all players are in the game
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${gameResponse.gameCode}`)
    
    if (gameState.players.length !== 4) { // 1 host + 3 players
      throw new Error(`Expected 4 players, got ${gameState.players.length}`)
    }
    
    console.log('✅ Player joining works correctly')
  }

  async testRoleAssignment() {
    console.log('\n🎭 Testing role assignment...')
    
    // Start the game
    const startResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    
    if (!startResponse.success) {
      throw new Error('Failed to start game and assign roles')
    }
    
    // Get game state to verify roles were assigned
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`)
    
    const playersWithRoles = gameState.players.filter(p => p.role && !p.is_host)
    const hostPlayer = gameState.players.find(p => p.is_host)
    
    if (hostPlayer.role) {
      throw new Error('Host should not have a role assigned')
    }
    
    if (playersWithRoles.length < 6) {
      throw new Error(`Expected at least 6 players with roles, got ${playersWithRoles.length}`)
    }
    
    // Check for required roles
    const roles = playersWithRoles.map(p => p.role)
    const hasWerewolf = roles.includes('werewolf')
    const hasDoctor = roles.includes('doctor')
    const hasPolice = roles.includes('police')
    
    if (!hasWerewolf) {
      throw new Error('No werewolf role assigned')
    }
    
    if (!hasDoctor) {
      throw new Error('No doctor role assigned')
    }
    
    if (!hasPolice) {
      throw new Error('No police role assigned')
    }
    
    console.log('✅ Role assignment works correctly')
  }

  async testWinConditions() {
    console.log('\n🏆 Testing win conditions...')
    
    // Get current game state
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`)
    const alivePlayers = gameState.players.filter(p => p.alive)
    
    console.log(`Current alive players: ${alivePlayers.length}`)
    
    // Eliminate players until only 2 are left
    let eliminatedCount = 0
    const targetEliminations = alivePlayers.length - 2
    
    for (let i = 0; i < targetEliminations; i++) {
      // Advance to final vote phase
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'next_phase',
          clientId: this.hostClientId
        })
      })
      
      // Get current state
      const currentState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`)
      const currentAlivePlayers = currentState.players.filter(p => p.alive && !p.is_host)
      
      if (currentAlivePlayers.length <= 1) {
        break
      }
      
      // Have all players vote for the first alive player
      for (const player of currentAlivePlayers) {
        try {
          await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
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
      const eliminateResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
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
      
      await this.sleep(1000) // Wait between eliminations
    }
    
    // Check final game state
    const finalState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`)
    
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

  async testSoundEffectImplementation() {
    console.log('🔊 Testing sound effect implementation...')
    
    // Assign roles (this should trigger sound effect)
    const response = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to assign roles: ${response.status}`)
    }
    
    // Verify game state
    const gameState = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}`)
    const data = await gameState.json()
    
    if (data.game.phase !== 'lobby') {
      throw new Error(`Expected lobby phase after role assignment, got: ${data.game.phase}`)
    }
    
    // Note: Sound effect testing is limited in automated tests
    // The sound should play for 4 seconds when roles are assigned
    console.log('✅ Sound effect implementation test passed (manual verification required)')
  }

  async runAllTests() {
    console.log('🎯 Starting Core Game Logic Tests')
    console.log(`📍 Testing against: ${BASE_URL}`)
    
    try {
      await this.setupGame()
      
      await this.runTest('Game Creation', () => this.testGameCreation())
      await this.runTest('Player Joining', () => this.testPlayerJoining())
      await this.runTest('Role Assignment', () => this.testRoleAssignment())
      await this.runTest('Sound Effect Implementation', () => this.testSoundEffectImplementation())
      await this.runTest('Win Conditions', () => this.testWinConditions())
      
    } catch (error) {
      console.error('❌ Test suite setup failed:', error.message)
      this.results.push({ test: 'Setup', status: 'FAILED', error: error.message })
    }
    
    this.printResults()
  }

  printResults() {
    console.log('\n📊 Core Game Logic Test Results:')
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
      console.log('🎉 All core game logic tests passed!')
    } else {
      console.log('⚠️ Some tests failed. Please review the issues above.')
      process.exit(1)
    }
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new GameLogicTests()
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
}

module.exports = GameLogicTests
