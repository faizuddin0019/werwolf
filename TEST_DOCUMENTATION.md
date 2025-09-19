# Werwolf Game - Test Documentation

## Overview

This document describes the comprehensive test suite for the Werwolf game application, specifically focusing on the leave game functionality and related features.

## Test Scripts

### 1. Quick Tests (`test-quick.js`)
**Purpose**: Basic functionality verification
**Duration**: ~30 seconds
**Usage**: `npm run test:quick`

**Tests**:
- Server connectivity
- Game creation
- Game joining
- Game data retrieval
- Player leave game
- Host leave game
- Game cleanup
- Error handling

### 2. Comprehensive Tests (`test-leave-game.js`)
**Purpose**: Full leave game scenario testing
**Duration**: ~2-3 minutes
**Usage**: `npm run test:leave-game`

**Test Scenarios**:

#### Scenario 1: Host Leaving in Lobby
- **Setup**: Create game with host + 2 players
- **Action**: Host leaves
- **Expected**: Game ends, all data cleaned up
- **Verification**: Game not found in database

#### Scenario 2: Regular Player Leaving in Lobby
- **Setup**: Create game with host + 2 players
- **Action**: Regular player leaves
- **Expected**: Game continues with remaining players
- **Verification**: Game exists with reduced player count

#### Scenario 3: Player Leaving During Active Game
- **Setup**: Create game with 6 players, start game
- **Action**: Player leaves during active gameplay
- **Expected**: Game ends (drops below 6 players)
- **Verification**: Game deleted, all data cleaned up

#### Scenario 4: Data Cleanup Verification
- **Setup**: Create game with multiple players, start game
- **Action**: End game
- **Expected**: Complete data cleanup
- **Verification**: All related data deleted from database

#### Scenario 5: Multiple Players Leaving
- **Setup**: Create game with 8 players, start game
- **Action**: Players leave one by one
- **Expected**: Game continues until < 6 players, then ends
- **Verification**: Game ends at correct threshold

#### Scenario 6: Error Handling
- **Setup**: Various invalid scenarios
- **Action**: Attempt invalid operations
- **Expected**: Proper error responses
- **Verification**: No crashes, appropriate error messages

## Test Data

### Game States Tested
- **Lobby Phase**: Players can join/leave freely
- **Active Game**: Players leaving affects game state
- **Ended Game**: Complete cleanup and redirect

### Player Counts Tested
- **2-5 players**: Lobby phase, free leaving
- **6 players**: Minimum for game start
- **7-8 players**: Active game with buffer
- **< 6 players**: Auto-end during active game

### Client Scenarios
- **Valid clients**: Normal operations
- **Invalid clients**: Error handling
- **Non-existent games**: Error responses
- **Permission checks**: Host vs player actions

## API Endpoints Tested

### Game Management
- `POST /api/games` - Create game
- `POST /api/games/join` - Join game
- `GET /api/games?code={code}` - Get game data

### Game Actions
- `POST /api/games/{id}/actions` - Game actions
  - `assign_roles` - Start game
  - `leave_game` - Leave game
  - `end_game` - End game

## Database Operations Tested

### Data Creation
- Game records
- Player records
- Round states
- Votes

### Data Cleanup
- Game deletion
- Player deletion
- Round state deletion
- Vote deletion
- Cascade cleanup

## Real-time Features Tested

### WebSocket Updates
- Game state changes
- Player list updates
- Game end notifications

### State Synchronization
- Cross-tab updates
- Page refresh persistence
- Automatic redirects

## Error Scenarios Tested

### Invalid Requests
- Non-existent game IDs
- Invalid client IDs
- Missing parameters
- Permission violations

### Edge Cases
- Concurrent operations
- Network timeouts
- Database errors
- State inconsistencies

## Performance Considerations

### Response Times
- Game creation: < 2 seconds
- Game joining: < 2 seconds
- Leave game: < 1 second
- Data cleanup: < 3 seconds

### Concurrent Users
- Multiple players joining simultaneously
- Multiple players leaving simultaneously
- Host and players operating concurrently

## Test Environment Requirements

### Prerequisites
- Node.js server running on localhost:3000
- Supabase database configured
- Environment variables set
- Database schema deployed

### Test Data Isolation
- Each test uses unique client IDs
- Tests clean up after themselves
- No shared state between tests
- Fresh game codes for each test

## Running Tests

### Individual Test Suites
```bash
# Quick functionality test
npm run test:quick

# Comprehensive leave game tests
npm run test:leave-game
```

### All Tests
```bash
# Run all test suites
npm run test:all
```

### Manual Testing
1. Start the development server: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Create a game and test scenarios manually
4. Use browser developer tools to monitor network requests

## Test Results Interpretation

### Success Criteria
- All tests pass (exit code 0)
- No database errors in logs
- Proper cleanup completed
- Real-time updates working

### Failure Indicators
- Test failures (exit code 1)
- Database constraint violations
- Memory leaks or orphaned data
- Inconsistent state

## Continuous Integration

### Pre-deployment Testing
```bash
# Run before deployment
npm run build && npm run test:all
```

### Development Testing
```bash
# Run during development
npm run test:quick
```

## Troubleshooting

### Common Issues
1. **Server not running**: Ensure `npm run dev` is active
2. **Database errors**: Check Supabase configuration
3. **Port conflicts**: Verify localhost:3000 is available
4. **Environment variables**: Ensure `.env.local` is configured

### Debug Mode
- Add `console.log` statements in test files
- Monitor browser network tab
- Check Supabase dashboard for database state
- Review server logs for errors

## Test Maintenance

### Adding New Tests
1. Add test case to appropriate test file
2. Update documentation
3. Verify test isolation
4. Test cleanup procedures

### Updating Tests
1. Update test data as needed
2. Adjust timeouts if necessary
3. Update expected results
4. Verify backward compatibility

## Security Testing

### Authentication
- Client ID validation
- Game ownership verification
- Action permission checks

### Data Protection
- No sensitive data exposure
- Proper error messages
- Input validation
- SQL injection prevention

## Performance Testing

### Load Testing
- Multiple concurrent games
- Large player counts
- Rapid state changes
- Database connection limits

### Stress Testing
- Maximum player limits
- Extended game sessions
- Memory usage monitoring
- Cleanup efficiency

---

*Last Updated: $(date)*
*Test Suite Version: 1.0*
