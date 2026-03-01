#!/bin/bash

# E2E Test Runner Script
# Usage: ./scripts/run-e2e.sh [teacher|assistant|all] [test-name-pattern]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TEACHER_PORT=54102
TEACHER_FE_PORT=55102
ASSISTANT_PORT=54103
ASSISTANT_FE_PORT=55103

# Function to cleanup ports
cleanup_ports() {
    echo -e "${YELLOW}Cleaning up ports...${NC}"
    # Kill existing processes on test ports
    for port in $TEACHER_PORT $TEACHER_FE_PORT $ASSISTANT_PORT $ASSISTANT_FE_PORT; do
        lsof -t -i :$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    done
    # Kill any remaining e2e-server or vite processes
    pkill -9 -f "e2e-server|vite" 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}Ports cleaned up${NC}"
}

# Function to run teacher tests
run_teacher_tests() {
    local pattern="$1"
    echo -e "${YELLOW}======================================${NC}"
    echo -e "${YELLOW}=== Running Teacher E2E Tests     ===${NC}"
    echo -e "${YELLOW}======================================${NC}"
    
    if [ -n "$pattern" ]; then
        echo -e "${YELLOW}Pattern: $pattern${NC}"
        bunx playwright test --config=playwright.teacher.config.ts --grep "$pattern"
    else
        bunx playwright test --config=playwright.teacher.config.ts
    fi
}

# Function to run assistant tests
run_assistant_tests() {
    local pattern="$1"
    echo -e "${YELLOW}======================================${NC}"
    echo -e "${YELLOW}=== Running Assistant E2E Tests   ===${NC}"
    echo -e "${YELLOW}======================================${NC}"
    
    if [ -n "$pattern" ]; then
        echo -e "${YELLOW}Pattern: $pattern${NC}"
        bunx playwright test --config=playwright.assistant.config.ts --grep "$pattern"
    else
        bunx playwright test --config=playwright.assistant.config.ts
    fi
}

# Function to run all tests
run_all_tests() {
    local pattern="$1"
    
    echo -e "${YELLOW}======================================${NC}"
    echo -e "${YELLOW}=== Running ALL E2E Tests         ===${NC}"
    echo -e "${YELLOW}======================================${NC}"
    
    # Run Teacher tests
    cleanup_ports
    echo ""
    run_teacher_tests "$pattern" || true
    
    # Run Assistant tests
    cleanup_ports
    echo ""
    run_assistant_tests "$pattern" || true
}

# Function to show help
show_help() {
    cat << EOF
E2E Test Runner

Usage: ./scripts/run-e2e.sh [command] [options]

Commands:
  teacher [pattern]     Run teacher E2E tests
  assistant [pattern]   Run assistant E2E tests
  all [pattern]         Run all E2E tests (teacher + assistant)
  clean                 Clean up test ports and processes
  help                  Show this help message

Examples:
  # Run all teacher tests
  ./scripts/run-e2e.sh teacher

  # Run specific teacher test
  ./scripts/run-e2e.sh teacher "班级管理"

  # Run all assistant tests
  ./scripts/run-e2e.sh assistant

  # Run all tests
  ./scripts/run-e2e.sh all

  # Run tests matching pattern across all suites
  ./scripts/run-e2e.sh all "实验报告"

EOF
}

# Main
main() {
    local command="${1:-help}"
    local pattern="$2"

    # Change to script directory
    cd "$(dirname "$0")/.."

    case "$command" in
        teacher)
            cleanup_ports
            run_teacher_tests "$pattern"
            ;;
        assistant)
            cleanup_ports
            run_assistant_tests "$pattern"
            ;;
        all)
            run_all_tests "$pattern"
            ;;
        clean)
            cleanup_ports
            echo -e "${GREEN}Cleanup completed${NC}"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}Unknown command: $command${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Cleanup on exit
trap cleanup_ports EXIT

main "$@"
