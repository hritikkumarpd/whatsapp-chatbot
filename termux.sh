#!/usr/bin/env bash
# ========================================================
# WaBot Pro — Interactive Termux CLI Manager
# ========================================================

cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1

PID_FILE="wabot.pid"
LOG_FILE="wabot.log"

GREEN="\033[1;32m"
BLUE="\033[1;34m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
CYAN="\033[1;36m"
BOLD="\033[1m"
RESET="\033[0m"

function get_status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE" 2>/dev/null)
        if [ -n "$PID" ] && kill -0 "$PID" >/dev/null 2>&1; then
            echo -e "${GREEN}● RUNNING${RESET} (PID: $PID)"
            return 0
        fi
    fi
    PIDS=$(pgrep -f "node.*server/src/index.js" 2>/dev/null | head -n 1)
    if [ -n "$PIDS" ]; then
        echo -e "${GREEN}● RUNNING${RESET} (PID: $PIDS)"
        return 0
    fi
    echo -e "${RED}○ STOPPED${RESET}"
    return 1
}

function get_local_ip() {
    # Try ip route / ip addr, fallback to node CLI
    LOCAL_IP=$(ip -4 addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1)
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
    fi
    echo "$LOCAL_IP"
}

function show_menu() {
    clear 2>/dev/null || true
    CURRENT_STATUS=$(get_status)
    LOCAL_IP=$(get_local_ip)
    
    echo -e "${BLUE}====================================================${RESET}"
    echo -e "${GREEN}${BOLD}         🤖 WaBot Pro — Termux Manager             ${RESET}"
    echo -e "${BLUE}====================================================${RESET}"
    echo -e " Service Status : $CURRENT_STATUS"
    echo -e " Local Web UI   : ${CYAN}http://localhost:4000${RESET}"
    if [ -n "$LOCAL_IP" ]; then
    echo -e " Network/Wi-Fi  : ${CYAN}http://${LOCAL_IP}:4000${RESET}"
    fi
    echo -e "${BLUE}----------------------------------------------------${RESET}"
    echo -e " ${BOLD}[1]${RESET} 🚀 Start Bot (Background 24/7)"
    echo -e " ${BOLD}[2]${RESET} 🛑 Stop Bot"
    echo -e " ${BOLD}[3]${RESET} 🔄 Restart Bot"
    echo -e " ${BOLD}[4]${RESET} 📊 Check Detailed Status & RAM Usage"
    echo -e " ${BOLD}[5]${RESET} 📋 View Live Logs (Press Ctrl+C to return)"
    echo -e " ${BOLD}[6]${RESET} 📱 Get WhatsApp Pairing Code (Terminal Link)"
    echo -e " ${BOLD}[7]${RESET} 🌐 Open Dashboard in Phone Browser"
    echo -e " ${BOLD}[8]${RESET} ⚡ Setup Auto-Start on Phone Boot (Termux:Boot)"
    echo -e " ${BOLD}[9]${RESET} 🧠 Test Gemini AI Reply in Terminal"
    echo -e " ${BOLD}[10]${RESET} 🔑 Configure Gemini AI API Key (or press 'k')"
    echo -e " ${BOLD}[0]${RESET} 🚪 Exit"
    echo -e "${BLUE}====================================================${RESET}"
}

function start_bot() {
    echo -e "\n${YELLOW}Starting WaBot...${RESET}"
    if [ -f "termux-start.sh" ]; then
        bash termux-start.sh
    else
        node cli.js start
    fi
    echo ""
    read -rp "Press Enter to continue..."
}

function stop_bot() {
    echo -e "\n${YELLOW}Stopping WaBot...${RESET}"
    if [ -f "termux-stop.sh" ]; then
        bash termux-stop.sh
    else
        node cli.js stop
    fi
    echo ""
    read -rp "Press Enter to continue..."
}

function restart_bot() {
    echo -e "\n${YELLOW}Restarting WaBot...${RESET}"
    if [ -f "termux-stop.sh" ]; then
        bash termux-stop.sh
    else
        node cli.js stop
    fi
    sleep 1
    if [ -f "termux-start.sh" ]; then
        bash termux-start.sh
    else
        node cli.js start
    fi
    echo ""
    read -rp "Press Enter to continue..."
}

function view_status() {
    echo ""
    if [ -f "termux-status.sh" ]; then
        bash termux-status.sh
    else
        node cli.js status
    fi
    echo ""
    read -rp "Press Enter to return to menu..."
}

function view_logs() {
    echo -e "\n${CYAN}Showing live logs (Press Ctrl+C to exit)...${RESET}\n"
    if [ -f "$LOG_FILE" ]; then
        tail -f -n 25 "$LOG_FILE"
    else
        echo -e "${RED}No log file found yet ($LOG_FILE). Start the bot first!${RESET}"
        read -rp "Press Enter to return..."
    fi
}

function request_pairing_code() {
    echo -e "\n${YELLOW}--- WhatsApp Pairing Code Generator ---${RESET}"
    if ! get_status >/dev/null; then
        echo -e "${RED}❌ WaBot is not running. Please start it first (Option 1).${RESET}"
        read -rp "Press Enter to return..."
        return
    fi

    echo -e "Enter your WhatsApp phone number with country code (no + or spaces)."
    echo -e "Example: ${CYAN}918544668673${RESET}"
    read -rp "Phone Number: " PHONE
    PHONE=$(echo "$PHONE" | tr -cd '0-9')

    if [ ${#PHONE} -lt 10 ]; then
        echo -e "${RED}Invalid phone number format! Must be at least 10 digits.${RESET}"
        read -rp "Press Enter to return..."
        return
    fi

    echo -e "\n${YELLOW}Requesting pairing code from WhatsApp servers...${RESET}"
    TOKEN_JSON=$(curl -s "http://127.0.0.1:4000/api/auth/token" 2>/dev/null)
    TOKEN=$(echo "$TOKEN_JSON" | grep -oP '(?<="token":")[^"]+')

    if [ -z "$TOKEN" ]; then
        echo -e "${RED}Failed to acquire local authentication token. Is the server running on port 4000?${RESET}"
        read -rp "Press Enter to return..."
        return
    fi

    RESPONSE=$(curl -s -X POST "http://127.0.0.1:4000/api/pairing-code" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"phone\":\"$PHONE\"}" 2>/dev/null)

    CODE=$(echo "$RESPONSE" | grep -oP '(?<="code":")[^"]+')

    if [ -n "$CODE" ]; then
        echo -e "\n${GREEN}====================================================${RESET}"
        echo -e "${BOLD}       YOUR WHATSAPP PAIRING CODE IS:              ${RESET}"
        echo -e "              ${CYAN}${BOLD}${CODE}${RESET}                      "
        echo -e "${GREEN}====================================================${RESET}"
        echo -e "Steps to link:"
        echo -e "1. Open WhatsApp on your phone"
        echo -e "2. Go to Settings > ${BOLD}Linked Devices${RESET}"
        echo -e "3. Tap ${BOLD}Link a Device${RESET} > ${YELLOW}Link with phone number instead${RESET}"
        echo -e "4. Enter the code above: ${CYAN}${CODE}${RESET}"
        echo -e "${GREEN}====================================================${RESET}\n"
    else
        echo -e "${RED}Failed to generate pairing code. Response:${RESET}"
        echo "$RESPONSE"
    fi
    read -rp "Press Enter to return to menu..."
}

function open_browser() {
    URL="http://localhost:4000"
    echo -e "\n${YELLOW}Opening $URL in browser...${RESET}"
    if command -v termux-open-url >/dev/null 2>&1; then
        termux-open-url "$URL"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL"
    elif command -v am >/dev/null 2>&1; then
        am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
    else
        echo -e "Open your phone browser and go to: ${CYAN}$URL${RESET}"
    fi
    sleep 1
}

function setup_boot() {
    echo -e "\n${YELLOW}--- Termux:Boot Auto-Start Setup ---${RESET}"
    echo "This feature automatically starts WaBot whenever your Android phone restarts."
    echo "Requires: 'Termux:Boot' app from F-Droid."
    echo ""
    echo "1) Install Boot Script (Auto-start WaBot on device boot)"
    echo "2) Remove Boot Script"
    echo "0) Cancel"
    read -rp "Choose [0-2]: " BOOT_OPT

    BOOT_DIR="$HOME/.termux/boot"
    BOOT_FILE="$BOOT_DIR/start-wabot"

    if [ "$BOOT_OPT" == "1" ]; then
        mkdir -p "$BOOT_DIR"
        CURRENT_DIR="$(pwd)"
        cat <<EOF > "$BOOT_FILE"
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock 2>/dev/null || true
cd "$CURRENT_DIR"
node cli.js start
EOF
        chmod +x "$BOOT_FILE"
        echo -e "\n${GREEN}✓ Termux:Boot script installed at: $BOOT_FILE${RESET}"
        echo "Make sure Termux:Boot app is installed and granted autostart permission!"
    elif [ "$BOOT_OPT" == "2" ]; then
        rm -f "$BOOT_FILE"
        echo -e "\n${YELLOW}✓ Boot script removed.${RESET}"
    fi
    read -rp "Press Enter to return..."
}

function test_gemini() {
    echo -e "\n${YELLOW}--- Test Gemini AI Reply ---${RESET}"
    read -rp "Enter test message (e.g. Hello): " MSG
    MSG=${MSG:-"Hello"}

    TOKEN_JSON=$(curl -s "http://127.0.0.1:4000/api/auth/token" 2>/dev/null)
    TOKEN=$(echo "$TOKEN_JSON" | grep -oP '(?<="token":")[^"]+')

    if [ -z "$TOKEN" ]; then
        echo -e "${RED}Bot is not running on port 4000! Start the bot first.${RESET}"
        read -rp "Press Enter to return..."
        return
    fi

    echo -e "${CYAN}Sending to Gemini...${RESET}"
    RESP=$(curl -s -X POST "http://127.0.0.1:4000/api/test-ai" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"$MSG\"}" 2>/dev/null)

    echo -e "\n${GREEN}Response:${RESET}"
    echo "$RESP"
    echo ""
    read -rp "Press Enter to return..."
}

# Master Loop
while true; do
    show_menu
    read -rp "Choose an option [0-10 or k]: " OPTION
    case "$OPTION" in
        1) start_bot ;;
        2) stop_bot ;;
        3) restart_bot ;;
        4) view_status ;;
        5) view_logs ;;
        6) request_pairing_code ;;
        7) open_browser ;;
        8) setup_boot ;;
        9) test_gemini ;;
        10|k|K) node cli.js key; read -rp "Press Enter to return..." ;;
        0) echo -e "\n${GREEN}Bye! Keep your bot running!${RESET}\n"; exit 0 ;;
        *) echo -e "${RED}Invalid option!${RESET}"; sleep 1 ;;
    esac
done
