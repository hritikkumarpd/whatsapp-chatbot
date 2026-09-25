# 🌐 WaBot Pro — Universal Multi-Platform Deployment & Hosting Guide

> **Deploy and run WaBot Pro anywhere:** On your Local PC (Windows/Mac/Linux), Raspberry Pi, Android phone (Termux), Cloud VPS (AWS, DigitalOcean, Hetzner, Oracle), Docker, or on your own **Custom Domain with Free HTTPS/SSL**.

---

## 📑 Quick Navigation

1. [Supported Environments & Modes](#1-supported-environments--modes)
2. [Windows (Localhost & 1-Click .bat)](#2-windows-10--11--server)
3. [macOS (Apple Silicon & Intel)](#3-macos)
4. [Ubuntu / Debian / Linux Server](#4-ubuntu--debian--linux-vps)
5. [Raspberry Pi (24/7 Low-Power Home Server)](#5-raspberry-pi-zero-2w-3-4-5)
6. [Android Phone (Termux Mobile Server)](#6-android-phone-termux)
7. [Docker & Docker Compose (Multi-Arch)](#7-docker--docker-compose)
8. [Custom Domain Setup with Free SSL & Nginx](#8-custom-domain-setup-with-free-ssl)
9. [Free Cloudflare Tunnel (Remote Access Without Public IP)](#9-free-cloudflare-tunnel-zero-port-forwarding)
10. [3rd-Party Cloud Platforms (Railway, Render, Coolify)](#10-3rd-party-cloud-platforms)

---

## 1. Supported Environments & Modes

WaBot Pro is engineered to run in **two flexible modes** across all systems:

| Mode | How to Run | Use Case |
| :--- | :--- | :--- |
| 🖥️ **Web UI Dashboard** | Open `http://localhost:4000` or your custom domain | Full visual dashboard, rule builder, playground, analytics, QR scanner |
| ⌨️ **Pure CLI / Terminal** | `node cli.js` or `./start.sh` or `wabot` | Headless servers, SSH sessions, phones, low RAM, terminal QR code & pairing |

### Pairing Options (Zero-Browser Required)
* **Terminal ASCII QR Code**: Scan directly inside your terminal (`node cli.js qr`).
* **Terminal 8-Digit Pairing Code**: Enter your WhatsApp number, receive an 8-digit code, and enter it in WhatsApp on your phone (`node cli.js pair 919876543210`). No camera scanning needed!

---

## 2. Windows (10 / 11 / Server)

### Method A: 1-Click Launchers (Easiest)
1. Double-click **`start-windows.bat`**.
   * It checks for Node.js, auto-installs dependencies if needed, and presents an interactive menu.
   * Option `[1]` starts the background engine and automatically opens `http://localhost:4000` in your browser.
   * Option `[2]` launches the interactive terminal CLI.
2. To stop: Double-click **`stop-windows.bat`**.

### Method B: Terminal / PowerShell
```powershell
# 1. Install dependencies
npm run install:all

# 2. Launch Universal CLI
npm run cli
# or
node cli.js
```

---

## 3. macOS

### Prerequisites
Install Node.js via Homebrew (if not already installed):
```bash
brew install node
```

### Running WaBot
```bash
# 1. Grant execution permissions
chmod +x start.sh stop.sh cli.js

# 2. Run Universal Unix Launcher
./start.sh

# Or start daemon directly:
node cli.js start

# Or open interactive terminal:
node cli.js
```
Open **`http://localhost:4000`** in Safari or Chrome.

---

## 4. Ubuntu / Debian / Linux VPS

Perfect for cloud VPS providers like **DigitalOcean ($4/mo), Hetzner (€3.5/mo), AWS EC2, Oracle Cloud (Free Tier), Linode, Contabo**.

### Step 1: Install Node.js 20
```bash
# Update system & install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# Clone / upload your WaBot folder and install dependencies
cd /opt/wabot
npm --prefix server install --omit=dev
```

### Step 2: Keep it Running 24/7 (Choose Option A or B)

#### Option A: Native Systemd Service (Recommended for Linux)
WaBot includes a pre-configured `wabot.service`:
```bash
# 1. Copy service template to systemd directory
sudo cp wabot.service /etc/systemd/system/

# 2. Edit path and user if needed (default: /opt/wabot and root)
sudo nano /etc/systemd/system/wabot.service

# 3. Reload and enable auto-start on server boot
sudo systemctl daemon-reload
sudo systemctl enable --now wabot

# 4. Check status & live logs
sudo systemctl status wabot
sudo journalctl -u wabot -f
```

#### Option B: PM2 Process Manager
```bash
sudo npm install -g pm2

# Start using the included ecosystem config
pm2 start ecosystem.config.cjs

# Make it autostart on system reboots
pm2 startup
pm2 save

# View live dashboard & status
pm2 status
pm2 logs wabot
```

---

## 5. Raspberry Pi (Zero 2W, 3, 4, 5)

WaBot Pro is lightweight (~65MB idle RAM). It can run 24/7 on a Raspberry Pi at home with near-zero electricity cost.

### Raspberry Pi Setup
```bash
# 1. Install Node.js
sudo apt update && sudo apt install -y nodejs npm git

# 2. Navigate to project folder & install
cd ~/wabot
npm --prefix server install --omit=dev

# 3. Pair WhatsApp directly from SSH terminal (No monitor or GUI needed!)
node cli.js pair 919876543210
# Enter the 8-digit code displayed in WhatsApp > Linked Devices > Link with Phone Number!

# 4. Start 24/7 background service
sudo cp wabot.service /etc/systemd/system/
sudo systemctl enable --now wabot
```

---

## 6. Android Phone (Termux)

Run WaBot Pro 24/7 in your pocket directly on Android without keeping a laptop on!

```bash
# In Termux:
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - # (or: pkg install nodejs-lts git)
git clone <your-repo-url> wabot
cd wabot

# 1-Click Termux installer
bash termux-install.sh

# Interactive mobile menu
bash termux.sh
```
*See `TERMUX_SETUP.md` for complete Android battery optimization and background daemon instructions.*

---

## 7. Docker & Docker Compose

For containerized cloud setups with persistent session storage:

```bash
# 1. Build and start in background
docker compose up -d

# 2. View container logs
docker compose logs -f

# 3. Pair via terminal code inside container
docker exec -it wabot-pro node cli.js pair 919876543210

# 4. Stop
docker compose down
```

---

## 8. Custom Domain Setup with Free SSL

Want to access your bot dashboard anywhere from `https://wabot.yourdomain.com`?

### Step 1: Point your Domain DNS
In your domain registrar (Cloudflare, Namecheap, GoDaddy, Hostinger):
* Add an **A Record**:
  * **Type**: `A`
  * **Name / Host**: `wabot` (or `@` for root domain)
  * **Value / Points to**: `<YOUR_VPS_PUBLIC_IP>`
  * **TTL**: `Auto`

### Step 2: Configure Environment on VPS
Edit `/opt/wabot/.env` or set environment variable:
```bash
WABOT_DOMAIN=wabot.yourdomain.com
TRUST_PROXY=true
```

### Step 3: Setup Nginx Reverse Proxy with WebSocket Support
Install Nginx:
```bash
sudo apt update && sudo apt install -y nginx
```

Create `/etc/nginx/sites-available/wabot.conf`:
```nginx
server {
    listen 80;
    server_name wabot.yourdomain.com;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        # WebSocket support (Crucial for Socket.IO live sync)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/wabot.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Issue 100% Free HTTPS SSL Certificate
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d wabot.yourdomain.com
```
Certbot will automatically install SSL and enable HTTPS redirect.

### Step 5: Access your Bot Anywhere
Open `https://wabot.yourdomain.com` in your browser.
* When opening from a new device, click the **Access Token** prompt and enter your token (found in `server/config.json` -> `authToken` or by running `wabot status`).
* You are now securely managing your WhatsApp AI bot from anywhere in the world!

---

## 9. Free Cloudflare Tunnel (Zero Port-Forwarding)

If your bot is running on a **home PC, laptop, or Raspberry Pi**, you don't even need a public VPS or open router ports! Cloudflare Tunnel gives you a free HTTPS custom domain URL:

1. Install `cloudflared`:
   ```bash
   # Ubuntu / Raspberry Pi:
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```
2. Log in and create tunnel:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create wabot-tunnel
   ```
3. Route your domain:
   ```bash
   cloudflared tunnel route dns wabot-tunnel wabot.yourdomain.com
   ```
4. Run tunnel:
   ```bash
   cloudflared tunnel run --url http://localhost:4000 wabot-tunnel
   ```
Instant secure HTTPS domain directly to your local PC!

---

## 10. 3rd-Party Cloud Platforms

### Railway / Render / Fly.io / Coolify / CapRover

> ⚠️ **CRITICAL NOTE ON CLOUD PAAS:**
> Baileys stores encryption keys and session credentials in `server/auth/`.
> Cloud platforms use ephemeral disks by default (which erase files on restart).
> **You MUST attach a Persistent Disk Volume** mounted at `/app/server/auth` so your WhatsApp session does not disconnect when the container restarts.

#### Volume Mount Paths:
* **Mount Path**: `/app/server/auth`
* **Port**: `4000`
* **Environment Variables**:
  * `NODE_ENV=production`
  * `WABOT_ALLOW_ANY_ORIGIN=true`
  * `TRUST_PROXY=true`
  * `GEMINI_API_KEY=your_gemini_key`

---

## 🛡️ Quick Security Checklist for Public Deployments

1. **Keep `authToken` Safe**: Never share your `authToken` publicly. It protects your WhatsApp connection and configuration.
2. **Reverse Proxy Security**: When deploying on a domain, always use HTTPS via Certbot or Cloudflare.
3. **Loopback Protection**: When accessing locally via `localhost`, token is resolved automatically; when accessing remotely over a domain, the UI prompts for the Access Token once and caches it securely in your browser's `localStorage`.
