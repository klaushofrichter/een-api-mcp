#!/bin/bash
#
# Test EEN MCP Server with Claude Code
#
# Usage:
#   ./test-prompts.sh              # Interactive menu to select prompts
#   ./test-prompts.sh --list       # List all available prompts
#   ./test-prompts.sh --all        # Run all prompts sequentially
#   ./test-prompts.sh <number>     # Run specific prompt by number
#   ./test-prompts.sh --custom "your prompt here"
#

set -e

# Define test prompts
PROMPTS=(
  # Authentication (0-3)
  "What EEN accounts do I have configured?"
  "Show me my authentication status for Eagle Eye Networks"
  "Which EEN account am I currently using?"

  # Cameras (3-7)
  "List all my cameras"
  "Show me all online cameras"
  "How many cameras do I have?"
  "Which cameras are currently offline?"

  # Live Images (7-8)
  "Take a snapshot from the first available camera"

  # Recording Intervals (8-9)
  "Show me recording intervals for the first camera from the past hour"

  # Events (9-11)
  "What types of events can I query for?"
  "Were there any motion events on the first camera in the last hour?"

  # Alerts (11-12)
  "Show me recent alerts"

  # Bridges (12-14)
  "List all my bridges"
  "Are any of my bridges offline?"

  # Users (14-16)
  "Who am I logged in as?"
  "List all users in my EEN account"

  # Layouts (16-21)
  "List all my camera layouts"
  "Show me the details of the Klaus Layout"
  "Which cameras are included in my layouts?"
  "How many layouts do I have and what are their display settings?"
  "Show me layouts that have more than one camera"

  # Combined (21-22)
  "Give me a status overview of all my cameras, bridges, and layouts"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  EEN MCP Server - Claude Code Test Runner${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
}

# List all prompts
list_prompts() {
  echo -e "${YELLOW}Available prompts:${NC}"
  echo ""
  for i in "${!PROMPTS[@]}"; do
    printf "  %2d) %s\n" "$i" "${PROMPTS[$i]}"
  done
  echo ""
}

# Run a single prompt
run_prompt() {
  local index=$1
  local prompt="${PROMPTS[$index]}"

  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}Prompt #$index:${NC} $prompt"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  claude --dangerously-skip-permissions -p "$prompt"

  echo ""
}

# Run a custom prompt
run_custom() {
  local prompt="$1"

  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}Custom prompt:${NC} $prompt"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  claude --dangerously-skip-permissions -p "$prompt"

  echo ""
}

# Run all prompts
run_all() {
  echo -e "${YELLOW}Running all ${#PROMPTS[@]} prompts...${NC}"
  echo ""

  for i in "${!PROMPTS[@]}"; do
    run_prompt "$i"

    # Pause between prompts to avoid rate limiting
    if [ "$i" -lt $((${#PROMPTS[@]} - 1)) ]; then
      echo -e "${YELLOW}Waiting 2 seconds before next prompt...${NC}"
      sleep 2
    fi
  done

  echo -e "${GREEN}All prompts completed!${NC}"
}

# Interactive menu
interactive_menu() {
  while true; do
    print_header
    list_prompts

    echo -e "${YELLOW}Options:${NC}"
    echo "  Enter a number (0-$((${#PROMPTS[@]} - 1))) to run that prompt"
    echo "  'a' to run all prompts"
    echo "  'c' to enter a custom prompt"
    echo "  'q' to quit"
    echo ""
    read -p "Selection: " choice

    case "$choice" in
      q|Q)
        echo "Goodbye!"
        exit 0
        ;;
      a|A)
        run_all
        read -p "Press Enter to continue..."
        ;;
      c|C)
        read -p "Enter custom prompt: " custom
        run_custom "$custom"
        read -p "Press Enter to continue..."
        ;;
      [0-9]|[0-9][0-9])
        if [ "$choice" -ge 0 ] && [ "$choice" -lt ${#PROMPTS[@]} ]; then
          run_prompt "$choice"
          read -p "Press Enter to continue..."
        else
          echo -e "${RED}Invalid selection. Please enter 0-$((${#PROMPTS[@]} - 1))${NC}"
          sleep 1
        fi
        ;;
      *)
        echo -e "${RED}Invalid selection${NC}"
        sleep 1
        ;;
    esac
  done
}

# Main
main() {
  # Check if claude command exists
  if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: 'claude' command not found.${NC}"
    echo "Please ensure Claude Code is installed and in your PATH."
    exit 1
  fi

  case "${1:-}" in
    --list|-l)
      print_header
      list_prompts
      ;;
    --all|-a)
      print_header
      run_all
      ;;
    --custom|-c)
      if [ -z "${2:-}" ]; then
        echo -e "${RED}Error: --custom requires a prompt argument${NC}"
        echo "Usage: $0 --custom \"your prompt here\""
        exit 1
      fi
      print_header
      run_custom "$2"
      ;;
    --help|-h)
      echo "Usage: $0 [option]"
      echo ""
      echo "Options:"
      echo "  (none)              Interactive menu"
      echo "  --list, -l          List all available prompts"
      echo "  --all, -a           Run all prompts sequentially"
      echo "  --custom, -c TEXT   Run a custom prompt"
      echo "  --help, -h          Show this help"
      echo "  <number>            Run specific prompt by number"
      ;;
    [0-9]|[0-9][0-9])
      if [ "$1" -ge 0 ] && [ "$1" -lt ${#PROMPTS[@]} ]; then
        print_header
        run_prompt "$1"
      else
        echo -e "${RED}Invalid prompt number. Use --list to see available prompts.${NC}"
        exit 1
      fi
      ;;
    "")
      interactive_menu
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
}

main "$@"
