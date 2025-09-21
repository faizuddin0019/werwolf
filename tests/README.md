# Werwolf Game Test Suite

This directory contains all test files organized by category and functionality.

## 📁 Directory Structure

```
tests/
├── core/                           # Core game logic tests
│   ├── game-logic.test.js         # Basic game mechanics
│   └── test-player-ordering.js    # Player ordering logic
├── security/                       # Security tests
│   ├── test-role-visibility.js    # Role visibility security
│   └── test-phase-timing-security.js # Phase timing security
├── ui/                            # UI and layout tests
│   ├── test-game-screen-layout.js # Game screen layout and styling
│   └── test-mobile-layout-ordering.js # Mobile layout ordering
├── integration/                    # Integration tests
│   └── real-time-sync.test.js     # Real-time synchronization
├── performance/                    # Performance tests
│   └── battery-optimization.test.js # Battery and performance
├── end-game/                       # End game logic tests
│   └── test-end-game-logic.js     # Winner declaration, host exclusion
├── game-flow/                      # Game flow tests
│   └── test-game-flow-improvements.js # Host controls, phase management
├── demo/                          # Demo and example tests
│   ├── test-demo.js               # General demo
│   └── test-game-flow-demo.js     # Game flow demo
├── config/                        # Test configuration
│   └── test-config.js             # Shared test configuration
├── run-all-tests.sh               # Main test runner with category support
├── run-comprehensive-tests.sh     # Comprehensive test suite
├── run-tests.sh                   # Legacy test runner
└── README.md                      # This file
```

## 🧪 Test Categories

### 1. Core Tests (`core/`)
- **Purpose**: Test fundamental game mechanics
- **Files**: `game-logic.test.js`, `test-player-ordering.js`
- **Coverage**: Basic game rules, player actions, win conditions, sound effects, player ordering logic

### 2. Security Tests (`security/`)
- **Purpose**: Test security features and access control
- **Files**: `test-role-visibility.js`, `test-phase-timing-security.js`
- **Coverage**: Role visibility security, phase timing security, access control

### 3. UI Tests (`ui/`)
- **Purpose**: Test user interface and layout
- **Files**: `test-game-screen-layout.js`, `test-mobile-layout-ordering.js`
- **Coverage**: Game screen layout, mobile layout ordering, responsive design

### 4. Integration Tests (`integration/`)
- **Purpose**: Test system integration and real-time features
- **Files**: `real-time-sync.test.js`
- **Coverage**: Real-time updates, state synchronization, multiplayer

### 5. Performance Tests (`performance/`)
- **Purpose**: Test performance and battery optimization
- **Files**: `battery-optimization.test.js`
- **Coverage**: Battery usage, animation performance, memory usage

### 6. End Game Tests (`end-game/`)
- **Purpose**: Test end game logic and winner declaration
- **Files**: `test-end-game-logic.js`
- **Coverage**: Win conditions, host exclusion, winner display

### 7. Game Flow Tests (`game-flow/`)
- **Purpose**: Test game flow and host controls
- **Files**: `test-game-flow-improvements.js`
- **Coverage**: Phase transitions, host controls, manual voting, werewolf screen timing, host control over night phase

### 8. Demo Tests (`demo/`)
- **Purpose**: Demo and example tests
- **Files**: `test-demo.js`, `test-game-flow-demo.js`
- **Coverage**: Test framework demonstration, example scenarios

## 🚀 Running Tests

### Individual Test Categories
```bash
# Core tests (game logic + player ordering)
npm run test:core

# Security tests (role visibility + phase timing)
npm run test:security

# UI tests (layout + mobile ordering)
npm run test:ui

# Integration tests (real-time sync)
npm run test:integration

# Performance tests
npm run test:performance

# End game tests
npm run test:end-game

# Game flow tests
npm run test:game-flow

# Demo tests
npm run test:demo
```

### Production Testing
```bash
# Test against production
npm run test:core:prod
npm run test:integration:prod
npm run test:performance:prod
npm run test:end-game:prod
npm run test:game-flow:prod
```

### Comprehensive Testing
```bash
# Run all tests locally
npm run test:comprehensive

# Run all tests against production
npm run test:comprehensive:prod

# Run all tests with new runner
npm run test:all

# Run all tests against production with new runner
npm run test:all:prod
```

### Quick Verification
```bash
# Run critical tests only
npm run test:verify-all

# Run build with tests
npm run test:build
```

## 🔧 Test Configuration

### Environment Variables
```bash
# Required for all tests
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Optional test configuration
export TEST_BASE_URL="http://localhost:3000"  # Default
export TEST_TIMEOUT="30000"                   # Default
```

### Test URLs
- **Local Development**: `http://localhost:3000`
- **Production**: `https://wearwolf-bewk9ijpj-faizuddin0019s-projects.vercel.app`

## 📊 Test Results

### Success Indicators
- ✅ **Green**: Test passed
- ❌ **Red**: Test failed
- 🔧 **Blue**: Test in progress
- ⚠️ **Yellow**: Warning or info

### Test Output Format
```
🧪 Running: Test Name
   File: tests/category/test-file.js
   URL: http://localhost:3000

✅ Test Name: PASSED
```

## 🛠️ Adding New Tests

### 1. Choose the Right Category
- **Core**: Basic game mechanics
- **Integration**: System integration
- **Performance**: Performance and optimization
- **End Game**: End game logic
- **Game Flow**: Game flow and controls
- **Today's Fixes**: Recent critical fixes
- **Demo**: Examples and demonstrations

### 2. Create Test File
```javascript
#!/usr/bin/env node

/**
 * Test Description
 * Brief description of what this test covers
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Test configuration
const TEST_CONFIG = {
  // Test-specific configuration
}

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔧'
  console.log(`${prefix} [${timestamp}] ${message}`)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

// Test functions
async function testFunction() {
  log('🧪 Testing specific functionality')
  
  try {
    // Test implementation
    assert(true, 'Test should pass')
    
    log('✅ Test passed')
    return true
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'error')
    return false
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting test suite')
  
  const tests = [
    { name: 'Test Name', fn: testFunction }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result) {
        passed++
      } else {
        failed++
      }
    } catch (error) {
      failed++
    }
  }
  
  log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  return failed === 0
}

// Run tests
if (require.main === module) {
  runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      log(`❌ Test suite failed: ${error.message}`, 'error')
      process.exit(1)
    })
}

module.exports = { runAllTests }
```

### 3. Update Test Runner
Add your test to the appropriate category in `run-all-tests.js`:

```javascript
const TEST_CATEGORIES = {
  'your-category': [
    'tests/your-category/your-test.js'
  ]
}
```

### 4. Add Package.json Script
```json
{
  "scripts": {
    "test:your-category": "node tests/your-category/your-test.js",
    "test:your-category:prod": "TEST_BASE_URL=https://wearwolf-bewk9ijpj-faizuddin0019s-projects.vercel.app node tests/your-category/your-test.js"
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   ❌ Missing Supabase environment variables
   ```
   **Solution**: Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Server Not Running**
   ```
   ❌ Server is not running
   ```
   **Solution**: Start the development server with `npm run dev`

3. **Test File Not Found**
   ```
   ❌ Test file not found: tests/category/test.js
   ```
   **Solution**: Check file path and ensure file exists

4. **Network Connectivity**
   ```
   ❌ Failed to connect to server
   ```
   **Solution**: Check network connection and server status

### Debug Mode
Set `NODE_ENV=development` for detailed logging:
```bash
NODE_ENV=development npm run test:todays-fixes
```

## 📚 Test Documentation

- **TESTING.md**: General testing documentation
- **TEST_SUMMARY.md**: Test suite summary
- **TEST_DOCUMENTATION.md**: Detailed test documentation
- **QUICK_TEST_GUIDE.md**: Quick start guide

## 🔄 Continuous Integration

Tests are automatically run:
- **Pre-commit**: Via Husky hooks
- **Build Process**: Via `npm run test:build`
- **Deployment**: Via Vercel build process

## 📈 Test Coverage

Current test coverage includes:
- ✅ **Game Logic**: Core mechanics and rules
- ✅ **Real-time Sync**: State synchronization
- ✅ **Performance**: Battery and performance optimization
- ✅ **End Game**: Winner declaration and host exclusion
- ✅ **Game Flow**: Host controls and phase management
- ✅ **Today's Fixes**: Recent critical fixes
- ✅ **Demo**: Test framework examples

## 🎯 Future Improvements

- [ ] Add unit tests for individual components
- [ ] Add visual regression tests
- [ ] Add accessibility tests
- [ ] Add cross-browser compatibility tests
- [ ] Add load testing for multiplayer scenarios
- [ ] Add automated test reporting
- [ ] Add test coverage reporting