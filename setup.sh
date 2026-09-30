#!/usr/bin/env bash
# ========================================================
# WaBot Pro — Universal Master Installer
# Auto-detects operating system and routes to specific auto-installer:
# - Android Termux -> termux-install.sh
# - macOS -> install-mac.sh
# - Ubuntu / Debian / Raspberry Pi / Linux -> install-linux.sh
# ========================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 1. Detect Termux
if [ -d "/data/data/com.termux" ] || [ -n "$TERMUX_VERSION" ]; then
    echo "📱 Android Termux detected. Running Termux auto-installer..."
    exec bash termux-install.sh
fi

# 2. Detect macOS
OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then
    echo "🍎 macOS detected. Running macOS auto-installer..."
    exec bash install-mac.sh
fi

# 3. Detect Linux / Raspberry Pi / WSL
if [ "$OS" = "Linux" ]; then
    echo "🐧 Linux / Raspberry Pi detected. Running Linux auto-installer..."
    exec bash install-linux.sh
fi

# 4. Detect Windows (Git Bash, MSYS2, Cygwin)
if [[ "$OS" =~ ^(MINGW|MSYS|CYGWIN) ]]; then
    echo "🪟 Windows environment detected. Launching Windows launcher..."
    cmd.exe /c start-windows.bat
    exit 0
fi

echo "❓ Operating system: $OS"
echo "If on Windows, please run: start-windows.bat"
exit 1
