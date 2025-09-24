const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'

class RevealDeadButtonTest {
  constructor() {
    this.gameId = null
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
        hostName: 'RevealDeadTestHost',
        clientId: 'reveal-dead-test-host-' + Date.now()
      })
    })
    this.gameId = hostResponse.gameId
    this.gameUuid = hostResponse.game.id
    this.hostClientId = hostResponse.player.client_id
    console.log(`✅ Game created: ${this.gameId}`)

    console.log('📝 Step 2: Adding 6 players...')
    for (let i = 1; i <= 6; i++) {
      const playerResponse = await this.makeRequest(`${BASE_URL}/api/games/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: this.gameId,
          playerName: `RevealDeadPlayer${i}`,
          clientId: `reveal-dead-player-${i}-${Date.now()}`
        })
      })
      this.playerClientIds.push(playerResponse.player.client_id)
    }
    console.log('✅ 6 players added')
  }

  async assignRolesAndStart() {
    console.log('📝 Step 3: Assigning roles...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    console.log('✅ Roles assigned')

    // Fetch game state to find the players with roles (use host cookie to see all roles)
    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
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

  async testRevealDeadButtonAvailability() {
    console.log('\n📝 Step 4: Testing Reveal Dead Button Availability...')
    
    // Step 4a: Werwolf Phase - Reveal Dead should NOT be available
    console.log('📝 Step 4a: Testing Werwolf Phase...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })

    const gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    const targets = gameState.players.filter(p => p.id !== this.werwolfPlayerId && !p.is_host && p.alive)

    // Werwolf eliminates a target
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'wolf_select',
        clientId: this.werwolfPlayerId,
        data: { targetId: targets[0].id }
      })
    })

    // Check if reveal_dead action is available (should NOT be)
    try {
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reveal_dead',
          clientId: this.hostClientId
        })
      })
      throw new Error('Reveal Dead should not be available during werwolf phase')
    } catch (error) {
      if (error.message.includes('403') || error.message.includes('400')) {
        console.log('✅ Reveal Dead correctly not available during werwolf phase')
      } else {
        throw error
      }
    }

    // Step 4b: Doctor Phase - Reveal Dead should NOT be available
    console.log('📝 Step 4b: Testing Doctor Phase...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })

    const doctorTargets = gameState.players.filter(p => p.id !== this.doctorPlayerId && !p.is_host && p.alive)

    // Doctor saves a target
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'doctor_save',
        clientId: this.doctorPlayerId,
        data: { targetId: doctorTargets[0].id }
      })
    })

    // Check if reveal_dead action is available (should NOT be)
    try {
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reveal_dead',
          clientId: this.hostClientId
        })
      })
      throw new Error('Reveal Dead should not be available during doctor phase')
    } catch (error) {
      if (error.message.includes('403') || error.message.includes('400')) {
        console.log('✅ Reveal Dead correctly not available during doctor phase')
      } else {
        throw error
      }
    }

    // Step 4c: Police Phase - Reveal Dead should be available AFTER police action
    console.log('📝 Step 4c: Testing Police Phase...')
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'next_phase',
        clientId: this.hostClientId
      })
    })

    const policeTargets = gameState.players.filter(p => p.id !== this.policePlayerId && !p.is_host && p.alive)

    // Police inspects a target
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'police_inspect',
        clientId: this.policePlayerId,
        data: { targetId: policeTargets[0].id }
      })
    })

    // Check if reveal_dead action is available (should BE available)
    console.log('📝 Testing Reveal Dead availability after police action...')
    const revealResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reveal_dead',
        clientId: this.hostClientId
      })
    })

    if (!revealResponse.success) {
      throw new Error(`Reveal Dead action failed: ${revealResponse.error}`)
    }
    console.log('✅ Reveal Dead action succeeded after police phase')

    // Verify game phase changed to reveal
    const finalGameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    if (finalGameState.game.phase !== 'reveal') {
      throw new Error(`Expected phase 'reveal', got '${finalGameState.game.phase}'`)
    }
    console.log('✅ Game phase correctly changed to reveal')
  }

  async runTests() {
    try {
      await this.setupGame()
      await this.assignRolesAndStart()
      await this.testRevealDeadButtonAvailability()
      
      console.log('\n🎉 Reveal Dead Button Test Completed Successfully!')
      console.log('✅ Reveal Dead button not available during werwolf phase')
      console.log('✅ Reveal Dead button not available during doctor phase')
      console.log('✅ Reveal Dead button available after police action')
      console.log('✅ Game phase correctly advances to reveal')
    } catch (error) {
      console.error('❌ Reveal Dead Button Test Failed:', error.message)
      process.exit(1)
    }
  }
}

if (require.main === module) {
  console.log('🧪 Testing Reveal Dead Button Availability...')
  const test = new RevealDeadButtonTest()
  test.runTests()
}
