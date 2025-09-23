#!/bin/bash

# Comprehensive Test Runner for Today's Critical Fixes
# This script runs all tests and verifies today's changes work correctly

echo "🧪 Werwolf Game - Comprehensive Test Suite"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_URL=${1:-"http://localhost:3000"}
PROD_URL="https://wearwolf-bewk9ijpj-faizuddin0019s-projects.vercel.app"

# Function to run a test
run_test() {
    local test_name="$1"
    local test_file="$2"
    local test_url="$3"
    
    echo -e "${BLUE}🧪 Running: ${test_name}${NC}"
    echo "   File: ${test_file}"
    echo "   URL: ${test_url}"
    echo ""
    
    # Set environment variables
    export TEST_BASE_URL="$test_url"
    
    # Run the test
    if node "$test_file"; then
        echo -e "${GREEN}✅ ${test_name}: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ ${test_name}: FAILED${NC}"
        return 1
    fi
}

# Function to check if server is running
check_server() {
    local url="$1"
    echo -e "${YELLOW}🔍 Checking if server is running at ${url}...${NC}"
    
    if curl -s --head "$url" | head -n 1 | grep -q "200 OK"; then
        echo -e "${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running${NC}"
        return 1
    fi
}

# Main test execution
main() {
    echo -e "${YELLOW}🚀 Starting Comprehensive Test Suite${NC}"
    echo ""
    
    # Check if we're testing local or production
    if [ "$TEST_URL" = "http://localhost:3000" ]; then
        echo -e "${YELLOW}📱 Testing Local Development Server${NC}"
        if ! check_server "$TEST_URL"; then
            echo -e "${RED}❌ Local server is not running. Please start it with 'npm run dev'${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}🌐 Testing Production Server${NC}"
        if ! check_server "$TEST_URL"; then
            echo -e "${RED}❌ Production server is not accessible${NC}"
            exit 1
        fi
    fi
    
    echo ""
    echo -e "${BLUE}📋 Test Plan:${NC}"
    echo "1. Core Game Logic (Basic Mechanics & Sound Effects)"
    echo "2. Game Flow Improvements (Host Controls & Phase Management)"
    echo "3. End Game Logic (Winner Declaration & Host Exclusion)"
    echo "4. Real-time Sync (State Management & Updates & Mobile UI)"
    echo "5. Performance Tests (Battery Optimization)"
    echo ""
    
    # Test results tracking
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # Run all test suites
    echo -e "${YELLOW}🧪 Running Test Suite 1: Core Game Logic${NC}"
    if run_test "Core Game Logic" "tests/core/game-logic.test.js" "$TEST_URL"; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
    echo ""
    
    echo -e "${YELLOW}🧪 Running Test Suite 2: Game Flow Improvements${NC}"
    if run_test "Game Flow Improvements" "tests/game-flow/test-game-flow-improvements.js" "$TEST_URL"; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
    echo ""
    
    echo -e "${YELLOW}🧪 Running Test Suite 3: End Game Logic${NC}"
    if run_test "End Game Logic" "tests/end-game/test-end-game-logic.js" "$TEST_URL"; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
    echo ""
    
    echo -e "${YELLOW}🧪 Running Test Suite 4: Real-time Sync${NC}"
    if run_test "Real-time Sync" "tests/integration/real-time-sync.test.js" "$TEST_URL"; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
    echo ""
    
    echo -e "${YELLOW}🧪 Running Test Suite 5: Performance Tests${NC}"
    if run_test "Performance Tests" "tests/performance/battery-optimization.test.js" "$TEST_URL"; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
    echo ""
    
    # Print final results
    echo -e "${BLUE}📊 Final Test Results:${NC}"
    echo "========================"
    echo -e "Total Tests: ${total_tests}"
    echo -e "${GREEN}✅ Passed: ${passed_tests}${NC}"
    echo -e "${RED}❌ Failed: ${failed_tests}${NC}"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Today's critical fixes are working correctly.${NC}"
        echo -e "${GREEN}✅ Werewolf screen timing fix: WORKING${NC}"
        echo -e "${GREEN}✅ Mobile UI layout fix: WORKING${NC}"
        echo -e "${GREEN}✅ Host control over game phases: WORKING${NC}"
        echo -e "${GREEN}✅ Sound effect implementation: WORKING${NC}"
        echo -e "${GREEN}✅ Real-time sync: WORKING${NC}"
        echo ""
        echo -e "${BLUE}🚀 Ready for deployment!${NC}"
        exit 0
    else
        echo -e "${RED}⚠️ Some tests failed. Please review the errors above.${NC}"
        echo -e "${YELLOW}💡 Common issues:${NC}"
        echo "   - Server not running (run 'npm run dev')"
        echo "   - Supabase environment variables not set"
        echo "   - Network connectivity issues"
        echo "   - Database connection problems"
        echo ""
        exit 1
    fi
}

# Help function
show_help() {
    echo "Usage: $0 [URL]"
    echo ""
    echo "Arguments:"
    echo "  URL    Test URL (default: http://localhost:3000)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test local development server"
    echo "  $0 http://localhost:3000             # Test local development server"
    echo "  $0 https://wearwolf-bewk9ijpj-faizuddin0019s-projects.vercel.app  # Test production"
    echo ""
    echo "Environment Variables:"
    echo "  NEXT_PUBLIC_SUPABASE_URL     Supabase project URL"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY Supabase anonymous key"
    echo ""
    echo "Test Suites:"
    echo "  1. Today's Critical Fixes (Werewolf Timing & Mobile UI)"
    echo "  2. Game Flow Improvements (Host Controls & Phase Management)"
    echo "  3. End Game Logic (Winner Declaration & Host Exclusion)"
    echo "  4. Real-time Sync (State Management & Updates)"
    echo "  5. Performance Tests (Battery Optimization)"
}

# Check for help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Run main function
main "$@"
