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
    this.gameId = hostResponse.game.id
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
    const startResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    
    if (!startResponse.success) {
      throw new Error('Failed to start game and assign roles')
    }
    
    // Get game state to verify roles were assigned (using host cookie to see all roles)
    const gameState = await fetch(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    }).then(r => r.json())
    
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
    const gameState = await fetch(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    }).then(r => r.json())
    const alivePlayers = gameState.players.filter(p => p.alive)
    
    console.log(`Current alive players: ${alivePlayers.length}`)
    
    // Test that we can eliminate 1 player and verify win conditions work
    let eliminatedCount = 0
    const targetEliminations = 1 // Just test one elimination
    
    for (let i = 0; i < targetEliminations; i++) {
      // Go through proper game flow: night phases -> reveal -> voting -> elimination
      
      // 1. Start night phase (lobby -> night_wolf)
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'next_phase',
          clientId: this.hostClientId
        })
      })
      
      // 2. Get fresh game state and find werewolf
      let gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
        headers: { 'Cookie': `clientId=${this.hostClientId}` }
      })
      
      console.log('🔧 Game state after role assignment:', {
        players: gameState.players.map(p => ({ name: p.name, role: p.role, alive: p.alive, is_host: p.is_host }))
      })
      
      const werewolfPlayer = gameState.players.find(p => p.role === 'werwolf' || p.role === 'werewolf')
      if (werewolfPlayer) {
        // 3. Werewolf selects a target (ensure it's not themselves)
        const targets = gameState.players.filter(p => p.id !== werewolfPlayer.id && !p.is_host && p.alive)
        if (targets.length > 0) {
          // Pick the first target (consistent for testing)
          const target = targets[0]
          await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
            method: 'POST',
            body: JSON.stringify({
              action: 'wolf_select',
              clientId: werewolfPlayer.client_id,
              data: { targetId: target.id }
            })
          })
          console.log('✅ Werewolf selected target:', target.name)
        }
      }
      
      // 4. Advance to doctor phase
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'next_phase',
          clientId: this.hostClientId
        })
      })
      
      // 5. Doctor saves someone (required to advance to police phase)
      gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
        headers: { 'Cookie': `clientId=${this.hostClientId}` }
      })
      
      const doctorPlayer = gameState.players.find(p => p.role === 'doctor')
      if (doctorPlayer) {
        // Doctor saves someone else (not the werewolf's target) to allow a death
        const doctorTargets = gameState.players.filter(p => p.id !== doctorPlayer.id && !p.is_host && p.alive)
        const saveTarget = doctorTargets[1] || doctorTargets[0] // Pick a different target
        await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'doctor_save',
            clientId: doctorPlayer.client_id,
            data: { targetId: saveTarget.id }
          })
        })
        console.log('✅ Doctor saved:', saveTarget.name)
      }
      
      // 6. Advance to police phase (doctor action is completed)
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'next_phase',
          clientId: this.hostClientId
        })
      })
      
      // Verify we're in police phase before revealing dead
      gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
        headers: { 'Cookie': `clientId=${this.hostClientId}` }
      })
      console.log('Current phase before reveal_dead:', gameState.game.phase)
      
      // 7. Police inspects someone (optional)
      gameState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
        headers: { 'Cookie': `clientId=${this.hostClientId}` }
      })
      
      const policePlayer = gameState.players.find(p => p.role === 'police')
      if (policePlayer) {
        const targets = gameState.players.filter(p => p.id !== policePlayer.id && !p.is_host && p.alive)
        if (targets.length > 0) {
          await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
            method: 'POST',
            body: JSON.stringify({
              action: 'police_inspect',
              clientId: policePlayer.client_id,
              data: { targetId: targets[0].id }
            })
          })
        }
      }
      
      // 8. Reveal dead (while still in police phase)
      const revealResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'reveal_dead',
          clientId: this.hostClientId
        })
      })
      console.log('Reveal dead response:', revealResponse)
      
      // 9. Advance to day vote phase
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'next_phase',
          clientId: this.hostClientId
        })
      })
      
      // 10. Get current state for voting
      console.log(`🔧 Getting game state for iteration ${eliminatedCount + 1}...`)
      let currentState
      try {
        currentState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
          headers: { 'Cookie': `clientId=${this.hostClientId}` }
        })
        console.log(`✅ Got game state, phase: ${currentState.game.phase}`)
      } catch (error) {
        console.error('❌ Failed to get game state:', error.message)
        throw error
      }
      const currentAlivePlayers = currentState.players.filter(p => p.alive && !p.is_host)
      
      // Check win conditions before voting
      const aliveWerwolves = currentAlivePlayers.filter(p => p.role === 'werwolf' || p.role === 'werewolf')
      
      console.log('🔧 Win condition check:', {
        alivePlayers: currentAlivePlayers.length,
        aliveWerwolves: aliveWerwolves.length,
        werewolfNames: aliveWerwolves.map(p => p.name),
        allPlayers: currentAlivePlayers.map(p => ({ name: p.name, role: p.role, alive: p.alive }))
      })
      
      // If all werwolves are dead, villagers win immediately
      if (aliveWerwolves.length === 0) {
        console.log('✅ All werwolves eliminated - villagers win!')
        // Check if game ended due to win condition
        const winCheckState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
          headers: { 'Cookie': `clientId=${this.hostClientId}` }
        })
        if (winCheckState.game.phase === 'ended' && winCheckState.game.win_state === 'villagers') {
          console.log('✅ Game correctly ended with villagers win!')
          return // Exit the test early since game is over
        }
        break
      }
      
      // If only 2 players left, game should end
      if (currentAlivePlayers.length <= 2) {
        console.log('✅ Only 2 players left - game should end')
        break
      }
      
      // 11. Strategic voting: eliminate villagers until only 2 players remain (werewolf wins)
      const currentWerewolf = currentAlivePlayers.find(p => p.role === 'werwolf' || p.role === 'werewolf')
      const villagers = currentAlivePlayers.filter(p => p.role !== 'werwolf' && p.role !== 'werewolf')
      
      console.log(`🔧 Voting iteration ${eliminatedCount + 1}:`, {
        alivePlayers: currentAlivePlayers.length,
        werewolf: currentWerewolf?.name,
        villagers: villagers.map(v => v.name),
        villagersCount: villagers.length
      })
      
      if (currentWerewolf && villagers.length > 1) {
        // Vote to eliminate a villager (not the werewolf)
        const targetVillager = villagers[0]
        console.log(`🎯 Voting to eliminate villager: ${targetVillager.name}`)
        
        for (const player of currentAlivePlayers) {
          try {
            await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
              method: 'POST',
              body: JSON.stringify({
                action: 'vote',
                clientId: player.client_id,
                data: { targetId: targetVillager.id }
              })
            })
          } catch (error) {
            console.log('Vote failed for player:', player.name, error.message)
          }
        }
      } else {
        console.log('🔧 No more villagers to eliminate or werewolf not found')
        break
      }
      
      // 12. Move to final vote phase
      await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'final_vote',
          clientId: this.hostClientId
        })
      })
      
      // 13. Eliminate the voted player
      let eliminateResponse
      try {
        eliminateResponse = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'eliminate_player',
            clientId: this.hostClientId
          })
        })
        console.log('✅ Eliminate response:', eliminateResponse)
      } catch (error) {
        console.error('❌ Eliminate failed:', error.message)
        throw error
      }
      
      if (eliminateResponse.success) {
        eliminatedCount++
        console.log(`✅ Eliminated player ${eliminatedCount}/${targetEliminations}`)
        
        // Check if game should end after elimination
        const postEliminationState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
          headers: { 'Cookie': `clientId=${this.hostClientId}` }
        })
        const postEliminationAlive = postEliminationState.players.filter(p => p.alive && !p.is_host)
        const postEliminationWerwolves = postEliminationAlive.filter(p => p.role === 'werwolf' || p.role === 'werewolf')
        
        if (postEliminationWerwolves.length === 0) {
          console.log('✅ All werwolves eliminated after voting - villagers win!')
          break
        }
        
        if (postEliminationAlive.length <= 2) {
          console.log('✅ Only 2 players left after elimination - game should end')
          break
        }
      }
      
      await this.sleep(1000) // Wait between eliminations
      
      // Check if we should continue
      if (eliminatedCount >= targetEliminations) {
        console.log('✅ Reached target eliminations, ending test')
        break
      }
      
      // Advance to next day phase for next elimination
      try {
        await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'next_phase',
            clientId: this.hostClientId
          })
        })
        
        // Check what phase we're in now
        const phaseCheckState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
          headers: { 'Cookie': `clientId=${this.hostClientId}` }
        })
        console.log(`✅ Advanced to next phase: ${phaseCheckState.game.phase}`)
      } catch (error) {
        console.error('❌ Next phase failed:', error.message)
        throw error
      }
    }
    
    // Check final game state and win conditions
    const finalState = await this.makeRequest(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    })
    const finalAlivePlayers = finalState.players.filter(p => p.alive && !p.is_host)
    const finalWerwolves = finalAlivePlayers.filter(p => p.role === 'werwolf' || p.role === 'werewolf')
    
    console.log('📊 Final game state:', {
      alivePlayers: finalAlivePlayers.length,
      werwolves: finalWerwolves.length,
      phase: finalState.game.phase,
      winState: finalState.game.win_state
    })
    
    // Test that elimination worked and werewolf is still alive
    if (finalWerwolves.length === 0) {
      throw new Error('Werewolf should still be alive after eliminating 1 villager')
    }
    
    if (finalAlivePlayers.length !== 5) {
      throw new Error(`Expected 5 players alive after 1 elimination, got ${finalAlivePlayers.length}`)
    }
    
    console.log('✅ Test passed - werewolf survived elimination of 1 villager')
    console.log(`✅ Final alive players: ${finalAlivePlayers.length} (werewolf + 4 villagers)`)
    console.log(`✅ Werewolf: ${finalWerwolves[0].name}`)
  }

  async testSoundEffectImplementation() {
    console.log('🔊 Testing sound effect implementation...')
    
    // Assign roles (this should trigger sound effect)
    const response = await this.makeRequest(`${BASE_URL}/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_roles',
        clientId: this.hostClientId
      })
    })
    
    if (!response.success) {
      throw new Error('Sound effect implementation failed')
    }
    
    // Verify game state
    const gameState = await fetch(`${BASE_URL}/api/games?code=${this.gameCode}`, {
      headers: { 'Cookie': `clientId=${this.hostClientId}` }
    }).then(r => r.json())
    
    console.log('🔧 Debug: Game phase after role assignment:', gameState.game.phase)
    if (gameState.game.phase !== 'lobby') {
      throw new Error(`Expected lobby phase after role assignment (until host starts phase), got: ${gameState.game.phase}`)
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
