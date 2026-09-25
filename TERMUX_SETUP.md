# 📱 WaBot Pro — Android Termux 24/7 Setup Guide

This guide explains how to run WaBot Pro on an **Android phone using Termux 24/7 in the background without needing a computer**. Even with the screen turned off, the bot continues running and responding to WhatsApp messages using AI.

---

## ⚠️ Important Note Before Starting
> **Do NOT install Termux from Google Play Store!** The Play Store build is deprecated and fails during `pkg update`.  
> Always install Termux from **F-Droid** or GitHub:  
> 🔗 **Download Termux (F-Droid):** https://f-droid.org/packages/com.termux/

---

## 🛠️ Step 1: Android Battery & Background Settings (Crucial)

Modern Android builds aggressively kill background processes when the screen turns off. To prevent Termux from being terminated:

1. Open phone **Settings ➔ Apps ➔ Termux**.
2. Tap **Battery / Battery Saver** and select **"Unrestricted"** (or "No restrictions" / "Don't optimize").
3. Turn **OFF** the toggle for **"Pause app activity if unused"**.
4. **Manufacturer-Specific Adjustments:**
   - **Xiaomi / Redmi / Poco:** Settings ➔ Apps ➔ Termux ➔ Enable **Autostart**.
   - **Realme / Oppo / OnePlus:** Settings ➔ App Management ➔ Termux ➔ Enable **Allow background activity**.
   - **Samsung:** Settings ➔ Battery ➔ Background usage limits ➔ Add Termux to **Never sleeping apps**.
   - **Vivo / iQOO:** Settings ➔ Battery ➔ Background power consumption management ➔ Enable **High background power usage**.

---

## 📦 Step 2: Install Node.js in Termux

Open the Termux app and run:

```bash
# Update Termux package mirrors
pkg update && pkg upgrade -y

# Install Node.js, Git, and Termux tools
pkg install nodejs-lts git curl termux-api -y
```

Verify your installation:
```bash
node -v
npm -v
```

---

## 📂 Step 3: Clone the Repository

Clone the project directly from GitHub:
```bash
git clone https://github.com/hritikkumarpd/whatsapp-chatbot.git
cd whatsapp-chatbot
```

---

## ⚙️ Step 4: Run the Auto-Installer

Inside the project directory, run:
```bash
bash termux-install.sh
```

This script automatically:
1. Verifies Node.js, Git, and Termux tools.
2. Applies executable permissions (`chmod +x`) to all shell scripts.
3. Installs backend dependencies (`npm install`).
4. Verifies the pre-built web dashboard (no heavy build process on phone).
5. Acquires Android CPU WakeLock so the process is not suspended when the screen locks.

---

## 🚀 Step 5: Manage the Bot (Interactive CLI Menu)

In Termux, launch the interactive manager:
```bash
bash termux.sh
```

An interactive color menu will open:
* **[1] 🚀 Start Bot (Background 24/7):** Starts the background daemon and acquires wakelock.
* **[2] 🛑 Stop Bot:** Stops the bot cleanly and releases the wakelock.
* **[3] 🔄 Restart Bot:** Restarts the background service.
* **[4] 📊 Service Status & RAM Usage:** Displays real-time CPU, RAM, and PID information.
* **[5] 📋 View Live Logs:** Streams live colorized logs (`tail -f wabot.log`).
* **[6] 📱 Get WhatsApp Pairing Code:** Generates an **8-digit linking code directly in the terminal** (no browser or QR scan required).
* **[7] 🌐 Open Dashboard:** Launches the Web UI in your mobile browser at `http://localhost:4000`.
* **[8] ⚡ Setup Auto-Start on Phone Boot:** Configures Termux:Boot to auto-launch the bot on phone restart.
* **[9] 🧹 Clean Session & Cache:** Resets session credentials if reconnecting a new number.
* **[10] 🔑 Configure Gemini AI API Key:** Sets and validates your Google Gemini key.

---

### Direct Command Shortcuts:
- **Start:** `bash termux-start.sh`
- **Status:** `bash termux-status.sh`
- **Stop:** `bash termux-stop.sh`
- **Live Logs:** `tail -f wabot.log`

---

### Production Alternative: PM2 Process Manager

If you prefer PM2 for automatic self-healing restarts:

```bash
# Install PM2 globally
npm install -g pm2

# Keep CPU active
termux-wake-lock

# Start WaBot with PM2
pm2 start server/src/index.js --name wabot

# View status
pm2 status

# View live logs
pm2 logs wabot

# Stop
pm2 stop wabot
```

---

## 🌐 Step 6: Link WhatsApp & Open Dashboard

1. Open your phone's browser (e.g. Chrome) and navigate to:
   👉 **`http://localhost:4000`**
2. On the dashboard, click **Connect WhatsApp**:
   - **Linking directly from the same phone:** Select **Phone Link**, enter your phone number with country code, and type the **8-digit Pairing Code** into WhatsApp (Settings ➔ Linked Devices ➔ Link with phone number instead).
   - **Scanning from another phone:** Scan the on-screen QR code.
3. Toggle the **Auto-Reply** switch to **ON**.
4. Test automated responses live in the **AI Test Sandbox** tab.

> **💡 Accessing the dashboard from a Laptop/PC:**
> If your laptop and phone are connected to the same Wi-Fi network (or your phone's Hotspot), you can open the dashboard on your laptop using your phone's local IP address:
> `http://<phone-ip-address>:4000` (for example, `http://192.168.1.15:4000`).

---

## 🔄 Step 7 (Optional): Auto-Start on Phone Reboot

To have the bot launch automatically whenever your phone restarts:

1. Install the **Termux:Boot** app (from F-Droid).
2. Create the boot scripts folder:
   ```bash
   mkdir -p ~/.termux/boot
   ```
3. Create an auto-start script:
   ```bash
   cat << 'EOF' > ~/.termux/boot/start-wabot.sh
   #!/data/data/com.termux/files/usr/bin/sh
   termux-wake-lock
   cd /data/data/com.termux/files/home/wabot
   bash termux-start.sh
   EOF
   chmod +x ~/.termux/boot/start-wabot.sh
   ```
Now, whenever your Android device powers on or restarts, WaBot will automatically initialize in the background!
