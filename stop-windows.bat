@echo off
title Stop WaBot Pro
chcp 65001 >nul

echo ========================================================
echo         🛑 Stopping WaBot Pro Daemon...
echo ========================================================
echo.

node cli.js stop

echo.
echo Process complete.
timeout /t 3 >nul
