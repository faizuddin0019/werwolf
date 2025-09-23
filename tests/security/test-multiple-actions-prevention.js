const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

class MultipleActionsPreventionTest {
  constructor() {
    this.gameCode = null
    this.gameId = null
    this.hostClientId = null
    this.werwolfPlayerId = null
    this.doctorPlayerId = null
    this.policePlayerId = null
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
    console.log('\n📝 Step 1: Creating game...')
    const hostResponse = await this.makeRequest(`${BASE_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName: 'MultipleActionsTestHost',
        clientId: 'multiple-actions-test-host-' + Date.now()
      })
    })
    this.gameCode = hostResponse.gameCode
    this.gameId = hostResponse.game.id
    this.hostClientId = hostResponse.player.client_id
    console.log(`✅ Game created: ${this.gameCode}`)

    console.log('📝 Step 2: Adding 6 players...')
    for (let i = 1; i <= 6; i++) {
      const playerResponse = await this.makeRequest(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: this.gameCode,
          playerName: `MultipleActionsPlayer${i}`,
          clientId: `multiple-actions-player-${i}-${Date.now()}`
        })
      })
      this.playerClientIds.push(playerResponse.player.client_id)
    }
    console.log('✅ 6 players added')
  }

  async assignRolesAndStart() {
    console.log('📝 Step 3: Assigning roles...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Roles assigned')

    // Fetch game state to find the players with roles (using host cookie to see all roles)
    const gameState = await fetch(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    }).then(r => r.json())
    const werwolfPlayer = gameState.players.find(p => p.role === 'werwolf' || p.role === 'werewolf')
    const doctorPlayer = gameState.players.find(p => p.role === 'doctor')
    const policePlayer = gameState.players.find(p => p.role === 'police')

    if (!werwolfPlayer || !doctorPlayer || !policePlayer) {
      throw new Error('Not all roles assigned correctly')
    }

    this.werwolfPlayerId = werwolfPlayer.client_id
    this.doctorPlayerId = doctorPlayer.client_id
    this.policePlayerId = policePlayer.client_id

    console.log(`✅ Players identified: Werwolf=${werwolfPlayer.name}, Doctor=${doctorPlayer.name}, Police=${policePlayer.name}`)
  }

  async testWerwolfMultipleActions() {
    console.log('\n📝 Step 4: Testing Werwolf Multiple Actions Prevention...')
    
    // Host starts werwolf phase
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Host started werwolf phase')

    // Get game state to find targets
    const gameState = await fetch(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    }).then(r => r.json())
    const targets = gameState.players.filter(p => p.id !== this.werwolfPlayerId && !p.is_host && p.alive)
    
    if (targets.length < 2) {
      throw new Error('Not enough targets for multiple action test')
    }

    // First action should succeed
    console.log('📝 Testing first werwolf action...')
    const firstAction = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'wolf_select',
        clientId: this.werwolfPlayerId,
        data: { targetId: targets[0].id }
      })
    })
    
    if (!firstAction.success) {
      throw new Error(`First werwolf action failed: ${firstAction.error}`)
    }
    console.log('✅ First werwolf action succeeded')

    // Second action should fail
    console.log('📝 Testing second werwolf action (should fail)...')
    try {
      const secondAction = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'wolf_select',
          clientId: this.werwolfPlayerId,
          data: { targetId: targets[1].id }
        })
      })
      
      // If we get here, the test failed
      throw new Error('Second werwolf action should have failed but succeeded')
    } catch (error) {
      if (error.message.includes('already selected')) {
        console.log('✅ Second werwolf action correctly rejected')
      } else {
        throw error
      }
    }
  }

  async testDoctorMultipleActions() {
    console.log('\n📝 Step 5: Testing Doctor Multiple Actions Prevention...')
    
    // Host advances to doctor phase
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Host started doctor phase')

    // Get game state to find targets
    const gameState = await fetch(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    }).then(r => r.json())
    const targets = gameState.players.filter(p => p.id !== this.doctorPlayerId && !p.is_host && p.alive)
    
    if (targets.length < 2) {
      throw new Error('Not enough targets for multiple action test')
    }

    // First action should succeed
    console.log('📝 Testing first doctor action...')
    const firstAction = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'doctor_save',
        clientId: this.doctorPlayerId,
        data: { targetId: targets[0].id }
      })
    })
    
    if (!firstAction.success) {
      throw new Error(`First doctor action failed: ${firstAction.error}`)
    }
    console.log('✅ First doctor action succeeded')

    // Second action should fail
    console.log('📝 Testing second doctor action (should fail)...')
    try {
      const secondAction = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'doctor_save',
          clientId: this.doctorPlayerId,
          data: { targetId: targets[1].id }
        })
      })
      
      // If we get here, the test failed
      throw new Error('Second doctor action should have failed but succeeded')
    } catch (error) {
      if (error.message.includes('already saved')) {
        console.log('✅ Second doctor action correctly rejected')
      } else {
        throw error
      }
    }
  }

  async testPoliceMultipleActions() {
    console.log('\n📝 Step 6: Testing Police Multiple Actions Prevention...')
    
    // Host advances to police phase
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Host started police phase')

    // Get game state to find targets
    const gameState = await fetch(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    }).then(r => r.json())
    const targets = gameState.players.filter(p => p.id !== this.policePlayerId && !p.is_host && p.alive)
    
    if (targets.length < 2) {
      throw new Error('Not enough targets for multiple action test')
    }

    // First action should succeed
    console.log('📝 Testing first police action...')
    const firstAction = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'police_inspect',
        clientId: this.policePlayerId,
        data: { targetId: targets[0].id }
      })
    })
    
    if (!firstAction.success) {
      throw new Error(`First police action failed: ${firstAction.error}`)
    }
    console.log('✅ First police action succeeded')

    // Second action should fail
    console.log('📝 Testing second police action (should fail)...')
    try {
      const secondAction = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'police_inspect',
          clientId: this.policePlayerId,
          data: { targetId: targets[1].id }
        })
      })
      
      // If we get here, the test failed
      throw new Error('Second police action should have failed but succeeded')
    } catch (error) {
      if (error.message.includes('already inspected')) {
        console.log('✅ Second police action correctly rejected')
      } else {
        throw error
      }
    }
  }

  async runTests() {
    try {
      await this.setupGame()
      await this.assignRolesAndStart()
      await this.testWerwolfMultipleActions()
      await this.testDoctorMultipleActions()
      await this.testPoliceMultipleActions()
      
      console.log('\n🎉 Multiple Actions Prevention Test Completed Successfully!')
      console.log('✅ Werwolf can only select one target per phase')
      console.log('✅ Doctor can only save one player per phase')
      console.log('✅ Police can only inspect one player per phase')
    } catch (error) {
      console.error('❌ Multiple Actions Prevention Test Failed:', error.message)
      process.exit(1)
    }
  }
}

if (require.main === module) {
  console.log('🧪 Testing Multiple Actions Prevention...')
  const test = new MultipleActionsPreventionTest()
  test.runTests()
}
