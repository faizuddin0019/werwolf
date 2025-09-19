#!/bin/bash

# Real-time Synchronization Test Runner
# Tests all the critical issues fixed today

echo "🚀 Starting Real-time Synchronization Tests"
echo "=============================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to run tests."
    exit 1
fi

# Check if the test file exists
if [ ! -f "test-realtime-sync.js" ]; then
    echo "❌ Test file 'test-realtime-sync.js' not found."
    exit 1
fi

# Set default test URL if not provided
TEST_URL=${TEST_URL:-"http://localhost:3000"}

echo "Testing against: $TEST_URL"
echo ""

# Make the test file executable
chmod +x test-realtime-sync.js

# Run the tests
TEST_BASE_URL=$TEST_URL node test-realtime-sync.js

# Capture exit code
EXIT_CODE=$?

echo ""
echo "=============================================="

if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 All tests passed! Real-time synchronization is working correctly."
else
    echo "⚠️ Some tests failed. Please check the issues above."
fi

exit $EXIT_CODE
