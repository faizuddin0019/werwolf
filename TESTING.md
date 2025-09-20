# Testing Documentation for Werwolf Game

## Overview

This document describes the comprehensive testing strategy for the Werwolf game, including automated tests for critical game logic, real-time synchronization, and user interface components.

## Test Structure

### 1. End Game Logic Tests (`test-end-game-logic.js`)

Tests the critical game logic fixes implemented today:

#### Test Cases:
- **End Game Logic with Two Players**: Verifies that when only 2 non-host players remain, the game properly declares a winner based on werewolf status
- **Host Exclusion from Win Conditions**: Ensures the host is not counted in win condition calculations
- **Winner Declaration Closeable**: Tests that the host can close the winner declaration screen
- **Real-time Sync and Frame Refresh**: Verifies that all game events trigger immediate UI updates

#### Key Assertions:
- Game ends when only 2 non-host players remain
- Winner is declared based on werewolf status (not host)
- Host can close winner declaration
- Real-time updates work correctly

### 2. Test Configuration (`test-config.js`)

Centralized configuration for all test suites:
- Environment settings (local, staging, production)
- Test data and scenarios
- Assertion helpers
- Utility functions

### 3. Test Runner (`run-all-tests.sh`)

Comprehensive test runner that:
- Checks server availability
- Runs all test suites
- Provides detailed reporting
- Handles cleanup

## Running Tests

### Local Development
```bash
# Run end game logic tests
npm run test:end-game

# Run all new tests
npm run test:all-new

# Run tests with build verification
npm run test:build
```

### Production Testing
```bash
# Test against production environment
npm run test:end-game:prod
```

### Manual Testing
```bash
# Run the comprehensive test suite
./run-all-tests.sh
```

## Automated Testing

### Pre-commit Hooks
Tests run automatically before each commit:
- ESLint checking
- TypeScript type checking
- End game logic tests

### GitHub Actions
Automated testing on every push and pull request:
- Linting and type checking
- Build verification
- End game logic tests
- Production deployment tests

### CI/CD Pipeline
1. **Code Quality**: ESLint and TypeScript checks
2. **Build Verification**: Application builds successfully
3. **Functional Testing**: End game logic tests
4. **Production Testing**: Tests against deployed environment
5. **Deployment**: Automatic deployment to Vercel

## Test Scenarios

### Scenario 1: End Game Logic
**Objective**: Verify correct winner declaration when only 2 players remain

**Steps**:
1. Create game with 6 players
2. Assign roles (1 werewolf, 5 villagers)
3. Eliminate 4 players
4. Verify game ends and winner is declared correctly

**Expected Results**:
- Game phase changes to 'ended'
- Win state is set based on werewolf status
- Host is excluded from win calculations

### Scenario 2: Host Exclusion
**Objective**: Ensure host doesn't affect win conditions

**Steps**:
1. Create game with 6 players
2. Assign roles
3. Eliminate all non-host players
4. Verify host is excluded from win calculations

**Expected Results**:
- Host remains alive but doesn't affect win state
- Game ends with correct winner declaration

### Scenario 3: Winner Declaration UI
**Objective**: Test closeable winner declaration

**Steps**:
1. Reach end game state
2. Verify winner declaration appears
3. Test host can close the declaration
4. Verify game can be ended

**Expected Results**:
- Winner declaration is closeable by host
- Game can be properly ended

### Scenario 4: Real-time Synchronization
**Objective**: Verify immediate UI updates

**Steps**:
1. Create game and join players
2. Perform various game actions
3. Verify immediate UI updates
4. Test vote synchronization

**Expected Results**:
- All game events trigger immediate UI updates
- Real-time sync works across all players

## Test Data

### Player Configuration
- **Host**: 1 player (excluded from win conditions)
- **Non-host Players**: 6 players (included in win conditions)
- **Roles**: villager, werewolf, doctor, police

### Game Phases
- lobby → night_wolf → night_doctor → night_police → day_vote → day_final_vote → ended

### Win States
- villagers: All werewolves eliminated
- werewolves: Werewolves outnumber villagers

## Environment Variables

Required for testing:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TEST_BASE_URL=http://localhost:3000  # Optional, defaults to localhost
```

## Troubleshooting

### Common Issues

1. **Server Not Responding**
   - Check if development server is running
   - Verify port 3000 is available
   - Check for firewall issues

2. **Supabase Connection Issues**
   - Verify environment variables are set
   - Check Supabase project status
   - Ensure database schema is up to date

3. **Test Timeouts**
   - Increase timeout values in test configuration
   - Check network connectivity
   - Verify server performance

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=true npm run test:end-game
```

## Contributing

When adding new tests:
1. Follow the modular approach
2. Use the centralized configuration
3. Add appropriate assertions
4. Update this documentation
5. Ensure tests run in CI/CD pipeline

## Test Coverage

Current test coverage includes:
- ✅ End game logic
- ✅ Host exclusion from win conditions
- ✅ Winner declaration UI
- ✅ Real-time synchronization
- ✅ Game phase transitions
- ✅ Vote counting
- ✅ Role assignment

Future test coverage planned:
- 🔄 Mobile UI responsiveness
- 🔄 Performance optimization
- 🔄 Error handling
- 🔄 Edge cases
- 🔄 Load testing
