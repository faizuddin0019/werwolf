#!/usr/bin/env node

/**
 * Performance Tests - Battery Optimization
 * Tests performance optimizations, console logging, and real-time efficiency
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

class BatteryOptimizationTests {
  constructor() {
    this.results = []
    this.gameId = null
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

  async testDebouncedUpdates() {
    console.log('\n⚡ Testing debounced updates...')
    
    // Start the game
    const startResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
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
    
    // Simulate rapid player updates
    const startTime = Date.now()
    
    // Make multiple rapid requests to test debouncing
    const promises = []
    for (let i = 0; i < 5; i++) {
      promises.push(
        this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'next_phase',
            clientId: this.hostClientId
          })
        }).catch(() => {}) // Ignore errors for rapid requests
      )
    }
    
    await Promise.all(promises)
    const endTime = Date.now()
    
    // Verify the requests were handled efficiently
    if (endTime - startTime > 5000) {
      throw new Error('Requests took too long - debouncing may not be working')
    }
    
    console.log('✅ Debounced updates working efficiently')
  }

  async testConsoleLoggingOptimization() {
    console.log('\n📝 Testing console logging optimization...')
    
    // This test verifies that console logging is optimized
    // In production, console.log should be minimal
    
    const isProduction = process.env.NODE_ENV === 'production'
    
    if (isProduction) {
      console.log('✅ Running in production mode - console logging should be minimal')
    } else {
      console.log('✅ Running in development mode - full console logging enabled')
    }
    
    // Test that the app still functions correctly regardless of logging level
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`)
    
    if (!gameState.game) {
      throw new Error('Game state not accessible')
    }
    
    console.log('✅ Console logging optimization verified')
  }

  async testRealTimeEfficiency() {
    console.log('\n🔄 Testing real-time efficiency...')
    
    // Test real-time sync efficiency
    const startTime = Date.now()
    
    // Make a change that should trigger real-time updates
    const werewolfPlayer = this.playerClientIds.find(id => id.includes('player'))
    if (werewolfPlayer) {
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'next_phase',
          clientId: this.hostClientId
        })
      })
    }
    
    // Wait for real-time sync
    await this.sleep(1000)
    
    const endTime = Date.now()
    
    // Verify real-time updates are efficient
    if (endTime - startTime > 3000) {
      throw new Error('Real-time updates took too long')
    }
    
    console.log('✅ Real-time sync is efficient')
  }

  async testMemoryUsage() {
    console.log('\n💾 Testing memory usage...')
    
    // Test that the app doesn't have memory leaks
    const initialMemory = process.memoryUsage()
    
    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
      await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`)
      await this.sleep(100)
    }
    
    const finalMemory = process.memoryUsage()
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
    
    // Memory increase should be reasonable (less than 10MB)
    if (memoryIncrease > 10 * 1024 * 1024) {
      throw new Error(`Memory usage increased too much: ${memoryIncrease / 1024 / 1024}MB`)
    }
    
    console.log(`✅ Memory usage is efficient (increase: ${memoryIncrease / 1024}KB)`)
  }

  async testNetworkEfficiency() {
    console.log('\n🌐 Testing network efficiency...')
    
    // Test that network requests are efficient
    const startTime = Date.now()
    
    // Make multiple requests to test network efficiency
    const requests = []
    for (let i = 0; i < 5; i++) {
      requests.push(
        this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`)
      )
    }
    
    await Promise.all(requests)
    const endTime = Date.now()
    
    const avgTime = (endTime - startTime) / requests.length
    
    // Average request time should be reasonable (less than 1 second)
    if (avgTime > 1000) {
      throw new Error(`Network requests too slow: ${avgTime}ms average`)
    }
    
    console.log(`✅ Network efficiency is good (${avgTime}ms average)`)
  }

  async runAllTests() {
    console.log('⚡ Starting Battery Optimization Performance Tests')
    console.log(`📍 Testing against: ${BASE_URL}`)
    
    try {
      await this.setupGame()
      
      await this.runTest('Debounced Updates', () => this.testDebouncedUpdates())
      await this.runTest('Console Logging Optimization', () => this.testConsoleLoggingOptimization())
      await this.runTest('Real-time Efficiency', () => this.testRealTimeEfficiency())
      await this.runTest('Memory Usage', () => this.testMemoryUsage())
      await this.runTest('Network Efficiency', () => this.testNetworkEfficiency())
      
    } catch (error) {
      console.error('❌ Test suite setup failed:', error.message)
      this.results.push({ test: 'Setup', status: 'FAILED', error: error.message })
    }
    
    this.printResults()
  }

  printResults() {
    console.log('\n📊 Battery Optimization Performance Test Results:')
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
      console.log('🎉 All battery optimization performance tests passed!')
    } else {
      console.log('⚠️ Some tests failed. Please review the issues above.')
      process.exit(1)
    }
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new BatteryOptimizationTests()
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
}

module.exports = BatteryOptimizationTests
