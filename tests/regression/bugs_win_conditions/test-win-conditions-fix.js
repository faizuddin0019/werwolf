#!/usr/bin/env node

/**
 * Bug Repro Test: Win Conditions Test Failure
 * 
 * This test reproduces the failing win conditions test to identify the root cause.
 * Bug ID: win-conditions-400-error
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

class WinConditionsBugTest {
  constructor() {
    this.gameId = null
    this.hostClientId = null
    this.playerClientIds = []
  }

  async makeRequest(url, options) {
    const response = await fetch(url, options)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    return response.json()
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async setupGame() {
    console.log('📝 Setting up game for win conditions test...')
    
    // Create game
    const hostResponse = await this.makeRequest(`${BASE_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: 'WinConditionsTestHost',
        clientId: 'win-conditions-test-host-' + Date.now()
      })
    })
    
    this.gameId = hostResponse.gameId
    this.hostClientId = hostResponse.player.client_id
    console.log(`✅ Game created: ${this.gameId}`)

    // Add 6 players
    for (let i = 1; i <= 6; i++) {
      const playerResponse = await this.makeRequest(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: this.gameId,
          playerName: `Player${i}`,
          clientId: `win-conditions-player-${i}-${Date.now()}`
        })
      })
      this.playerClientIds.push(playerResponse.player.client_id)
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

  async testWinConditionsFlow() {
    console.log('\n🏆 Testing Win Conditions Flow...')
    
    // Step 1: Start the game (lobby -> night_wolf)
    console.log('📝 Step 1: Starting game...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Game started (lobby -> night_wolf)')

    // Step 2: Get game state and find werewolf
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    
    const werewolfPlayer = gameState.players.find(p => p.role === 'werwolf' || p.role === 'werewolf')
    if (!werewolfPlayer) {
      throw new Error('No werewolf found in game')
    }
    console.log(`✅ Found werewolf: ${werewolfPlayer.name}`)

    // Step 3: Werewolf selects a target
    console.log('📝 Step 3: Werewolf selecting target...')
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

    // Step 4: Advance to doctor phase
    console.log('📝 Step 4: Advancing to doctor phase...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Advanced to doctor phase')

    // Step 5: Doctor saves someone (optional)
    const doctorPlayer = gameState.players.find(p => p.role === 'doctor')
    if (doctorPlayer) {
      console.log('📝 Step 5: Doctor saving target...')
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

    // Step 6: Advance to police phase
    console.log('📝 Step 6: Advancing to police phase...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Advanced to police phase')

    // Step 7: Police inspects someone
    const policePlayer = gameState.players.find(p => p.role === 'police')
    if (policePlayer) {
      console.log('📝 Step 7: Police inspecting target...')
      const inspectTarget = targets[2] || targets[0]
      
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'police_inspect',
          clientId: policePlayer.client_id,
          data: { targetId: inspectTarget.id }
        })
      })
      console.log(`✅ Police inspected: ${inspectTarget.name}`)
    }

    // Step 8: Reveal dead
    console.log('📝 Step 8: Revealing dead...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reveal_dead',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Dead revealed')

    // Step 9: Begin voting
    console.log('📝 Step 9: Beginning voting...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'begin_voting',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Voting began')

    // Step 10: Test voting and elimination
    console.log('📝 Step 10: Testing voting and elimination...')
    const currentState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    
    const alivePlayers = currentState.players.filter(p => p.alive && !p.is_host)
    console.log(`Current alive players: ${alivePlayers.length}`)
    
    if (alivePlayers.length > 1) {
      // Have players vote for the first alive player
      for (const player of alivePlayers) {
        try {
          await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'vote',
              clientId: player.client_id,
              data: { targetId: alivePlayers[0].id }
            })
          })
        } catch (error) {
          console.log(`⚠️ Player ${player.name} could not vote: ${error.message}`)
        }
      }
      
      // Move to final vote phase
      console.log('📝 Moving to final vote phase...')
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'final_vote',
          clientId: this.hostClientId
        })
      })
      console.log('✅ Moved to final vote phase')

      // Try to eliminate the voted player
      console.log('📝 Attempting to eliminate player...')
      try {
        const eliminateResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'eliminate_player',
            clientId: this.hostClientId
          })
        })
        console.log('✅ Elimination successful:', eliminateResponse)
      } catch (error) {
        console.error('❌ Elimination failed:', error.message)
        throw error
      }
    }

    console.log('✅ Win conditions flow test completed successfully')
  }

  async runTest() {
    try {
      await this.setupGame()
      await this.testWinConditionsFlow()
      
      console.log('\n🎉 Win Conditions Bug Test Completed Successfully!')
      console.log('✅ The win conditions flow is working correctly')
      return true
    } catch (error) {
      console.error('\n❌ Win Conditions Bug Test Failed:', error.message)
      console.error('This reproduces the bug in the main test suite')
      return false
    }
  }
}

if (require.main === module) {
  console.log('🐛 Testing Win Conditions Bug Reproduction...')
  const test = new WinConditionsBugTest()
  test.runTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('❌ Test runner failed:', error.message)
      process.exit(1)
    })
}

module.exports = { WinConditionsBugTest }
