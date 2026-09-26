<div align="center">

# 🤖 WhatsApp ChatBot

### Self-Hosted, Lightweight WhatsApp AI Auto-Reply & ChatBot Suite
**Powered by Google Gemini & Baileys MD · Zero monthly fees · 100% Private**

🔗 **GitHub Repository:** [https://github.com/hritikkumarpd/whatsapp-chatbot](https://github.com/hritikkumarpd/whatsapp-chatbot)

Runs smoothly on **Android (Termux), Windows, Linux VPS, macOS, Raspberry Pi, and Docker**.

<p>
  <img alt="Node Version" src="https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%20LTS-339933?logo=node.js&logoColor=white">
  <img alt="AI Engine" src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white">
  <img alt="WhatsApp Engine" src="https://img.shields.io/badge/WhatsApp-Baileys%20MD%20(Pure%20JS)-25D366?logo=whatsapp&logoColor=white">
  <img alt="RAM Usage" src="https://img.shields.io/badge/RAM-under%20150MB-blue">
  <img alt="License" src="https://img.shields.io/badge/License-ISC-brightgreen">
</p>

<p>
  <a href="#-why-i-built-this">Why I Built This</a> •
  <a href="#-quick-start-git-clone">Quick Start</a> •
  <a href="#-platform-guides">Platform Guides</a> •
  <a href="#-terminal-cli--setting-api-key">CLI & API Key</a> •
  <a href="#-features">Features</a> •
  <a href="#-faq--troubleshooting">FAQ</a>
</p>

</div>

---

## 💡 Why I Built This

I got tired of two things with existing WhatsApp bots:
1. **Expensive SaaS subscriptions:** Almost every WhatsApp AI bot charges $20 to $50/month and requires uploading your private chats and contact lists to their cloud servers.
2. **Heavy, crashing bots:** Most open-source projects rely on Puppeteer/Chromium. They eat 1GB to 2GB of RAM, lag constantly, and immediately crash on low-spec VPS or Android phones.

So I built **WaBot Pro** to be:
- **100% Self-Hosted & Private:** Your sessions, keys, and messages stay on your own machine.
- **Super Lightweight (<150MB RAM):** Uses [Baileys](https://github.com/WhiskeySockets/Baileys) via pure WebSocket protocol buffers — **no Chromium or browser automation required**.
- **Human-like AI Conversations:** Connects to **Google Gemini** (which is blazing fast and has a generous free tier) and automatically detects and matches the sender's language, tone, and slang (Hinglish, Hindi, English, etc.).
- **Bulletproof Port Handling:** Built-in auto-liberation so you never see `EADDRINUSE: address already in use :::4000` errors.

---

> [!WARNING]
> **⚠️ Critical Account Safety Warning & Disclaimer:**
> **I (the author/developer) am not responsible if your WhatsApp account or phone number gets banned, suspended, or blocked.** You assume **100% full responsibility** for running this tool. Please use it thoughtfully, responsibly, and at your own risk. Do **NOT** use your personal or primary phone number for automated spamming or unsolicited bulk messaging!

---

## ⚡ Quick Start (Git Clone)

### 1. Clone the repository
```bash
git clone https://github.com/hritikkumarpd/whatsapp-chatbot.git
cd whatsapp-chatbot
```

### 2. Run on your platform

- **On Linux / macOS / Android Termux:**
  ```bash
  bash setup.sh
  ```
  *(The setup script auto-detects your OS, installs any missing packages, and starts the bot).*

- **On Windows:**
  Just double-click:
  ```cmd
  start-windows.bat
  ```

Once started, open **`http://localhost:4000`** in your browser, or manage everything right from your terminal using `node cli.js`!\n\n> **Deployment safety:** Every normal startup verifies the Vite production dashboard build. If the frontend source has changed or generated assets are missing, WaBot automatically rebuilds the dashboard before starting. You can also run `npm run web:repair` manually.

---

## 📱 Platform Guides

### 🤖 1. Android (Termux) — Run 24/7 on your Phone
You don't need a laptop or server to keep this bot running. You can run it on a spare Android phone (or your primary phone) 24/7.

> **Important:** Install Termux from [F-Droid](https://f-droid.org/packages/com.termux/) (do **not** use the outdated Google Play Store version).

```bash
# 1. Update Termux and install Git & Node.js
pkg update -y && pkg install -y git nodejs-lts curl termux-api

# 2. Clone and enter the project
git clone https://github.com/hritikkumarpd/whatsapp-chatbot.git
cd whatsapp-chatbot

# 3. Run the Termux manager
bash termux.sh
```

**Termux Tips:**
- **Keep it running 24/7:** In `bash termux.sh`, select option `[1]`. It automatically acquires `termux-wake-lock` so Android won't kill the bot when your screen turns off.
- **Auto-start on phone boot:** If you install the free **Termux:Boot** app, select option `[8]` in `termux.sh` to have WaBot launch automatically whenever your phone restarts.
- **Link via Phone Number:** If you're on phone and can't scan a QR code, select option `[6]` in `termux.sh` to get an **8-digit pairing code**!

---

### 🪟 2. Windows 10 / 11 / Server
Double-click [`start-windows.bat`](start-windows.bat).
- If Node.js is not installed on your PC, the script will automatically download and install Node.js 20 LTS for you.
- To stop the bot cleanly, double-click [`stop-windows.bat`](stop-windows.bat).

---

### 🐧 3. Ubuntu / Debian / Raspberry Pi / Linux VPS

```bash
chmod +x setup.sh start.sh stop.sh cli.js *.sh
bash setup.sh
```

#### Running as a background systemd service:
```bash
sudo cp wabot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wabot

# Check status or stream logs:
sudo systemctl status wabot
journalctl -u wabot -f
```

#### Using PM2:
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

---

### 🍎 4. macOS (Apple Silicon M1-M4 & Intel)
```bash
chmod +x *.sh cli.js
bash setup.sh
```
Detects Homebrew, ensures Node.js 18+ is available, and launches the interactive menu.

---

### 🐳 5. Docker & Docker Compose
```bash
docker compose up -d
```
Runs a lightweight Alpine container. WhatsApp authentication (`server/auth`) and configuration (`server/config.json`) are automatically persisted in mapped volumes.

---

## 💻 Terminal CLI & Setting API Key

You don't even need to open a web browser to configure or manage the bot. Everything can be done right from the terminal:

```bash
node cli.js
```

```text
====================================================
           🤖 WaBot Pro — Universal CLI
====================================================
 Status     : ● RUNNING (PID: 14208)
 WhatsApp   : CONNECTED ✅ (+918544668673)
 Local UI   : http://127.0.0.1:4000
----------------------------------------------------
 [1] 🚀 Start Bot (Background Daemon)
 [2] 🛑 Stop Bot
 [3] 🔄 Restart Bot
 [4] 📊 Full System & Service Status
 [5] 📱 Get WhatsApp Pairing Code (Terminal Linking)
 [6] 📷 Show Terminal QR Code
 [7] 🔑 Configure Gemini AI API Key
 [8] 🧠 Test Gemini AI Reply
 [9] 📋 Stream Live Activity Logs
 [10] 🌐 Open Dashboard in Default Browser
 [0] 🚪 Exit CLI
====================================================
```

### Direct CLI Commands:
```bash
node cli.js start             # Start 24/7 background process
node cli.js stop              # Stop the bot
node cli.js status            # Show RAM, uptime, and WhatsApp state
node cli.js key [api_key]     # Set and test your Gemini API Key
node cli.js pair [phone]      # Get 8-digit WhatsApp pairing code
node cli.js qr                # Show ASCII QR code in terminal
node cli.js test-ai "hello"   # Test your prompt and AI response
node cli.js logs              # Live colorized log stream
```

---

## ⚡ Auto-Port Overwrite Guard

One of my biggest pet peeves with Node.js servers is `Error: listen EADDRINUSE: address already in use :::4000` when an old process didn't terminate cleanly.

In WaBot Pro, I built a native **Auto-Port Liberation Guard**:
- Before binding to port 4000, it checks if any lingering or zombie process is holding the port.
- If occupied, it automatically terminates the conflicting PID (`taskkill` on Windows, `fuser`/`lsof` on Linux/macOS/Termux) and frees the socket.
- It starts smoothly every single time without requiring you to manually kill processes in Task Manager or terminal.

---

## ✨ Features Built-In

- **Gemini Multi-Turn AI:** Answers with realistic context memory. Auto-detects Hinglish, Hindi, English, and more.
- **Pairing Code Linking:** No need to struggle scanning a QR code on the same phone. Just request an 8-digit pairing code!
- **Instant Keyword Rules:** Set custom auto-replies for frequent questions like `pricing`, `location`, `timing`, or `support` before the AI even gets triggered.
- **Smart Contact Filtering:** Choose to reply to **Everyone**, only a **Whitelist** (clients/customers), or ignore a **Blacklist** (family, friends, automated OTPs).
- **Group Chat Intelligence:** Turn group replies on/off, or only trigger when someone specifically `@mentions` the bot.
- **Anti-Ban Typing Simulation:** Emulates real human typing delay (`composing...`) with dynamic randomized intervals to keep your WhatsApp account safe.
- **Dark Mode Web Dashboard:** Clean React UI to monitor real-time message feeds, conversation histories, and tweak settings.

---

## 🔑 Getting a Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **Create API Key**.
4. Set it in WaBot:
   - Via terminal: `node cli.js key AIzaSyYourKeyHere`
   - Or in the Web Dashboard under **AI & Personality**.

---

## 🛡️ Security & Privacy Architecture

- **No Remote Databases:** WhatsApp tokens (`server/auth/creds.json`) and message logs never leave your device.
- **Loopback IP Authentication:** The internal REST API enforces loopback token authentication to prevent local network drive-by attacks.
- **Secret Redaction:** Keys, passwords, and sensitive session tokens are automatically filtered out from error logs.
- **Race Condition Prevention:** Built-in per-chat mutex queues prevent duplicate replies when contacts send rapid-fire messages.

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are always welcome! Feel free to:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/cool-feature`)
3. Commit your changes (`git commit -m 'Add cool feature'`)
4. Push to your branch and open a Pull Request

---

## ⚖️ Disclaimer & Liability Notice

> [!CAUTION]
> ### ⚠️ No Liability for Banned or Blocked WhatsApp Accounts
> **If your WhatsApp account or phone number is banned, suspended, or blocked while or after using this software, I (the developer/author) am NOT responsible under any circumstances. You assume full and exclusive responsibility for your own actions and usage. Think carefully and use it wisely.**
> 
> WhatsApp's official Terms of Service strictly prohibit or restrict automated clients and unofficial APIs. Never use this bot to send unsolicited bulk messages or spam from your primary personal phone number. Always test with a secondary or dedicated number and operate within reasonable, human-like limits.

1. **Independent Project:** This software uses an unofficial, open-source library ([Baileys](https://github.com/WhiskeySockets/Baileys)) and is **not affiliated with, authorized, maintained, sponsored, or endorsed by WhatsApp, Meta, or any of their subsidiaries**.
2. **Use At Your Own Risk:** The software is provided "as is", without warranty of any kind, express or implied. You are solely responsible for compliance with WhatsApp's Terms of Service and all applicable local laws.
3. **Strict Anti-Spam Policy:** This project is created for personal productivity, self-hosted automation, and customer support. It is not intended or designed for abusive spamming or illegal activities.

---

## 📜 License

Distributed under the **ISC License**. Built with ❤️ for the open-source and self-hosting community.
