# Quick Test Guide - Real-time Synchronization

## 🚀 Quick Start

### Run Tests Locally (Development)
```bash
npm run test:realtime:local
```

### Run Tests Against Production
```bash
npm run test:realtime:prod
```

### Run All Tests
```bash
npm run test:all
```

## 📋 What These Tests Cover

✅ **Player Join Visibility** - Host and players see who joins without refresh  
✅ **Werwolf Turn Progression** - Game phases advance automatically  
✅ **Police Inspect Response** - Correct yes/no responses based on actual detection  
✅ **Host Role Actions Visibility** - Host sees all actions and results in real-time  
✅ **Real-time Synchronization** - Multiple clients see consistent state  
✅ **Edge Cases** - Robust error handling for invalid inputs  

## 🔧 Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:realtime` | Run against default localhost:3000 |
| `npm run test:realtime:local` | Run against localhost:3000 |
| `npm run test:realtime:prod` | Run against production Vercel app |
| `./run-realtime-tests.sh` | Run using shell script |
| `node test-realtime-sync.js` | Run directly with Node.js |

## 📊 Expected Results

### ✅ Success
```
🎉 All tests passed! Real-time synchronization is working correctly.
Total: 6/6 tests passed
```

### ❌ Failure
```
⚠️ Some tests failed. Please check the issues above.
Total: 4/6 tests passed
```

## 🐛 Troubleshooting

### Application Not Running
```bash
# Start the application first
npm run dev
# Then run tests
npm run test:realtime:local
```

### Production Tests Failing
```bash
# Check if production is deployed
curl https://wearwolf-theta.vercel.app/api/games
# Should return JSON, not 404
```

### Database Issues
- Ensure Supabase is configured
- Check environment variables
- Verify database schema is up to date

## 📝 Test Output Example

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
✅ Player Charlie joined (4 total players)
✅ Player David joined (5 total players)
✅ Player Eve joined (6 total players)
✅ Player Frank joined (7 total players)
✅ All 7 players successfully joined and visible

🧪 Test 2: Werwolf Turn Progression (Automatic Phase Advancement)
============================================================
✅ Game started, roles assigned
✅ Game in night_wolf phase
✅ Found werewolf: Alice
✅ Found target: Bob
✅ Werewolf selected target
✅ Phase automatically advanced to night_police
✅ Found police: Charlie
✅ Police inspected target
✅ Phase automatically advanced to night_doctor
✅ Found doctor: David
✅ Doctor saved target
✅ Phase automatically advanced to reveal
✅ All automatic phase progressions working correctly

🧪 Test 3: Police Inspect Response (Yes/No Based on Actual Detection)
============================================================
✅ Found police: Charlie
✅ Found werewolf: Alice
✅ Found villager: Bob
✅ Police correctly detected werewolf
✅ Police correctly detected villager as not werewolf
✅ Police correctly detected doctor as not werewolf
✅ All police inspect responses working correctly

🧪 Test 4: Host Role Actions Visibility (Real-time Round State Updates)
============================================================
✅ Found werewolf: Alice
✅ Found police: Charlie
✅ Found doctor: David
✅ Found target: Bob
✅ Game reset to night_wolf phase
✅ Werewolf selected target
✅ Round state updated with werewolf target
✅ Police inspected target
✅ Round state updated with police inspect result
✅ Doctor saved target
✅ Round state updated with doctor save action
✅ All role actions visible in round state
✅ Host can see all role actions and results in real-time

🧪 Test 5: Real-time Synchronization (Multiple Clients)
============================================================
✅ Test game created with code: 789012
✅ Player Player1 joined
✅ Player Player2 joined
✅ Player Player3 joined
✅ Player Player4 joined
✅ Player Player5 joined
✅ Player Player6 joined
✅ Game started
✅ All clients see consistent game state
✅ Werewolf action performed
✅ All clients see phase change in real-time
✅ Real-time synchronization working correctly

🧪 Test 6: Edge Cases and Error Handling
============================================================
✅ Invalid game code handled correctly
✅ Invalid client ID handled correctly
✅ Duplicate client ID handled correctly
✅ Invalid role action handled correctly
✅ All edge cases and error handling working correctly

🧹 Cleaning up test data...
✅ Test game ended successfully

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

## 🔄 Continuous Integration

Add to your CI/CD pipeline:

```yaml
- name: Run Real-time Tests
  run: npm run test:realtime:prod
  env:
    TEST_BASE_URL: ${{ secrets.TEST_BASE_URL }}
```

## 📚 Full Documentation

For detailed information, see [TEST_DOCUMENTATION.md](./TEST_DOCUMENTATION.md)
