#!/usr/bin/env bash
# ========================================================
# WaBot Pro — Automatic Termux Environment Installer
# Sets up Node.js, dependencies, wakelock, and permissions
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
echo -e "${CYAN} 🤖 WaBot Pro — Termux Auto-Installer (Android)         ${NC}"
echo -e "${CYAN}========================================================${NC}\n"

# 1. Update Termux repositories and install Node.js + Git + Curl
echo -e "${YELLOW}[1/4] Checking and installing Termux packages...${NC}"
pkg update -y || apt update -y

PACKAGES_TO_INSTALL=()
for pkg in nodejs-lts git curl; do
    if ! command -v "$pkg" >/dev/null 2>&1; then
        PACKAGES_TO_INSTALL+=("$pkg")
    fi
done

if [ ${#PACKAGES_TO_INSTALL[@]} -gt 0 ]; then
    echo -e "${YELLOW}Installing: ${PACKAGES_TO_INSTALL[*]}...${NC}"
    pkg install -y "${PACKAGES_TO_INSTALL[@]}" || apt install -y "${PACKAGES_TO_INSTALL[@]}"
fi

# Optional termux-api for wake-lock & notifications
pkg install -y termux-api 2>/dev/null || true

NODE_VER=$(node -v 2>/dev/null || echo "not found")
echo -e "${GREEN}✓ Node.js is ready: ${NODE_VER}${NC}"

# 2. Acquire Termux wake-lock
echo -e "\n${YELLOW}[2/4] Enabling CPU wake-lock for 24/7 background running...${NC}"
if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock 2>/dev/null || true
    echo -e "${GREEN}✓ Android wake-lock acquired.${NC}"
else
    echo -e "${YELLOW}Notice: Install Termux:API from F-Droid to keep bot awake 24/7.${NC}"
fi

# 3. Set script permissions
echo -e "\n${YELLOW}[3/4] Setting execution permissions on scripts...${NC}"
chmod +x *.sh cli.js 2>/dev/null || true
echo -e "${GREEN}✓ Scripts are executable.${NC}"

# 4. Install server dependencies
echo -e "\n${YELLOW}[4/4] Installing WaBot Pro dependencies...${NC}"
npm --prefix server install --omit=dev --no-audit --no-fund
echo -e "${GREEN}✓ Dependencies installed successfully!${NC}"

# Verify/repair the production Dashboard UI.
# Never trust a stale pre-built dist after a source update.
node scripts/ensure-web-build.mjs --repair
echo -e "\n${CYAN}========================================================${NC}"
echo -e "${GREEN}🎉 WaBot Pro is installed & ready on your Android!${NC}"
echo -e "${CYAN}========================================================${NC}"
echo -e "To open the interactive Termux manager anytime, run:"
echo -e "   ${YELLOW}bash termux.sh${NC} or ${YELLOW}./termux.sh${NC}"
echo -e "Dashboard will be available at: ${CYAN}http://localhost:4000${NC}\n"

read -rp "Would you like to launch WaBot Termux Manager now? [Y/n]: " LAUNCH_NOW
LAUNCH_NOW=${LAUNCH_NOW:-Y}
if [[ "$LAUNCH_NOW" =~ ^[Yy]$ ]]; then
    exec bash termux.sh
fi
