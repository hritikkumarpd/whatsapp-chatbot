# 📋 WaBot Pro — System Requirements & Auto-Installer Guide

> **Zero Hassle Rule:** You don't need to manually hunt down and install dependencies. We have provided dedicated **Auto-Installer Scripts** for every major platform that **automatically detect, download, and configure missing prerequisites**.

---

## 📊 Requirements Summary by Platform

| Platform | What you need beforehand | What the script auto-installs if missing | Auto-Install Script |
| :--- | :--- | :--- | :--- |
| 🪟 **Windows (10/11/Server)** | Windows PC | Node.js 20 LTS (via winget/MSI) + npm packages | [`start-windows.bat`](start-windows.bat) |
| 🐧 **Ubuntu / Debian / VPS** | Fresh Linux Server | `curl`, `git`, `unzip`, `build-essential`, `Node.js 20 LTS`, npm packages | [`install-linux.sh`](install-linux.sh) |
| 🥧 **Raspberry Pi** | Raspberry Pi OS | `curl`, `git`, `unzip`, `build-essential`, `Node.js 20 LTS`, npm packages | [`install-linux.sh`](install-linux.sh) |
| 🍎 **macOS** | macOS (Intel / Apple Silicon) | Command Line Tools, Homebrew, `Node.js 20 LTS`, npm packages | [`install-mac.sh`](install-mac.sh) |
| 📱 **Android (Termux)** | Termux App (from F-Droid) | `nodejs-lts`, `git`, `curl`, `unzip`, `termux-tools`, `termux-api`, npm packages | [`termux-install.sh`](termux-install.sh) |

---

## ⚡ 1-Click Auto-Installers (How to Run)

### 1. Windows 10 / 11 / Server
* **Execution:** Simply double-click **`start-windows.bat`**!
* **Automated Actions:**
  1. Checks if Node.js is installed; if missing, automatically installs Node.js 20 LTS using Windows Package Manager (`winget`) or direct MSI download.
  2. Installs required server dependencies (`npm install`).
  3. Launches the dashboard UI and terminal manager!

---

### 2. Linux VPS (Ubuntu / Debian / CentOS / Fedora / Arch)
* **Execution:**
  ```bash
  chmod +x install-linux.sh setup.sh
  ./install-linux.sh
  ```
* **Automated Actions:**
  1. Detects and installs `curl`, `git`, `unzip`, and `build-essential` via the native package manager (`apt`, `dnf`, or `pacman`).
  2. Sets up NodeSource repository and installs Node.js 20 LTS.
  3. Installs server dependencies.
  4. Provides an option to configure a systemd 24/7 background service.

---

### 3. Raspberry Pi (Zero 2W, 3, 4, 5)
* **Execution:**
  ```bash
  ./install-linux.sh
  ```
* **Automated Actions:**
  1. Installs ARM32/ARM64 compatible Node.js LTS and build tools.
  2. Configures low-memory optimizations (RAM footprint capped under 150MB).

---

### 4. macOS (MacBook / Mac Mini / iMac)
* **Execution:**
  ```bash
  chmod +x install-mac.sh
  ./install-mac.sh
  ```
* **Automated Actions:**
  1. Checks for and installs Homebrew if not already installed.
  2. Installs Node.js LTS via Homebrew.
  3. Installs all project dependencies.

---

### 5. Android Phone (Termux)
* **Execution:**
  ```bash
  bash termux-install.sh
  ```
* **Automated Actions:**
  1. Updates Termux package repositories (`pkg update -y`).
  2. Installs `nodejs-lts`, `git`, `curl`, `unzip`, `termux-tools`, and `termux-api`.
  3. Verifies the pre-built web UI bundle (no heavy frontend build required on phone).
  4. Acquires Android CPU WakeLock (`termux-wake-lock`) so background execution stays active when the screen turns off.

---

### 🌐 Universal One-Command Installer (Linux, macOS, Raspberry Pi, Termux)
If you aren't sure which script to choose, run this single universal command:
```bash
bash setup.sh
```
It automatically detects your platform (Termux, macOS, or Linux/Pi) and routes to the appropriate installer.

---

## 💻 Hardware Requirements

| Resource | Minimum | Recommended |
| :--- | :--- | :--- |
| **RAM** | 512 MB (Termux / Pi Zero) | 1 GB or more |
| **Disk Space** | ~250 MB | 500 MB |
| **CPU** | Any x86_64, ARMv7, or ARM64 | Single Core 1GHz+ |
| **Internet** | 128 kbps (Lightweight WhatsApp text) | Stable Wi-Fi / 4G / 5G |
| **WhatsApp** | Active WhatsApp account on any phone | Official WhatsApp app |
| **AI Key** | Google Gemini API Key (Free tier available) | Free key from Google AI Studio |
