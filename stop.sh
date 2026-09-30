#!/usr/bin/env bash
# WaBot Pro — Universal Stop Script
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
node cli.js stop
