#!/bin/bash

# Organized Test Runner for Werwolf
# Runs tests by functionality category

echo "🎮 Werwolf Test Suite Runner"
echo "============================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to run tests."
    exit 1
fi

# Set default test URL
TEST_URL=${1:-"http://localhost:3001"}

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

# Function to run specific test category
run_test_category() {
    local category=$1
    local description=$2
    
    echo "🚀 Running $description Tests..."
    echo "----------------------------------------"
    
    TEST_URL="$TEST_URL" node "$category"
    
    if [ $? -eq 0 ]; then
        echo "✅ $description tests passed!"
    else
        echo "❌ $description tests failed!"
        return 1
    fi
    echo ""
}

# Parse command line arguments
case "${2:-all}" in
    "core")
        run_test_category "core/game-logic.test.js" "Core Game Logic"
        ;;
    "integration")
        run_test_category "integration/real-time-sync.test.js" "Real-time Sync Integration"
        ;;
    "performance")
        run_test_category "performance/battery-optimization.test.js" "Battery Optimization Performance"
        ;;
    "all")
        echo "🎯 Running ALL Test Suites..."
        echo ""
        TEST_URL="$TEST_URL" node run-all-tests.js
        ;;
    *)
        echo "Usage: $0 [URL] [category]"
        echo ""
        echo "Categories:"
        echo "  core        - Core game logic tests"
        echo "  integration - Real-time sync and integration tests"
        echo "  performance - Battery optimization and performance tests"
        echo "  all         - Run all test suites (default)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Run all tests on localhost:3001"
        echo "  $0 http://localhost:3001 core        # Run core tests on localhost:3001"
        echo "  $0 https://wearwolf-theta.vercel.app all  # Run all tests on production"
        exit 1
        ;;
esac

# Check final result
if [ $? -eq 0 ]; then
    echo "🎉 All requested tests completed successfully!"
else
    echo "❌ Some tests failed. Please review the output above."
    exit 1
fi
