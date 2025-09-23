#!/usr/bin/env node

/**
 * Simple Win Conditions Test
 * Tests the basic win condition logic without complex game flow
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001'

class SimpleWinConditionsTest {
  constructor() {
    this.gameCode = null
    this.gameId = null
    this.hostClientId = null
  }

  async makeRequest(url, options) {
    const response = await fetch(url, options)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    return response.json()
  }

  async setupGame() {
    console.log('📝 Setting up simple game...')
    
    // Create game
    const hostResponse = await this.makeRequest(`${BASE_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: 'SimpleTestHost',
        clientId: 'simple-test-host-' + Date.now()
      })
    })
    
    this.gameCode = hostResponse.gameCode
    this.gameId = hostResponse.game.id
    this.hostClientId = hostResponse.player.client_id
    console.log(`✅ Game created: ${this.gameCode}`)

    // Add 6 players
    for (let i = 1; i <= 6; i++) {
      await this.makeRequest(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: this.gameCode,
          playerName: `Player${i}`,
          clientId: `simple-player-${i}-${Date.now()}`
        })
      })
    }
    console.log('✅ 6 players added')

    // Assign roles
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Roles assigned')
  }

  async testWinConditions() {
    console.log('\n🏆 Testing Win Conditions...')
    
    // Test 1: Check initial state
    console.log('📝 Test 1: Checking initial game state...')
    const initialState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    
    const alivePlayers = initialState.players.filter(p => p.alive && !p.is_host)
    const werwolves = alivePlayers.filter(p => p.role === 'werwolf' || p.role === 'werewolf')
    
    console.log(`Initial state: ${alivePlayers.length} alive players, ${werwolves.length} werwolves`)
    
    if (alivePlayers.length !== 6) {
      throw new Error(`Expected 6 alive players, got ${alivePlayers.length}`)
    }
    
    if (werwolves.length !== 1) {
      throw new Error(`Expected 1 werwolf, got ${werwolves.length}`)
    }
    
    console.log('✅ Initial state correct')
    
    // Test 2: Start game and go through one complete cycle
    console.log('📝 Test 2: Starting game and going through one cycle...')
    
    // Start game
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Game started')
    
    // Get game state and find werewolf
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    
    const werewolfPlayer = gameState.players.find(p => p.role === 'werwolf' || p.role === 'werewolf')
    if (!werewolfPlayer) {
      throw new Error('No werewolf found in game')
    }
    console.log(`✅ Found werewolf: ${werewolfPlayer.name}`)
    
    // Werewolf selects a target
    const targets = gameState.players.filter(p => p.id !== werewolfPlayer.id && !p.is_host && p.alive)
    const target = targets[0]
    
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'wolf_select',
        clientId: werewolfPlayer.client_id,
        data: { targetId: target.id }
      })
    })
    console.log(`✅ Werewolf selected target: ${target.name}`)
    
    // Now advance to doctor phase (werewolf action is completed)
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Advanced to doctor phase')
    
    // Doctor saves someone (required to advance to police phase)
    const doctorPlayer = gameState.players.find(p => p.role === 'doctor')
    if (doctorPlayer) {
      const saveTarget = targets[1] || targets[0]
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'doctor_save',
          clientId: doctorPlayer.client_id,
          data: { targetId: saveTarget.id }
        })
      })
      console.log(`✅ Doctor saved: ${saveTarget.name}`)
    }
    
    // Advance to police phase (doctor action is completed)
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Advanced to police phase')
    
    // Reveal dead (while still in police phase - this advances to reveal phase)
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reveal_dead',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Dead revealed (advanced to reveal phase)')
    
    // Advance to day vote phase
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Advanced to day vote phase')
    
    // Test 3: Check win conditions after one cycle
    console.log('📝 Test 3: Checking win conditions after one cycle...')
    const cycleState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    
    const cycleAlivePlayers = cycleState.players.filter(p => p.alive && !p.is_host)
    const cycleWerwolves = cycleAlivePlayers.filter(p => p.role === 'werwolf' || p.role === 'werewolf')
    
    console.log(`After cycle: ${cycleAlivePlayers.length} alive players, ${cycleWerwolves.length} werwolves`)
    
    // Game should not be ended yet (more than 2 players)
    if (cycleState.game.phase === 'ended') {
      throw new Error('Game should not be ended yet with more than 2 players')
    }
    
    console.log('✅ Game correctly not ended with more than 2 players')
    
    console.log('✅ Simple win conditions test completed successfully!')
    return true
  }

  async runTest() {
    try {
      await this.setupGame()
      await this.testWinConditions()
      
      console.log('\n🎉 Simple Win Conditions Test Passed!')
      return true
    } catch (error) {
      console.error('\n❌ Simple Win Conditions Test Failed:', error.message)
      return false
    }
  }
}

if (require.main === module) {
  console.log('🧪 Testing Simple Win Conditions...')
  const test = new SimpleWinConditionsTest()
  test.runTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('❌ Test runner failed:', error.message)
      process.exit(1)
    })
}

module.exports = { SimpleWinConditionsTest }
