const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'

class ActionVisibilityTest {
  constructor() {
    this.gameId = null
    this.gameUuid = null
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
        hostName: 'ActionVisibilityTestHost',
        clientId: 'action-visibility-test-host-' + Date.now()
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
          playerName: `ActionVisibilityPlayer${i}`,
          clientId: `action-visibility-player-${i}-${Date.now()}`
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

  async testActionVisibility() {
    console.log('\n📝 Step 4: Testing Action Visibility...')
    
    // Step 4a: Werwolf Phase - Host should see werwolf action
    console.log('📝 Step 4a: Testing Werwolf Action Visibility...')
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
    const werwolfTarget = targets[0]
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'wolf_select',
        clientId: this.werwolfPlayerId,
        data: { targetId: werwolfTarget.id }
      })
    })

    // Check if host can see the werwolf action
    const hostView = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })

    if (!hostView.roundState?.wolf_target_player_id) {
      throw new Error('Host cannot see werwolf action')
    }
    console.log(`✅ Host can see werwolf selected target: ${werwolfTarget.name}`)

    // Step 4b: Doctor Phase - Host should see doctor action
    console.log('📝 Step 4b: Testing Doctor Action Visibility...')
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
    const doctorTarget = doctorTargets[0]
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'doctor_save',
        clientId: this.doctorPlayerId,
        data: { targetId: doctorTarget.id }
      })
    })

    // Check if host can see the doctor action
    const hostView2 = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })

    if (!hostView2.roundState?.doctor_save_player_id) {
      throw new Error('Host cannot see doctor action')
    }
    console.log(`✅ Host can see doctor saved target: ${doctorTarget.name}`)

    // Step 4c: Police Phase - Host should see police action
    console.log('📝 Step 4c: Testing Police Action Visibility...')
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
    const policeTarget = policeTargets[0]
    await this.makeRequest(`${BASE_URL}/api/games/${this.gameUuid}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'police_inspect',
        clientId: this.policePlayerId,
        data: { targetId: policeTarget.id }
      })
    })

    // Check if host can see the police action
    const hostView3 = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })

    if (!hostView3.roundState?.police_inspect_player_id) {
      throw new Error('Host cannot see police action')
    }
    console.log(`✅ Host can see police inspected target: ${policeTarget.name}`)

    // Step 4d: Verify all actions are visible to host
    console.log('📝 Step 4d: Verifying all actions are visible to host...')
    const finalHostView = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameId}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })

    const roundState = finalHostView.roundState
    if (!roundState?.wolf_target_player_id) {
      throw new Error('Host cannot see werwolf action in final view')
    }
    if (!roundState?.doctor_save_player_id) {
      throw new Error('Host cannot see doctor action in final view')
    }
    if (!roundState?.police_inspect_player_id) {
      throw new Error('Host cannot see police action in final view')
    }

    console.log('✅ All actions are visible to host:')
    console.log(`  - Werwolf selected: ${roundState.wolf_target_player_id}`) // may be CSV of wolfId:targetId pairs
    console.log(`  - Doctor saved: ${roundState.doctor_save_player_id}`)
    console.log(`  - Police inspected: ${roundState.police_inspect_player_id}`)
  }

  async runTests() {
    try {
      await this.setupGame()
      await this.assignRolesAndStart()
      await this.testActionVisibility()
      
      console.log('\n🎉 Action Visibility Test Completed Successfully!')
      console.log('✅ Host can see werwolf actions in real-time')
      console.log('✅ Host can see doctor actions in real-time')
      console.log('✅ Host can see police actions in real-time')
      console.log('✅ All actions persist and are visible to host')
    } catch (error) {
      console.error('❌ Action Visibility Test Failed:', error.message)
      process.exit(1)
    }
  }
}

if (require.main === module) {
  console.log('🧪 Testing Action Visibility...')
  const test = new ActionVisibilityTest()
  test.runTests()
}
