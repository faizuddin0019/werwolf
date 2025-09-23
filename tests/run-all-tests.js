#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Runs all test suites organized by category
 */

import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3001'
const PROD_URL = 'https://wearwolf-bewk9ijpj-faizuddin0019s-projects.vercel.app'

// Test categories and their files
const TEST_CATEGORIES = {
  'core': [
    'tests/core/game-logic.test.js'
  ],
  'integration': [
    'tests/integration/real-time-sync.test.js'
  ],
  'performance': [
    'tests/performance/battery-optimization.test.js'
  ],
  'end-game': [
    'tests/end-game/test-end-game-logic.js'
  ],
  'game-flow': [
    'tests/game-flow/test-game-flow-improvements.js'
  ],
  'demo': [
    'tests/demo/test-demo.js',
    'tests/demo/test-game-flow-demo.js'
  ]
}

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔧'
  console.log(`${prefix} [${timestamp}] ${message}`)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Test runner function
async function runTest(testFile, testUrl) {
  return new Promise((resolve) => {
    log(`Running test: ${testFile}`)
    
    const child = spawn('node', [testFile], {
      env: { ...process.env, TEST_BASE_URL: testUrl },
      stdio: 'inherit'
    })
    
    child.on('close', (code) => {
      resolve(code === 0)
    })
    
    child.on('error', (error) => {
      log(`Error running test ${testFile}: ${error.message}`, 'error')
      resolve(false)
    })
  })
}

// Run tests by category
async function runTestsByCategory(category, testUrl) {
  log(`\n🧪 Running ${category} tests...`)
  
  const tests = TEST_CATEGORIES[category] || []
  if (tests.length === 0) {
    log(`No tests found for category: ${category}`)
    return { passed: 0, failed: 0, total: 0 }
  }
  
  let passed = 0
  let failed = 0
  
  for (const testFile of tests) {
    if (fs.existsSync(testFile)) {
      const success = await runTest(testFile, testUrl)
      if (success) {
        passed++
      } else {
        failed++
      }
    } else {
      log(`Test file not found: ${testFile}`, 'error')
      failed++
    }
    
    // Wait between tests
    await sleep(1000)
  }
  
  return { passed, failed, total: tests.length }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Comprehensive Test Suite')
  log(`Test URL: ${TEST_URL}`)
  log('')
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    categories: {}
  }
  
  // Run tests by category
  for (const category of Object.keys(TEST_CATEGORIES)) {
    const categoryResults = await runTestsByCategory(category, TEST_URL)
    results.categories[category] = categoryResults
    results.total += categoryResults.total
    results.passed += categoryResults.passed
    results.failed += categoryResults.failed
  }
  
  // Print results
  log('\n📊 Test Results Summary:')
  log('========================')
  log(`Total Tests: ${results.total}`)
  log(`✅ Passed: ${results.passed}`)
  log(`❌ Failed: ${results.failed}`)
  log('')
  
  log('📋 Results by Category:')
  for (const [category, categoryResults] of Object.entries(results.categories)) {
    const status = categoryResults.failed === 0 ? '✅' : '❌'
    log(`${status} ${category}: ${categoryResults.passed}/${categoryResults.total} passed`)
  }
  
  log('')
  if (results.failed === 0) {
    log('🎉 All tests passed!')
  } else {
    log('⚠️ Some tests failed. Please review the errors above.')
  }
  
  return results.failed === 0
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const category = args[0]
  const url = args[1] || TEST_URL
  
  if (category && TEST_CATEGORIES[category]) {
    // Run specific category
    runTestsByCategory(category, url)
      .then((results) => {
        const success = results.failed === 0
        process.exit(success ? 0 : 1)
      })
      .catch((error) => {
        log(`Test runner failed: ${error.message}`, 'error')
        process.exit(1)
      })
  } else if (category === 'prod') {
    // Run all tests against production
    runAllTests()
      .then((success) => {
        process.exit(success ? 0 : 1)
      })
      .catch((error) => {
        log(`Test runner failed: ${error.message}`, 'error')
        process.exit(1)
      })
  } else {
    // Run all tests
    runAllTests()
      .then((success) => {
        process.exit(success ? 0 : 1)
      })
      .catch((error) => {
        log(`Test runner failed: ${error.message}`, 'error')
        process.exit(1)
      })
  }
}

module.exports = { runAllTests, runTestsByCategory, TEST_CATEGORIES }