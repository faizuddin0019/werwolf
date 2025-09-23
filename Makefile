# Werwolf Game - Standardized Test Commands
# Principal QA Gatekeeper - Test Infrastructure

.PHONY: help test unit net ui lint verify clean

# Default target
help:
	@echo "Werwolf Game - Test Commands"
	@echo "============================"
	@echo "make test         # Run all tests (fast + slow), twice to catch flakes"
	@echo "make unit         # Core unit tests only"
	@echo "make net          # Network & integration tests"
	@echo "make ui           # UI tests (headless)"
	@echo "make lint         # Static analysis"
	@echo "make verify       # lint + tests + coverage gate"
	@echo "make clean        # Clean build artifacts"

# Test categories
unit:
	@echo "🧪 Running Core Unit Tests..."
	@npm run test:core

net:
	@echo "🌐 Running Network & Integration Tests..."
	@npm run test:integration

ui:
	@echo "🎨 Running UI Tests..."
	@npm run test:ui

# Performance tests
perf:
	@echo "⚡ Running Performance Tests..."
	@npm run test:performance

# Security tests
security:
	@echo "🔒 Running Security Tests..."
	@npm run test:security

# End game tests
endgame:
	@echo "🏁 Running End Game Tests..."
	@npm run test:end-game

# Game flow tests
gameflow:
	@echo "🎮 Running Game Flow Tests..."
	@npm run test:game-flow

# Lint and static analysis
lint:
	@echo "🔍 Running Lint & Static Analysis..."
	@npm run lint

# Type checking
type-check:
	@echo "📝 Running TypeScript Type Check..."
	@npm run type-check

# Build verification
build:
	@echo "🏗️ Building Application..."
	@npm run build

# Comprehensive test suite (all categories)
test:
	@echo "🧪 Running Comprehensive Test Suite..."
	@npm run test:comprehensive

# Flake detection - run tests twice
test-stable:
	@echo "🔄 Running Tests Twice for Flake Detection..."
	@npm run test:comprehensive
	@echo "🔄 Second Run for Flake Detection..."
	@npm run test:comprehensive

# Coverage gate
coverage:
	@echo "📊 Running Coverage Analysis..."
	@npm run test:coverage

# HTML coverage report
coverage-html:
	@echo "📊 Generating HTML Coverage Report..."
	@npm run test:coverage:html

# Full verification pipeline
verify: lint type-check test coverage
	@echo "✅ Full Verification Complete"
	@echo "All tests passed, coverage meets threshold"

# Production testing
test-prod:
	@echo "🌐 Running Tests Against Production..."
	@npm run test:comprehensive:prod

# Clean build artifacts
clean:
	@echo "🧹 Cleaning Build Artifacts..."
	@rm -rf .next
	@rm -rf out
	@rm -rf build
	@rm -rf node_modules/.cache

# Development server
dev:
	@echo "🚀 Starting Development Server..."
	@npm run dev

# Quick verification (critical tests only)
quick-verify:
	@echo "⚡ Quick Verification (Critical Tests Only)..."
	@npm run test:verify-all

# CI/CD pipeline
ci: lint type-check test-stable
	@echo "🤖 CI Pipeline Complete"

# Deployment verification
deploy-check: verify test-prod
	@echo "🚀 Ready for Deployment"
