#!/bin/bash

# Comprehensive Test Runner for Werwolf Game
# Executes all test suites and provides detailed reporting

set -e

echo "🚀 Starting Comprehensive Test Suite for Werwolf Game"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL=${TEST_BASE_URL:-"http://localhost:3000"}
VERCEL_URL=${VERCEL_URL:-""}

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_file="$2"
    local test_url="$3"
    
    echo -e "\n${BLUE}🧪 Running: $test_name${NC}"
    echo "Test URL: $test_url"
    echo "Test File: $test_file"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ -f "$test_file" ]; then
        # Set the test URL for this test
        export TEST_BASE_URL="$test_url"
        
        if node "$test_file"; then
            echo -e "${GREEN}✅ $test_name: PASSED${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}❌ $test_name: FAILED${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}❌ Test file not found: $test_file${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to check if server is running
check_server() {
    local url="$1"
    local name="$2"
    
    echo -e "\n${YELLOW}🔍 Checking $name server status...${NC}"
    
    if curl -s --max-time 10 "$url" > /dev/null; then
        echo -e "${GREEN}✅ $name server is running at $url${NC}"
        return 0
    else
        echo -e "${RED}❌ $name server is not responding at $url${NC}"
        return 1
    fi
}

# Function to wait for server to be ready
wait_for_server() {
    local url="$1"
    local name="$2"
    local max_attempts=30
    local attempt=1
    
    echo -e "\n${YELLOW}⏳ Waiting for $name server to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 5 "$url" > /dev/null; then
            echo -e "${GREEN}✅ $name server is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}Attempt $attempt/$max_attempts - waiting 2 seconds...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $name server failed to start within timeout${NC}"
    return 1
}

# Main test execution
main() {
    echo -e "${BLUE}📋 Test Configuration:${NC}"
    echo "Base URL: $BASE_URL"
    echo "Vercel URL: $VERCEL_URL"
    echo "Node Version: $(node --version)"
    echo "NPM Version: $(npm --version)"
    
    # Check if we're running in CI/CD
    if [ "$CI" = "true" ]; then
        echo -e "${YELLOW}🔧 Running in CI/CD environment${NC}"
    fi
    
    # Check server availability
    if [ -n "$VERCEL_URL" ]; then
        if check_server "$VERCEL_URL" "Vercel Production"; then
            echo -e "${GREEN}✅ Using Vercel production URL for tests${NC}"
            TEST_URL="$VERCEL_URL"
        else
            echo -e "${YELLOW}⚠️  Vercel URL not available, falling back to local${NC}"
            TEST_URL="$BASE_URL"
        fi
    else
        TEST_URL="$BASE_URL"
    fi
    
    # Check local server if using local URL
    if [ "$TEST_URL" = "$BASE_URL" ]; then
        if ! check_server "$BASE_URL" "Local Development"; then
            echo -e "${YELLOW}🚀 Starting local development server...${NC}"
            npm run dev &
            DEV_PID=$!
            
            if wait_for_server "$BASE_URL" "Local Development"; then
                echo -e "${GREEN}✅ Local server started successfully${NC}"
            else
                echo -e "${RED}❌ Failed to start local server${NC}"
                exit 1
            fi
        fi
    fi
    
    echo -e "\n${BLUE}🧪 Starting Test Execution...${NC}"
    echo "=================================================="
    
    # Run all test suites
    run_test "End Game Logic Tests" "test-end-game-logic.js" "$TEST_URL"
    
    # Add more test suites as they are created
    # run_test "Game Flow Tests" "test-game-flow.js" "$TEST_URL"
    # run_test "Real-time Sync Tests" "test-realtime-sync.js" "$TEST_URL"
    # run_test "Mobile UI Tests" "test-mobile-ui.js" "$TEST_URL"
    
    echo -e "\n${BLUE}📊 Test Results Summary${NC}"
    echo "=================================================="
    echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    
    # Calculate success rate
    if [ $TOTAL_TESTS -gt 0 ]; then
        SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo -e "Success Rate: ${BLUE}$SUCCESS_RATE%${NC}"
    fi
    
    # Final result
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed! Game logic is working correctly.${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed. Please check the implementation.${NC}"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    if [ -n "$DEV_PID" ]; then
        echo -e "\n${YELLOW}🧹 Cleaning up development server...${NC}"
        kill $DEV_PID 2>/dev/null || true
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Run main function
main "$@"
