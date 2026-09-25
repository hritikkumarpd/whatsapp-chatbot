@echo off
setlocal enabledelayedexpansion
title WaBot Pro - Windows Launcher
chcp 65001 >nul

echo ========================================================
echo         🤖 WaBot Pro — Windows Launcher
echo ========================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is NOT installed on this computer.
    echo [*] Attempting automatic installation of Node.js 20 LTS, please wait...
    where winget >nul 2>nul
    if !errorlevel! equ 0 (
        echo [*] Installing Node.js via Windows Package Manager (winget)...
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    ) else (
        echo [*] Downloading and installing Node.js 20 LTS via PowerShell...
        powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '$env:TEMP\node_setup.msi'; Start-Process msiexec.exe -ArgumentList '/i $env:TEMP\node_setup.msi /passive /norestart' -Wait"
    )
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
    where node >nul 2>nul
    if !errorlevel! neq 0 (
        echo [!] Installation completed. Please close and re-open this script so Windows recognizes the new Node.js PATH.
        pause
        exit /b 0
    )
    echo [✓] Node.js installed successfully!
)

:: 2. Check if server dependencies are installed
if not exist "server\node_modules" (
    echo [SETUP] Installing server dependencies, please wait...
    call npm --prefix server install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install server dependencies.
        pause
        exit /b 1
    )
)

:: 3. Interactive Menu
:MENU
echo Choose an option:
echo   [1] Start Web UI (Localhost:4000 + Auto-open Browser)
echo   [2] Start Pure CLI / Terminal Mode (Interactive Console)
echo   [3] Start 24/7 Background Daemon
echo   [4] Check Server & WhatsApp Status
echo   [5] Stop WaBot Daemon
echo   [6] Configure Gemini AI API Key
echo   [7] Exit
echo.
set /p choice="Enter choice [1-7] (Default 1): "

if "%choice%"=="" set choice=1

if "%choice%"=="1" goto START_UI
if "%choice%"=="2" goto START_CLI
if "%choice%"=="3" goto START_DAEMON
if "%choice%"=="4" goto CHECK_STATUS
if "%choice%"=="5" goto STOP_BOT
if "%choice%"=="6" goto CONFIG_KEY
if "%choice%"=="7" goto EXIT_SCRIPT

echo [!] Invalid option. Please select 1-6.
echo.
goto MENU

:START_UI
echo.
echo [*] Starting WaBot Pro in Background...
node cli.js start
timeout /t 2 >nul
echo [*] Opening Web Dashboard at http://localhost:4000 ...
start http://localhost:4000
echo.
echo Web UI is running at http://localhost:4000
echo Press any key to open the Interactive CLI or Close window to leave it running in background.
pause >nul
node cli.js
goto EXIT_SCRIPT

:START_CLI
echo.
echo [*] Launching Interactive Terminal CLI...
node cli.js
goto EXIT_SCRIPT

:START_DAEMON
echo.
echo [*] Starting WaBot 24/7 background daemon...
node cli.js start
echo.
echo Done! Run "node cli.js status" or "stop-windows.bat" anytime.
pause
goto EXIT_SCRIPT

:CHECK_STATUS
echo.
node cli.js status
echo.
pause
goto MENU

:STOP_BOT
echo.
node cli.js stop
echo.
pause
goto MENU

:CONFIG_KEY
echo.
node cli.js key
echo.
pause
goto MENU

:EXIT_SCRIPT
exit /b 0
