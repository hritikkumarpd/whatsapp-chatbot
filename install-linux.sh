#!/usr/bin/env bash
# ========================================================
# WaBot Pro — Automatic Linux & Raspberry Pi Environment Installer
# Supports: Ubuntu, Debian, Raspberry Pi OS, CentOS, Fedora, Arch Linux
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
echo -e "${CYAN} 🤖 WaBot Pro — Automatic Linux & Pi Installer         ${NC}"
echo -e "${CYAN} (Ubuntu | Debian | Raspberry Pi OS | Fedora | Arch)   ${NC}"
echo -e "${CYAN}========================================================${NC}\n"

# Helper for sudo
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    else
        echo -e "${RED}[ERROR] This installer requires root/sudo privileges to install missing packages.${NC}"
        exit 1
    fi
fi

# Detect Package Manager
PKG_MANAGER=""
if command -v apt-get >/dev/null 2>&1; then
    PKG_MANAGER="apt"
elif command -v dnf >/dev/null 2>&1; then
    PKG_MANAGER="dnf"
elif command -v yum >/dev/null 2>&1; then
    PKG_MANAGER="yum"
elif command -v pacman >/dev/null 2>&1; then
    PKG_MANAGER="pacman"
fi

echo -e "${YELLOW}[1/4] Checking and installing missing system packages...${NC}"

# Check basic CLI utilities (curl, git, unzip, build tools)
MISSING_TOOLS=()
for tool in curl git unzip; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        MISSING_TOOLS+=("$tool")
    fi
done

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Missing tools detected: ${MISSING_TOOLS[*]}${NC}"
    echo -e "${CYAN}Installing missing tools via $PKG_MANAGER...${NC}"
    if [ "$PKG_MANAGER" = "apt" ]; then
        $SUDO apt-get update -y
        $SUDO apt-get install -y curl git unzip build-essential
    elif [ "$PKG_MANAGER" = "dnf" ] || [ "$PKG_MANAGER" = "yum" ]; then
        $SUDO $PKG_MANAGER install -y curl git unzip make gcc-c++
    elif [ "$PKG_MANAGER" = "pacman" ]; then
        $SUDO pacman -Sy --noconfirm curl git unzip base-devel
    fi
    echo -e "${GREEN}✓ System utilities installed.${NC}"
else
    echo -e "${GREEN}✓ All basic system tools (curl, git, unzip) are already installed.${NC}"
fi

# Check Node.js
echo -e "\n${YELLOW}[2/4] Checking Node.js installation (requires Node 18+ or 20 LTS)...${NC}"
NEED_NODE=false

if ! command -v node >/dev/null 2>&1; then
    NEED_NODE=true
else
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
        echo -e "${YELLOW}Detected older Node.js ($NODE_VER). Upgrading to Node.js 20 LTS...${NC}"
        NEED_NODE=true
    fi
fi

if [ "$NEED_NODE" = true ]; then
    echo -e "${CYAN}Installing Node.js 20 LTS automatically...${NC}"
    if [ "$PKG_MANAGER" = "apt" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
        $SUDO apt-get install -y nodejs
    elif [ "$PKG_MANAGER" = "dnf" ] || [ "$PKG_MANAGER" = "yum" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO bash -
        $SUDO $PKG_MANAGER install -y nodejs
    elif [ "$PKG_MANAGER" = "pacman" ]; then
        $SUDO pacman -Sy --noconfirm nodejs npm
    else
        echo -e "${RED}Could not install Node.js automatically. Please install Node.js 18+ manually.${NC}"
        exit 1
    fi
fi

NODE_INSTALLED_VER=$(node -v)
NPM_INSTALLED_VER=$(npm -v)
echo -e "${GREEN}✓ Node.js is ready: ${NODE_INSTALLED_VER} (npm ${NPM_INSTALLED_VER})${NC}"

# Permissions
echo -e "\n${YELLOW}[3/4] Setting file permissions...${NC}"
chmod +x start.sh stop.sh cli.js *.sh 2>/dev/null || true
echo -e "${GREEN}✓ Scripts are now executable.${NC}"

# Install project dependencies
echo -e "\n${YELLOW}[4/4] Installing WaBot Pro dependencies...${NC}"
npm --prefix server install --omit=dev --no-audit --no-fund
echo -e "${GREEN}✓ WaBot Pro dependencies installed successfully!${NC}"

# Verification of prebuilt UI
if [ -f "web/dist/index.html" ]; then
    echo -e "${GREEN}✓ Pre-built Dashboard UI is ready.${NC}"
else
    echo -e "${YELLOW}Building Dashboard UI...${NC}"
    npm --prefix web install
    npm --prefix web run build
fi

echo -e "\n${CYAN}========================================================${NC}"
echo -e "${GREEN}🎉 WaBot Pro is successfully installed on your system!${NC}"
echo -e "${CYAN}========================================================${NC}"
echo -e "Choose how you want to start:"
echo -e "  1. Universal CLI / Terminal Menu: ${YELLOW}./start.sh${NC} or ${YELLOW}node cli.js${NC}"
echo -e "  2. Background Service (Systemd):  ${YELLOW}sudo cp wabot.service /etc/systemd/system/ && sudo systemctl enable --now wabot${NC}"
echo -e "  3. PM2 Process Manager:           ${YELLOW}pm2 start ecosystem.config.cjs${NC}"
echo -e "${CYAN}========================================================${NC}\n"

read -rp "Would you like to start the bot now? [Y/n]: " START_NOW
START_NOW=${START_NOW:-Y}
if [[ "$START_NOW" =~ ^[Yy]$ ]]; then
    exec ./start.sh
fi
