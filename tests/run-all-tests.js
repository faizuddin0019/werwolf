#!/usr/bin/env node

/**
 * Master Test Runner
 * Runs all test suites organized by functionality
 */

const GameLogicTests = require('./core/game-logic.test.js')
const RealTimeSyncTests = require('./integration/real-time-sync.test.js')
const BatteryOptimizationTests = require('./performance/battery-optimization.test.js')

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

class MasterTestRunner {
  constructor() {
    this.results = []
    this.startTime = Date.now()
  }

  async runTestSuite(suiteName, TestClass) {
    console.log(`\n🚀 Running ${suiteName} Test Suite`)
    console.log('=' .repeat(60))
    
    try {
      const testSuite = new TestClass()
      await testSuite.runAllTests()
      
      this.results.push({
        suite: suiteName,
        status: 'PASSED',
        results: testSuite.results
      })
      
      console.log(`✅ ${suiteName} Test Suite - PASSED`)
    } catch (error) {
      console.log(`❌ ${suiteName} Test Suite - FAILED: ${error.message}`)
      this.results.push({
        suite: suiteName,
        status: 'FAILED',
        error: error.message
      })
    }
  }

  async runAllTests() {
    console.log('🎮 WERWOLF COMPREHENSIVE TEST SUITE')
    console.log('=' .repeat(60))
    console.log(`📍 Testing against: ${BASE_URL}`)
    console.log(`🕐 Started at: ${new Date().toLocaleString()}`)
    
    // Run Core Game Logic Tests
    await this.runTestSuite('Core Game Logic', GameLogicTests)
    
    // Run Integration Tests
    await this.runTestSuite('Real-time Sync Integration', RealTimeSyncTests)
    
    // Run Performance Tests
    await this.runTestSuite('Battery Optimization Performance', BatteryOptimizationTests)
    
    this.printFinalResults()
  }

  printFinalResults() {
    const endTime = Date.now()
    const duration = (endTime - this.startTime) / 1000
    
    console.log('\n🏁 FINAL TEST RESULTS')
    console.log('=' .repeat(60))
    
    let totalTests = 0
    let totalPassed = 0
    let totalFailed = 0
    
    this.results.forEach(suite => {
      const icon = suite.status === 'PASSED' ? '✅' : '❌'
      console.log(`\n${icon} ${suite.suite}: ${suite.status}`)
      
      if (suite.results) {
        suite.results.forEach(test => {
          totalTests++
          if (test.status === 'PASSED') {
            totalPassed++
          } else {
            totalFailed++
          }
          console.log(`  ${test.status === 'PASSED' ? '✅' : '❌'} ${test.test}`)
          if (test.error) {
            console.log(`    Error: ${test.error}`)
          }
        })
      } else if (suite.error) {
        console.log(`  Error: ${suite.error}`)
        totalFailed++
      }
    })
    
    console.log('\n' + '=' .repeat(60))
    console.log(`📊 SUMMARY:`)
    console.log(`   Total Test Suites: ${this.results.length}`)
    console.log(`   Total Tests: ${totalTests}`)
    console.log(`   Passed: ${totalPassed}`)
    console.log(`   Failed: ${totalFailed}`)
    console.log(`   Duration: ${duration.toFixed(2)}s`)
    
    if (totalFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED!')
      console.log('✅ Werwolf app is working correctly across all functionality!')
    } else {
      console.log('\n⚠️ SOME TESTS FAILED!')
      console.log('❌ Please review the failed tests above.')
      process.exit(1)
    }
  }
}

// Run all tests
if (require.main === module) {
  const runner = new MasterTestRunner()
  runner.runAllTests().catch(error => {
    console.error('❌ Master test runner failed:', error)
    process.exit(1)
  })
}

module.exports = MasterTestRunner
