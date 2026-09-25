#!/usr/bin/env bash
# ========================================================
# WaBot Pro — Termux Quick Background Starter
# ========================================================

cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1

# Acquire CPU wake-lock so Android doesn't kill the bot when screen is off
if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock 2>/dev/null || true
    echo "🔒 Android CPU WakeLock acquired (24/7 background mode)."
fi

# Start via universal CLI daemon
node cli.js start
