#!/usr/bin/env bash
# ========================================================
# WaBot Pro — Automatic macOS Environment Installer
# Supports: Apple Silicon (M1/M2/M3/M4) & Intel Macs
# Automatically detects missing software and installs it.
# ========================================================

set -e

# Terminal colors
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}========================================================${NC}"
echo -e "${CYAN} 🍎 WaBot Pro — Automatic macOS Installer             ${NC}"
echo -e "${CYAN}========================================================${NC}\n"

# 1. Check Command Line Tools
echo -e "${YELLOW}[1/4] Checking Command Line Tools...${NC}"
if ! xcode-select -p >/dev/null 2>&1; then
    echo -e "${YELLOW}Installing Command Line Tools...${NC}"
    xcode-select --install || true
    echo -e "${GREEN}✓ Command Line Tools initiated.${NC}"
else
    echo -e "${GREEN}✓ Command Line Tools already installed.${NC}"
fi

# 2. Check Homebrew
echo -e "\n${YELLOW}[2/4] Checking Homebrew package manager...${NC}"
if ! command -v brew >/dev/null 2>&1; then
    echo -e "${YELLOW}Homebrew not found. Installing Homebrew automatically...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Configure PATH for Homebrew
    if [ -f "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f "/usr/local/bin/brew" ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    echo -e "${GREEN}✓ Homebrew installed successfully.${NC}"
else
    echo -e "${GREEN}✓ Homebrew is already installed.${NC}"
fi

# 3. Check Node.js
echo -e "\n${YELLOW}[3/4] Checking Node.js (requires Node 18+ or 20 LTS)...${NC}"
NEED_NODE=false

if ! command -v node >/dev/null 2>&1; then
    NEED_NODE=true
else
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
        echo -e "${YELLOW}Detected older Node.js ($NODE_VER). Upgrading via Homebrew...${NC}"
        NEED_NODE=true
    fi
fi

if [ "$NEED_NODE" = true ]; then
    echo -e "${CYAN}Installing Node.js via Homebrew...${NC}"
    brew install node
fi

NODE_INSTALLED_VER=$(node -v)
echo -e "${GREEN}✓ Node.js is ready: ${NODE_INSTALLED_VER}${NC}"

# Permissions
chmod +x start.sh stop.sh cli.js *.sh 2>/dev/null || true

# 4. Install dependencies
echo -e "\n${YELLOW}[4/4] Installing WaBot Pro server dependencies...${NC}"
npm --prefix server install --omit=dev --no-audit --no-fund
echo -e "${GREEN}✓ Server dependencies installed.${NC}"

# Verify/repair the production Dashboard UI.
# Never trust a stale pre-built dist after a source update.
node scripts/ensure-web-build.mjs --repair
echo -e "\n${CYAN}========================================================${NC}"
echo -e "${GREEN}🎉 WaBot Pro installation complete on macOS!${NC}"
echo -e "${CYAN}========================================================${NC}"
echo -e "To start: ${YELLOW}./start.sh${NC} or ${YELLOW}node cli.js${NC}"
echo -e "Dashboard: ${YELLOW}http://localhost:4000${NC}\n"

read -rp "Would you like to start WaBot now? [Y/n]: " START_NOW
START_NOW=${START_NOW:-Y}
if [[ "$START_NOW" =~ ^[Yy]$ ]]; then
    exec ./start.sh
fi
