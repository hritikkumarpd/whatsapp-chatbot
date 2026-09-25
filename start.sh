#!/usr/bin/env bash
# ========================================================
# WaBot Pro — Universal Unix Launcher
# Runs on: macOS, Ubuntu, Debian, Linux, Raspberry Pi
# ========================================================

set -e

# ANSI Colors
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}========================================================${NC}"
echo -e "${CYAN}      🤖 WaBot Pro — Universal Unix Launcher${NC}"
echo -e "${CYAN}      (macOS | Ubuntu | Linux | Raspberry Pi)${NC}"
echo -e "${CYAN}========================================================${NC}"
echo ""

# 1. Check Node.js installation & version
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Node.js is NOT installed!${NC}"
    echo "Please install Node.js 18+ or 20+:"
    echo "  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    echo "  macOS:         brew install node"
    echo "  Raspberry Pi:  sudo apt update && sudo apt install -y nodejs npm"
    exit 1
fi

NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo -e "${YELLOW}[WARNING] Node.js version is $(node -v). WaBot Pro recommends Node.js 18+ or 20+.${NC}"
fi

# 2. Check dependencies
if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}[SETUP] Installing server dependencies...${NC}"
    npm --prefix server install
fi

# 3. Handle Command Line Arguments
if [ "$1" = "--cli" ] || [ "$1" = "cli" ]; then
    exec node cli.js
elif [ "$1" = "--daemon" ] || [ "$1" = "start" ]; then
    exec node cli.js start
elif [ "$1" = "--stop" ] || [ "$1" = "stop" ]; then
    exec node cli.js stop
elif [ "$1" = "--status" ] || [ "$1" = "status" ]; then
    exec node cli.js status
elif [ "$1" = "--pair" ] || [ "$1" = "pair" ]; then
    shift
    exec node cli.js pair "$@"
elif [ "$1" = "--qr" ] || [ "$1" = "qr" ]; then
    exec node cli.js qr
elif [ "$1" = "--logs" ] || [ "$1" = "logs" ]; then
    exec node cli.js logs
elif [ "$1" = "--key" ] || [ "$1" = "key" ]; then
    shift
    exec node cli.js key "$@"
fi

# 4. Interactive Mode if no arguments provided
echo -e "${GREEN}Select an execution mode:${NC}"
echo "  [1] Start Web UI (Localhost:4000 + open browser)"
echo "  [2] Start Pure CLI / Terminal Mode (Interactive Console)"
echo "  [3] Start 24/7 Background Daemon"
echo "  [4] Terminal WhatsApp Pairing Code"
echo "  [5] Terminal ASCII QR Code"
echo "  [6] Check Status"
echo "  [7] Stop Daemon"
echo "  [8] Configure Gemini AI API Key"
echo "  [9] Exit"
echo ""

read -rp "Enter choice [1-9] (Default: 1): " CHOICE
CHOICE=${CHOICE:-1}

case "$CHOICE" in
    1)
        echo -e "${CYAN}[*] Starting background daemon...${NC}"
        node cli.js start
        sleep 1
        echo -e "${GREEN}[*] Opening Web Dashboard at http://localhost:4000 ...${NC}"
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open "http://localhost:4000" >/dev/null 2>&1 &
        elif command -v open >/dev/null 2>&1; then
            open "http://localhost:4000"
        fi
        echo -e "${CYAN}[*] Launching CLI Console...${NC}"
        node cli.js
        ;;
    2)
        exec node cli.js
        ;;
    3)
        exec node cli.js start
        ;;
    4)
        read -rp "Enter WhatsApp phone number with country code (e.g. 919876543210): " PHONE
        exec node cli.js pair "$PHONE"
        ;;
    5)
        exec node cli.js qr
        ;;
    6)
        exec node cli.js status
        ;;
    7)
        exec node cli.js stop
        ;;
    8)
        exec node cli.js key
        ;;
    *)
        echo "Exiting."
        exit 0
        ;;
esac
