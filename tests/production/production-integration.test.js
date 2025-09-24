#!/usr/bin/env node

/**
 * Production Integration Tests
 * Tests the actual production deployment to catch real-world issues
 */

const BASE_URL = process.env.TEST_URL || 'https://wearwolf-fg1vtf9xi-faizuddin0019s-projects.vercel.app'

class ProductionIntegrationTests {
  constructor() {
    this.results = []
    this.gameId = null
    this.gameUuid = null
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
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
    }
    
    return response.json()
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
    
    this.gameId = hostResponse.gameId
    this.gameUuid = hostResponse.game.id
    this.hostClientId = hostResponse.player.client_id
    
    console.log(`✅ Game created with code: ${this.gameId}`)
    
    // Add 6 players (minimum required)
    for (let i = 1; i <= 6; i++) {
      const playerResponse = await this.makeRequest(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        body: JSON.stringify({
          gameId: this.gameId,
          playerName: `Player${i}`,
          clientId: `test-player-${i}-${Date.now()}`
        })
      })
      
      this.playerClientIds.push(playerResponse.player.client_id)
      console.log(`✅ Player ${i} joined: ${playerResponse.player.name}`)
    }
    
    console.log(`✅ Game setup complete with ${this.playerClientIds.length + 1} total players`)
  }

  async testPhaseTransitionAfterRoleAssignment() {
    console.log('\n🎭 Testing phase transition after role assignment...')
    
    // Assign roles
    const assignResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    
    if (!assignResponse.success) {
      throw new Error('Failed to assign roles')
    }
    
    // Check game state - should stay in lobby phase
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    
    if (gameState.game.phase !== 'lobby') {
      throw new Error(`Expected game to stay in lobby phase after role assignment, got: ${gameState.game.phase}`)
    }
    
    console.log('✅ Game correctly stays in lobby phase after role assignment')
  }

  async testHostWakeupWerwolfButton() {
    console.log('\n🐺 Testing host wakeup werwolf button...')
    
    // Get current game state
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    
    // Check if roles are assigned
    const playersWithRoles = gameState.players.filter(p => p.role && !p.is_host)
    if (playersWithRoles.length === 0) {
      throw new Error('No players have roles assigned')
    }
    
    // Host should be able to click "Wake Up Werwolf" (next_phase action)
    const nextPhaseResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    
    if (!nextPhaseResponse.success) {
      throw new Error('Failed to advance to night_wolf phase')
    }
    
    // Check that game is now in night_wolf phase
    const updatedGameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    
    if (updatedGameState.game.phase !== 'night_wolf') {
      throw new Error(`Expected game to be in night_wolf phase, got: ${updatedGameState.game.phase}`)
    }
    
    console.log('✅ Host successfully advanced game to night_wolf phase')
  }

  async testWerewolfActionScreen() {
    console.log('\n🌙 Testing werewolf action screen...')
    
    // Get current game state
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    
    // Find werewolf player
    const werewolf = gameState.players.find(p => p.role === 'werewolf')
    if (!werewolf) {
      throw new Error('No werewolf found in game')
    }
    
    // Werewolf should be able to select a target
    const targets = gameState.players.filter(p => p.id !== werewolf.id && !p.is_host && p.alive)
    if (targets.length === 0) {
      throw new Error('No targets available for werewolf')
    }
    
    const target = targets[0]
    const wolfActionResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'wolf_select',
        clientId: werewolf.client_id,
        data: { targetId: target.id }
      })
    })
    
    if (!wolfActionResponse.success) {
      throw new Error(`Werewolf action failed: ${wolfActionResponse.error || 'Unknown error'}`)
    }
    
    console.log(`✅ Werewolf successfully selected target: ${target.name}`)
  }

  async testHostScreenStability() {
    console.log('\n🖥️ Testing host screen stability...')
    
    // Simulate multiple page refreshes by fetching game state multiple times
    for (let i = 0; i < 3; i++) {
      const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
        headers: { 'Cookie': `clientId=${this.hostClientId}` }
      })
      
      // Check that host is consistently identified
      const hostPlayer = gameState.players.find(p => p.is_host)
      if (!hostPlayer) {
        throw new Error('Host player not found')
      }
      
      if (hostPlayer.client_id !== this.hostClientId) {
        throw new Error('Host client ID mismatch')
      }
      
      console.log(`✅ Refresh ${i + 1}: Host correctly identified`)
    }
    
    console.log('✅ Host screen stability test passed')
  }

  async runAllTests() {
    console.log('🎯 Starting Production Integration Tests')
    console.log(`📍 Testing against: ${BASE_URL}`)
    
    try {
      await this.setupGame()
      
      await this.runTest('Phase Transition After Role Assignment', () => this.testPhaseTransitionAfterRoleAssignment())
      await this.runTest('Host Wakeup Werwolf Button', () => this.testHostWakeupWerwolfButton())
      await this.runTest('Werewolf Action Screen', () => this.testWerewolfActionScreen())
      await this.runTest('Host Screen Stability', () => this.testHostScreenStability())
      
    } catch (error) {
      console.error('❌ Test suite setup failed:', error.message)
      this.results.push({ test: 'Setup', status: 'FAILED', error: error.message })
    }
    
    this.printResults()
  }

  printResults() {
    console.log('\n📊 Production Integration Test Results:')
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
      console.log('🎉 All production integration tests passed!')
    } else {
      console.log('⚠️ Some tests failed. Please review the issues above.')
      process.exit(1)
    }
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new ProductionIntegrationTests()
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
}

module.exports = ProductionIntegrationTests
