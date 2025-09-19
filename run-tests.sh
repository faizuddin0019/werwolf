#!/bin/bash

# Werwolf Game Test Runner
# This script runs all tests and provides comprehensive reporting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
TIMEOUT=30
MAX_RETRIES=3

echo -e "${BLUE}🚀 Werwolf Game Test Runner${NC}"
echo -e "${BLUE}============================${NC}"
echo ""

# Function to check if server is running
check_server() {
    echo -e "${YELLOW}🔍 Checking if server is running...${NC}"
    
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -s -f "$BASE_URL" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Server is running at $BASE_URL${NC}"
            return 0
        fi
        
        if [ $i -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}⏳ Server not ready, retrying in 5 seconds... (attempt $i/$MAX_RETRIES)${NC}"
            sleep 5
        fi
    done
    
    echo -e "${RED}❌ Server is not running at $BASE_URL${NC}"
    echo -e "${YELLOW}💡 Please start the server with: npm run dev${NC}"
    exit 1
}

# Function to run quick tests
run_quick_tests() {
    echo -e "${BLUE}🧪 Running Quick Tests...${NC}"
    echo ""
    
    if npm run test:quick; then
        echo -e "${GREEN}✅ Quick tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Quick tests failed${NC}"
        return 1
    fi
}

# Function to run comprehensive tests
run_comprehensive_tests() {
    echo -e "${BLUE}🧪 Running Comprehensive Tests...${NC}"
    echo ""
    
    if npm run test:leave-game; then
        echo -e "${GREEN}✅ Comprehensive tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Comprehensive tests failed${NC}"
        return 1
    fi
}

# Function to run linting
run_linting() {
    echo -e "${BLUE}🔍 Running Linting...${NC}"
    echo ""
    
    if npm run lint; then
        echo -e "${GREEN}✅ Linting passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Linting failed${NC}"
        return 1
    fi
}

# Function to run type checking
run_type_check() {
    echo -e "${BLUE}🔍 Running Type Checking...${NC}"
    echo ""
    
    if npm run type-check; then
        echo -e "${GREEN}✅ Type checking passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Type checking failed${NC}"
        return 1
    fi
}

# Function to run build test
run_build_test() {
    echo -e "${BLUE}🔨 Testing Build...${NC}"
    echo ""
    
    if npm run build; then
        echo -e "${GREEN}✅ Build successful${NC}"
        return 0
    else
        echo -e "${RED}❌ Build failed${NC}"
        return 1
    fi
}

# Main test execution
main() {
    local start_time=$(date +%s)
    local quick_passed=false
    local comprehensive_passed=false
    local lint_passed=false
    local type_check_passed=false
    local build_passed=false
    
    # Check server first
    check_server
    echo ""
    
    # Run quick tests
    if run_quick_tests; then
        quick_passed=true
    fi
    echo ""
    
    # Run comprehensive tests
    if run_comprehensive_tests; then
        comprehensive_passed=true
    fi
    echo ""
    
    # Run linting
    if run_linting; then
        lint_passed=true
    fi
    echo ""
    
    # Run type checking
    if run_type_check; then
        type_check_passed=true
    fi
    echo ""
    
    # Run build test
    if run_build_test; then
        build_passed=true
    fi
    echo ""
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Print summary
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo -e "${BLUE}========================${NC}"
    echo ""
    
    echo -e "Quick Tests:           $([ "$quick_passed" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo -e "Comprehensive Tests:   $([ "$comprehensive_passed" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo -e "Linting:               $([ "$lint_passed" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo -e "Type Checking:         $([ "$type_check_passed" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo -e "Build:                 $([ "$build_passed" = true ] && echo -e "${GREEN}✅ PASSED${NC}" || echo -e "${RED}❌ FAILED${NC}")"
    echo ""
    echo -e "Total Duration:        ${duration}s"
    echo ""
    
    # Determine overall result
    if [ "$quick_passed" = true ] && [ "$comprehensive_passed" = true ] && [ "$lint_passed" = true ] && [ "$type_check_passed" = true ] && [ "$build_passed" = true ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

# Handle script arguments
case "${1:-all}" in
    "quick")
        check_server
        run_quick_tests
        ;;
    "comprehensive")
        check_server
        run_comprehensive_tests
        ;;
    "lint")
        run_linting
        ;;
    "type-check")
        run_type_check
        ;;
    "build")
        run_build_test
        ;;
    "all"|*)
        main
        ;;
esac
