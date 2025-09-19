#!/bin/bash

# Game Flow Fixes Test Runner
# Tests all the critical issues that were fixed

echo "🎮 Game Flow Fixes Test Suite"
echo "=============================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to run tests."
    exit 1
fi

# Set default test URL
TEST_URL=${1:-"http://localhost:3000"}

echo "📍 Testing against: $TEST_URL"
echo ""

# Check if the server is running
echo "🔍 Checking if server is running..."
if ! curl -s "$TEST_URL" > /dev/null; then
    echo "❌ Server is not running at $TEST_URL"
    echo "   Please start the development server with: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Run the tests
echo "🚀 Running game flow fixes tests..."
echo ""

TEST_URL="$TEST_URL" node test-game-flow-fixes.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All tests completed successfully!"
    echo "✅ Game flow fixes are working correctly"
else
    echo ""
    echo "❌ Some tests failed. Please review the output above."
    exit 1
fi
