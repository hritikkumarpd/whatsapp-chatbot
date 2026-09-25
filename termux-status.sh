#!/usr/bin/env bash
# ========================================================
# WaBot Pro — Termux Status Check
# ========================================================

cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
node cli.js status
