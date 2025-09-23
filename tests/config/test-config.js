/**
 * Test Configuration for Werwolf Game
 * Centralized configuration for all test suites
 */

const config = {
  // Test environments
  environments: {
    local: {
      baseUrl: 'http://localhost:3001',
      timeout: 30000,
      retries: 3
    },
    staging: {
      baseUrl: 'https://wearwolf-staging.vercel.app',
      timeout: 45000,
      retries: 2
    },
    production: {
      baseUrl: 'https://wearwolf-1f1xv9dk7-faizuddin0019s-projects.vercel.app',
      timeout: 60000,
      retries: 1
    }
  },
  
  // Test data
  testData: {
    hostName: 'TestHost',
    playerNames: [
      'Player1', 'Player2', 'Player3', 'Player4', 
      'Player5', 'Player6', 'Player7', 'Player8'
    ],
    roles: ['villager', 'werewolf', 'doctor', 'police']
  },
  
  // Test scenarios
  scenarios: {
    endGameLogic: {
      description: 'Test end game logic when only 2 players remain',
      requiredPlayers: 6,
      testSteps: [
        'create_game',
        'join_players',
        'assign_roles',
        'eliminate_players',
        'check_win_condition'
      ]
    },
    hostExclusion: {
      description: 'Test host exclusion from win conditions',
      requiredPlayers: 6,
      testSteps: [
        'create_game',
        'join_players',
        'assign_roles',
        'eliminate_all_non_host',
        'verify_host_exclusion'
      ]
    },
    winnerDeclaration: {
      description: 'Test winner declaration closeable functionality',
      requiredPlayers: 6,
      testSteps: [
        'create_game',
        'join_players',
        'assign_roles',
        'reach_end_state',
        'test_closeable'
      ]
    },
    realTimeSync: {
      description: 'Test real-time sync and frame refresh',
      requiredPlayers: 6,
      testSteps: [
        'create_game',
        'join_players',
        'test_real_time_updates',
        'test_vote_sync',
        'verify_immediate_refresh'
      ]
    },
    reorderedNightPhases: {
      description: 'Test reordered night phases: Wolf → Police → Doctor',
      requiredPlayers: 6,
      testSteps: [
        'create_game',
        'join_players',
        'assign_roles',
        'test_wolf_phase',
        'test_police_phase',
        'test_doctor_phase',
        'verify_phase_order'
      ]
    },
    manualVotingControls: {
      description: 'Test manual voting controls and host-controlled phases',
      requiredPlayers: 6,
      testSteps: [
        'create_game',
        'join_players',
        'assign_roles',
        'complete_night_phases',
        'test_manual_begin_voting',
        'test_manual_final_vote',
        'verify_no_automatic_transitions'
      ]
    },
    hostButtonLabels: {
      description: 'Test host button labels and phase-specific visibility',
      requiredPlayers: 6,
      testSteps: [
        'create_game',
        'join_players',
        'assign_roles',
        'test_lobby_buttons',
        'test_night_phase_buttons',
        'test_voting_buttons',
        'verify_button_visibility'
      ]
    },
    completeGameFlow: {
      description: 'Test complete game flow with new host controls',
      requiredPlayers: 6,
      testSteps: [
        'create_game',
        'join_players',
        'assign_roles',
        'complete_full_night_cycle',
        'test_manual_voting_cycle',
        'test_player_elimination',
        'verify_game_continuation'
      ]
    }
  },
  
  // Test assertions
  assertions: {
    gamePhases: {
      lobby: 'lobby',
      nightWolf: 'night_wolf',
      nightDoctor: 'night_doctor',
      nightPolice: 'night_police',
      dayVote: 'day_vote',
      dayFinalVote: 'day_final_vote',
      ended: 'ended'
    },
    winStates: {
      villagers: 'villagers',
      werewolves: 'werewolves'
    },
    playerRoles: {
      villager: 'villager',
      werewolf: 'werewolf',
      doctor: 'doctor',
      police: 'police'
    }
  },
  
  // Test utilities
  utilities: {
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    generateClientId: (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    
    assert: (condition, message) => {
      if (!condition) {
        throw new Error(message)
      }
    },
    
    log: (message, type = 'info') => {
      const timestamp = new Date().toISOString()
      const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔧'
      console.log(`${prefix} [${timestamp}] ${message}`)
    }
  }
}

module.exports = config
