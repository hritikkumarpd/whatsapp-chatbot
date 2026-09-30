#!/usr/bin/env bash
# ========================================================
# WaBot Pro — Termux Quick Stopper
# ========================================================

cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1

# Stop via universal CLI
node cli.js stop

# Release wake-lock to save battery when stopped
if command -v termux-wake-unlock >/dev/null 2>&1; then
    termux-wake-unlock 2>/dev/null || true
    echo "🔓 Android CPU WakeLock released."
fi
