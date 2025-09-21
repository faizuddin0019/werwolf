#!/bin/bash

# Run All Tests Implemented Today
# This script runs all the test cases we implemented today

echo "🚀 Running All Tests Implemented Today..."
echo "=========================================="

# Set test base URL
export TEST_BASE_URL=${TEST_BASE_URL:-"http://localhost:3000"}

# Array of test files
tests=(
  "tests/security/test-role-visibility.js"
  "tests/game-logic/test-player-ordering.js"
  "tests/ui/test-game-screen-layout.js"
  "tests/ui/test-mobile-layout-ordering.js"
  "tests/security/test-phase-timing-security.js"
)

# Track results
passed=0
failed=0
total=${#tests[@]}

echo "📋 Running $total test suites..."
echo ""

# Run each test
for test in "${tests[@]}"; do
  echo "🧪 Running $(basename "$test")..."
  echo "----------------------------------------"
  
  if node "$test"; then
    echo "✅ $(basename "$test") PASSED"
    ((passed++))
  else
    echo "❌ $(basename "$test") FAILED"
    ((failed++))
  fi
  
  echo ""
done

# Summary
echo "📊 Test Results Summary"
echo "======================="
echo "Total tests: $total"
echo "Passed: $passed"
echo "Failed: $failed"

if [ $failed -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "💥 Some tests failed!"
  exit 1
fi
