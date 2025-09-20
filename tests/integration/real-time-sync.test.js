#!/usr/bin/env node

/**
 * Integration Tests - Real-time Synchronization
 * Tests real-time sync, player management, game flow, and host controls
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

class RealTimeSyncTests {
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

  async testRealTimeEvents() {
    console.log('\n🔧 Testing real-time events for host...')
    
    // Start the game
    const startResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
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
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`)
    
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
    
    const wolfAction = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
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
    await this.sleep(1000) // Wait for real-time sync
    const updatedGameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`)
    
    if (!updatedGameState.roundState.wolf_target_player_id) {
      throw new Error('Round state not updated with werewolf target')
    }
    
    console.log('✅ Real-time round state update verified')
  }

  async testHostVotingExclusion() {
    console.log('\n🗳️ Testing host voting exclusion...')
    
    // Advance to day vote phase
    const nextPhaseResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
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
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
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
    const playerVote = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
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

  async testPlayerManagement() {
    console.log('\n👥 Testing player management...')
    
    // Test player removal
    const removeResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'remove_player',
        clientId: this.hostClientId,
        data: { playerId: this.playerClientIds[0] }
      })
    })
    
    if (!removeResponse.success) {
      throw new Error('Failed to remove player')
    }
    
    console.log('✅ Player removal works correctly')
    
    // Verify player was removed
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`)
    const remainingPlayers = gameState.players.filter(p => p.client_id === this.playerClientIds[0])
    
    if (remainingPlayers.length > 0) {
      throw new Error('Player was not properly removed')
    }
    
    console.log('✅ Player removal verified')
  }

  async testLeaveRequestSystem() {
    console.log('\n🚪 Testing leave request system...')
    
    // Test leave request
    const leaveRequestResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'request_leave',
        clientId: this.playerClientIds[1]
      })
    })
    
    if (!leaveRequestResponse.success) {
      throw new Error('Failed to create leave request')
    }
    
    console.log('✅ Leave request created')
    
    // Test leave approval
    const approveResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve_leave',
        clientId: this.hostClientId,
        data: { playerId: this.playerClientIds[1] }
      })
    })
    
    if (!approveResponse.success) {
      throw new Error('Failed to approve leave request')
    }
    
    console.log('✅ Leave request approved')
    
    // Verify player was removed
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`)
    const remainingPlayers = gameState.players.filter(p => p.client_id === this.playerClientIds[1])
    
    if (remainingPlayers.length > 0) {
      throw new Error('Player was not properly removed after leave approval')
    }
    
    console.log('✅ Leave request system works correctly')
  }

  async testHostRedirectPrevention() {
    console.log('\n🚫 Testing host redirect prevention...')
    
    // End the game
    const endGameResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'end_game',
        clientId: this.hostClientId
      })
    })
    
    if (!endGameResponse.success) {
      throw new Error('Failed to end game')
    }
    
    console.log('✅ Game ended successfully')
    
    // Host should still be able to access the game
    const hostGameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`)
    
    if (!hostGameState.game) {
      throw new Error('Host should still have access to ended game')
    }
    
    if (hostGameState.game.phase !== 'ended') {
      throw new Error('Game should still be in ended phase for host')
    }
    
    console.log('✅ Host correctly retained access to ended game')
  }

  async testMobileUILayout() {
    console.log('📱 Testing mobile UI layout...')
    
    // Assign roles and start game
    const assignResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    
    if (!assignResponse.ok) {
      throw new Error(`Failed to assign roles: ${assignResponse.status}`)
    }
    
    // Host advances to night phase
    const nextPhaseResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    
    if (!nextPhaseResponse.ok) {
      throw new Error(`Failed to advance phase: ${nextPhaseResponse.status}`)
    }
    
    // Get game state to verify layout components exist
    const gameState = await this.makeRequest(`${BASE_URL}/api/games/${this.gameCode}`)
    const data = await gameState.json()
    
    if (data.game.phase !== 'night_wolf') {
      throw new Error(`Expected night_wolf phase, got: ${data.game.phase}`)
    }
    
    if (data.players.length !== 7) {
      throw new Error(`Expected 7 players (host + 6 players), got: ${data.players.length}`)
    }
    
    // Verify that players have roles
    const playersWithRoles = data.players.filter(p => p.role)
    if (playersWithRoles.length !== 6) {
      throw new Error(`Expected 6 players with roles, got: ${playersWithRoles.length}`)
    }
    
    console.log('✅ Mobile UI layout test passed')
  }

  async runAllTests() {
    console.log('🔧 Starting Real-time Sync Integration Tests')
    console.log(`📍 Testing against: ${BASE_URL}`)
    
    try {
      await this.setupGame()
      
      await this.runTest('Real-time Events for Host', () => this.testRealTimeEvents())
      await this.runTest('Host Voting Exclusion', () => this.testHostVotingExclusion())
      await this.runTest('Player Management', () => this.testPlayerManagement())
      await this.runTest('Leave Request System', () => this.testLeaveRequestSystem())
      await this.runTest('Mobile UI Layout', () => this.testMobileUILayout())
      await this.runTest('Host Redirect Prevention', () => this.testHostRedirectPrevention())
      
    } catch (error) {
      console.error('❌ Test suite setup failed:', error.message)
      this.results.push({ test: 'Setup', status: 'FAILED', error: error.message })
    }
    
    this.printResults()
  }

  printResults() {
    console.log('\n📊 Real-time Sync Integration Test Results:')
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
      console.log('🎉 All real-time sync integration tests passed!')
    } else {
      console.log('⚠️ Some tests failed. Please review the issues above.')
      process.exit(1)
    }
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new RealTimeSyncTests()
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
}

module.exports = RealTimeSyncTests
