#!/usr/bin/env node

/**
 * Test script to verify browser-specific sync functionality
 * This simulates different browsers trying to join the same game
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Helper function to make requests
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    return {
      success: response.ok,
      status: response.status,
      data: data
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Test browser-specific client IDs
async function testBrowserSpecificSync() {
  console.log('🧪 Testing Browser-Specific Sync Functionality\n')
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  }
  
  function recordTest(name, passed, details = '') {
    results.tests.push({ name, passed, details })
    if (passed) {
      results.passed++
      console.log(`✅ ${name}`)
    } else {
      results.failed++
      console.log(`❌ ${name}${details ? ` - ${details}` : ''}`)
    }
  }
  
  try {
    // Test 1: Create a game with browser-specific client ID
    console.log('1. Creating game with browser-specific client ID...')
    const browser1ClientId = `browser1-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    
    const createResult = await makeRequest(`${BASE_URL}/api/games`, {
      method: 'POST',
      body: JSON.stringify({
        hostName: 'Browser1Host',
        clientId: browser1ClientId
      })
    })
    
    recordTest('Game creation with browser-specific client ID', createResult.success)
    
    if (!createResult.success) {
      console.log('❌ Cannot continue tests - game creation failed')
      return results
    }
    
    const gameId = createResult.data.game.id
    const gameCode = createResult.data.game.code
    
    // Test 2: Same browser (same client ID) tries to join - should fail
    console.log('\n2. Testing same browser trying to join...')
    const sameBrowserJoinResult = await makeRequest(`${BASE_URL}/api/games/join`, {
      method: 'POST',
      body: JSON.stringify({
        gameCode: gameCode,
        playerName: 'SameBrowserPlayer',
        clientId: browser1ClientId
      })
    })
    
    recordTest('Same browser cannot join twice', !sameBrowserJoinResult.success, 
      sameBrowserJoinResult.data?.error || 'Expected error but got success')
    
    // Test 3: Different browser (different client ID) can join
    console.log('\n3. Testing different browser joining...')
    const browser2ClientId = `browser2-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    
    const differentBrowserJoinResult = await makeRequest(`${BASE_URL}/api/games/join`, {
      method: 'POST',
      body: JSON.stringify({
        gameCode: gameCode,
        playerName: 'Browser2Player',
        clientId: browser2ClientId
      })
    })
    
    recordTest('Different browser can join same game', differentBrowserJoinResult.success)
    
    // Test 4: Verify both players are in the game
    console.log('\n4. Verifying both players are in the game...')
    const gameDataResult = await makeRequest(`${BASE_URL}/api/games?code=${gameCode}`)
    
    if (gameDataResult.success && gameDataResult.data?.players) {
      const players = gameDataResult.data.players
      const browser1Player = players.find(p => p.client_id === browser1ClientId)
      const browser2Player = players.find(p => p.client_id === browser2ClientId)
      
      recordTest('Host (browser1) is in game', !!browser1Player)
      recordTest('Player (browser2) is in game', !!browser2Player)
      recordTest('Total players count is 2', players.length === 2)
    } else {
      recordTest('Game data retrieval', false, 'Failed to get game data')
    }
    
    // Test 5: Clean up - end the game
    console.log('\n5. Cleaning up...')
    const endGameResult = await makeRequest(`${BASE_URL}/api/games/${gameId}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'end_game',
        clientId: browser1ClientId
      })
    })
    
    recordTest('Game cleanup successful', endGameResult.success)
    
  } catch (error) {
    console.error('❌ Test execution error:', error)
    recordTest('Test execution', false, error.message)
  }
  
  // Summary
  console.log('\n📊 Test Results:')
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`)
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`   - ${test.name}: ${test.details}`)
    })
  }
  
  return results
}

// Run the test
if (require.main === module) {
  testBrowserSpecificSync()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('❌ Test script error:', error)
      process.exit(1)
    })
}

module.exports = { testBrowserSpecificSync }
