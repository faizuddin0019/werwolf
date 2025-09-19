# Test Documentation - Real-time Synchronization

This document describes the comprehensive test suite for the Werwolf game's real-time synchronization features.

## Overview

The test suite addresses all critical issues that were fixed today:

1. **Player Join Visibility** - Real-time updates without refresh
2. **Werwolf Turn Progression** - Automatic phase advancement
3. **Police Inspect Response** - Yes/no based on actual detection
4. **Host Role Actions Visibility** - Real-time round state updates
5. **Real-time Synchronization** - Multiple clients consistency
6. **Edge Cases and Error Handling** - Robust error handling

## Test Files

### `test-realtime-sync.js`
Main test file containing all test cases for real-time synchronization.

### `run-realtime-tests.sh`
Shell script to run the tests with proper environment setup.

## Test Cases

### Test 1: Player Join Visibility
**Purpose**: Verify that host and players can see who joins without page refresh.

**Steps**:
1. Create a game with a host
2. Add 6 players sequentially
3. Verify each player is visible to all participants
4. Check that player count updates in real-time

**Expected Results**:
- All 7 players (1 host + 6 players) are visible
- No page refresh required
- Real-time updates work correctly

### Test 2: Werwolf Turn Progression
**Purpose**: Verify that game phases advance automatically after player actions.

**Steps**:
1. Start the game (assign roles)
2. Verify game is in `night_wolf` phase
3. Werewolf selects a target
4. Verify phase automatically advances to `night_police`
5. Police inspects a target
6. Verify phase automatically advances to `night_doctor`
7. Doctor saves a target
8. Verify phase automatically advances to `reveal`

**Expected Results**:
- Game starts in `night_wolf` phase
- Each action automatically advances to the next phase
- No manual host intervention required

### Test 3: Police Inspect Response
**Purpose**: Verify that police get correct yes/no responses based on actual role detection.

**Steps**:
1. Find police, werewolf, and villager players
2. Police inspects werewolf → should return `'werewolf'`
3. Police inspects villager → should return `'not_werewolf'`
4. Police inspects doctor → should return `'not_werewolf'`

**Expected Results**:
- Police correctly detects werewolf as `'werewolf'`
- Police correctly detects non-werewolves as `'not_werewolf'`
- Results are based on actual database role data

### Test 4: Host Role Actions Visibility
**Purpose**: Verify that host can see all role actions and results in real-time.

**Steps**:
1. Reset game to `night_wolf` phase
2. Werewolf selects target → verify round state update
3. Police inspects target → verify round state update with result
4. Doctor saves target → verify round state update
5. Verify all actions are visible in round state

**Expected Results**:
- Host can see werewolf target selection
- Host can see police inspection results with werewolf/not werewolf tags
- Host can see doctor save actions
- All updates happen without page refresh

### Test 5: Real-time Synchronization
**Purpose**: Verify that multiple clients see consistent game state.

**Steps**:
1. Create a new game with multiple players
2. Start the game
3. Simulate multiple clients fetching game state
4. Verify all clients see the same game state
5. Perform a role action
6. Verify all clients see the update in real-time

**Expected Results**:
- All clients see consistent game state
- Phase changes are synchronized across all clients
- Real-time updates work for multiple clients

### Test 6: Edge Cases and Error Handling
**Purpose**: Verify robust error handling for edge cases.

**Steps**:
1. Test invalid game code → should return error
2. Test invalid client ID → should return error
3. Test duplicate player join → should return error
4. Test action without proper role → should return error

**Expected Results**:
- All edge cases are handled gracefully
- Appropriate error messages are returned
- System remains stable

## Running Tests

### Local Development
```bash
# Run against local development server
npm run test:realtime:local

# Or directly
TEST_BASE_URL=http://localhost:3000 node test-realtime-sync.js
```

### Production
```bash
# Run against production server
npm run test:realtime:prod

# Or directly
TEST_BASE_URL=https://wearwolf-theta.vercel.app node test-realtime-sync.js
```

### All Tests
```bash
# Run all test suites
npm run test:all
```

### Shell Script
```bash
# Make executable and run
chmod +x run-realtime-tests.sh
./run-realtime-tests.sh
```

## Test Configuration

### Environment Variables
- `TEST_BASE_URL`: Base URL for the application (default: `http://localhost:3000`)

### Test Data
- Each test generates unique client IDs using timestamps and random strings
- Test games are automatically cleaned up after completion
- Tests use realistic player names and scenarios

## Expected Output

### Successful Test Run
```
🚀 Starting Comprehensive Real-time Synchronization Tests
================================================================================
Testing against: http://localhost:3000
================================================================================

🧪 Test 1: Player Join Visibility (Real-time Updates)
============================================================
✅ Game created with code: 123456
✅ Player Alice joined (2 total players)
✅ Player Bob joined (3 total players)
...
✅ All 7 players successfully joined and visible

🧪 Test 2: Werwolf Turn Progression (Automatic Phase Advancement)
============================================================
✅ Game started, roles assigned
✅ Game in night_wolf phase
✅ Found werewolf: Alice
✅ Found target: Bob
✅ Werewolf selected target
✅ Phase automatically advanced to night_police
...
✅ All automatic phase progressions working correctly

📊 Test Results Summary
================================================================================
✅ PASSED - Player Join Visibility
✅ PASSED - Werwolf Turn Progression
✅ PASSED - Police Inspect Response
✅ PASSED - Host Role Actions Visibility
✅ PASSED - Real-time Synchronization
✅ PASSED - Edge Cases and Error Handling
================================================================================
Total: 6/6 tests passed
🎉 All tests passed! Real-time synchronization is working correctly.
```

### Failed Test Run
```
❌ Test 2 failed: Expected phase 'night_police', got 'night_wolf'
⚠️ Some tests failed. Please check the issues above.
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the application is running
   - Check the TEST_BASE_URL is correct
   - Verify the port is accessible

2. **Test Timeouts**
   - Increase sleep delays in tests
   - Check network connectivity
   - Verify Supabase connection

3. **Database Errors**
   - Ensure Supabase is properly configured
   - Check environment variables
   - Verify database schema is up to date

4. **Real-time Sync Issues**
   - Check Supabase real-time configuration
   - Verify WebSocket connections
   - Check browser console for errors

### Debug Mode
Add debug logging by modifying the test file:
```javascript
// Add at the top of test functions
console.log('🔍 Debug: Current game state:', gameResponse.data)
```

## Integration with CI/CD

The tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Real-time Tests
  run: |
    npm run test:realtime:prod
  env:
    TEST_BASE_URL: ${{ secrets.TEST_BASE_URL }}
```

## Maintenance

### Adding New Tests
1. Add new test function to `test-realtime-sync.js`
2. Add test to the `tests` array in `runAllTests()`
3. Update this documentation
4. Test the new test case

### Updating Existing Tests
1. Modify the test function
2. Update expected results in documentation
3. Verify test still passes
4. Update any related documentation

## Performance Considerations

- Tests include appropriate delays for real-time synchronization
- Each test cleans up after itself
- Tests can be run in parallel (with different game codes)
- Consider rate limiting for production testing

## Security Considerations

- Tests use test-specific client IDs
- No sensitive data is logged
- Tests clean up after completion
- Production tests should use test accounts only