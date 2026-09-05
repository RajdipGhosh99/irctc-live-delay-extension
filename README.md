# 🚆 Live Train Delay Tracker (v2.0.0)

![Banner](./public/icons/banner.jpg)

<p align="center">
  <img src="./public/icons/icon128.png" width="80" height="80" alt="Extension Logo" />
  <br />
  <strong>Open-source, high-performance Chrome & Chromium Extension displaying real-time train running delays and historical punctuality directly on ConfirmTkt, MakeMyTrip, ClearTrip, Ixigo, Goibibo, and Paytm.</strong>
</p>

<p align="center">
  <a href="https://microsoftedge.microsoft.com/addons/detail/live-train-delay-tracker/pknpnmpklieceipblhgfniafbcmpakao"><img src="https://img.shields.io/badge/Microsoft%20Edge-Available%20on%20Edge%20Add--ons-0078D7?style=for-the-badge&logo=microsoftedge&logoColor=white" alt="Available on Microsoft Edge Add-ons" /></a>
  <a href="https://github.com/RajdipGhosh99/irctc-live-delay-extension/releases/latest"><img src="https://img.shields.io/badge/Download-Latest%20Release%20(v2.0.0)-blue?style=for-the-badge&logo=github" alt="Download Release" /></a>
  <a href="https://github.com/RajdipGhosh99/irctc-live-delay-extension/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=for-the-badge" alt="GPL 3.0 License" /></a>
  <a href="https://github.com/RajdipGhosh99"><img src="https://img.shields.io/badge/Author-Rajdip%20Ghosh-indigo?style=for-the-badge&logo=github" alt="Author" /></a>
  <img src="https://img.shields.io/badge/Copyleft-ShareAlike-success?style=for-the-badge" alt="Copyleft ShareAlike" />
  <img src="https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge" alt="Manifest V3" />
</p>

---

## 📥 Installation & Setup Guide

### Method 1: Install from Microsoft Edge Add-ons Store (Recommended)
You can install the extension directly from the official store with one click on Microsoft Edge or any Chromium browser:  
👉 **[Get Live Train Delay Tracker on Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/live-train-delay-tracker/pknpnmpklieceipblhgfniafbcmpakao)**

---

### Method 2: Manual 30-Second Sideload (Chrome, Brave, Edge, Opera, Vivaldi)
You can also install the latest release directly via developer mode in 30 seconds:

#### Step 1: Download the Extension Zip
👉 **[Download Latest Release (`train-delay-tracker-v2.0.0.zip`)](https://github.com/RajdipGhosh99/irctc-live-delay-extension/releases/latest/download/train-delay-tracker-v2.0.0.zip)**  
*(Or browse all versions on the [GitHub Releases Page](https://github.com/RajdipGhosh99/irctc-live-delay-extension/releases))*

#### Step 2: Extract / Unzip
- Extract the downloaded `.zip` file into a permanent folder on your computer (e.g. `Documents/train-delay-tracker` or `Downloads/train-delay-tracker-v2.0.0`).

#### Step 3: Load into your Browser
1. Open your browser and go to the extension management page:
   - **Google Chrome / Brave / Vivaldi:** `chrome://extensions/`
   - **Microsoft Edge:** `edge://extensions/`
   - **Opera:** `opera://extensions/`
2. Turn on the **Developer mode** toggle switch (located in the top-right corner).
3. Click the **Load unpacked** button (top-left corner).
4. Select the extracted folder.

#### Step 4: Accept Terms & Start Tracking!
- Click the 🚆 icon in your browser toolbar to open the extension popup.
- Accept the Non-Commercial Terms and start tracking live train delays across any supported booking website!

---

### 🔄 How to Update to Newer Releases
When a new version is released on GitHub:
1. Download the new release `.zip` file from [Releases](https://github.com/RajdipGhosh99/irctc-live-delay-extension/releases).
2. Extract and replace the files in your existing extension folder.
3. Open `chrome://extensions/` and click the **Reload (↻)** icon on the Train Delay Tracker card.

---

## 🌟 Key Features

- ⚡ **Zero-Friction Live Delay Badges:** Injects interactive `[🚆 Check ↻]` badges directly beside train names on search results pages.
- 📊 **3-Metric Delay Analytics:**
  - **`🟢 Today Live`** ➔ Real-time running delay for today's active trip.
  - **`📊 Today Avg`** ➔ Historical average delay on this specific day of the week across the **Last 4 Weeks**.
  - **`📈 30-Day Avg`** ➔ Overall 30-day all-days punctuality rate and percentage.
- 📍 **Crisp Live Station Position:** Short, actionable updates (e.g. `📍 Arrived at NEW DELHI (06:30)` or `📍 Departed from KOTA JN (22:28)`).
- 🚆 **Multi-Portal Modular Support:** Works out-of-the-box via isolated website adapters on:
  - ✅ **ConfirmTkt** (`confirmtkt.com`)
  - ✅ **MakeMyTrip** (`makemytrip.com`)
  - ✅ **ClearTrip** (`cleartrip.com`)
  - ✅ **Ixigo** (`ixigo.com`)
  - ✅ **Goibibo** (`goibibo.com`)
  - ✅ **Paytm Travel** (`paytm.com`)
  - ✅ **EaseMyTrip** (`easemytrip.com`)
  - ✅ **RailYatri** (`railyatri.in`)
  - ✅ **Generic Leaf Scanner** (Fallback for any upcoming booking portal)
- 🛡️ **Multi-Token API Rotation Pool:** Automatically rotates across direct public gateway, RapidAPI Rail Engine 1, RapidAPI Rail Engine 2, and IndianRailAPI with automatic circuit breaker fallback.
- 💾 **50 MB Smart Cache & Selectable Retention Policies:**
  - **No Cache (Default)**: Always live queries without local memory retention.
  - **1 Minute / 5 Minutes / 15 Minutes**: Optional retention policies to preserve quota.
  - Capped strictly at 50 MB with automatic expired & LRU eviction.
- 🎛️ **Floating HUD with Batch Fetch:** Floating controller pinned to the viewport with `⚡ Fetch All` and tab-specific dismissal.
- 🔍 **Instant Quick Search Popup:** Look up any 5-digit train number directly from the browser extension popup without visiting any booking website.

---

## 🏛️ Strategy Pattern Architecture

```
                                  [ User Browses Booking Site ]
                                                │
                                  [ PortalRegistry.getActiveAdapter() ]
                                                │
         ┌──────────────────────────────┬───────┴──────────────────────┬──────────────────────────────┐
         ▼                              ▼                              ▼                              ▼
[ ConfirmTktAdapter ]          [ MakeMyTripAdapter ]          [ ClearTripAdapter ]          [ GenericPortalAdapter ]
 • Tailwind Flex Row            • React Card Layout            • Row Layout                   • Leaf Text Scanner
 • id^="train-" Selector        • .train-name-wrap             • Beside-name anchor           • Universal 5-Digit Regex
         │                              │                              │                              │
         └──────────────────────────────┴───────┬──────────────────────┴──────────────────────────────┘
                                                ▼
                                    [ Injected Delay Badge ]
                                                │
                             [ Background Service Worker Gateway ]
                                                │
                         ┌──────────────────────┴──────────────────────┐
                         ▼                                             ▼
              [ 50MB Local Cache ]                          [ Multi-Tier Gateway Coordinator ]
               • Selectable TTL (0, 1, 5, 15m)               1. Direct Public Gateway (Free)
               • LRU Quota Pruning                           2. RapidAPI Rail Engine 1 (Multi-Token)
                                                             3. RapidAPI Rail Engine 2 (Multi-Token)
                                                             4. IndianRail Gateway (Direct Key)
```

---

## 💻 Developer & Maintainer Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Clone & Install
```bash
git clone https://github.com/RajdipGhosh99/irctc-live-delay-extension.git
cd irctc-live-delay-extension
npm install
```

### 2. Build & Test
```bash
# Start Vite development server
npm run dev

# Build production bundle
npm run build

# Package distribution zip
npm run package
```

### 3. Automated Versioning & Release
To publish a new version release to GitHub:
```bash
# Automated release script (builds, packages, tags, and generates zip)
./scripts/release.sh 2.0.0

# Push tag to trigger GitHub Actions automated release
git push origin main --tags
```

---

## ⚙️ Configuration & Custom API Keys

1. Right-click the extension icon in your browser and select **Options** (or click the ⚙️ icon in the popup).
2. Add your personal RapidAPI or IndianRailAPI tokens for custom failover pools.
3. Toggle individual portal integrations or customize badge placement (`Beside Name`, `Below Name`, `Card Header Right`).

---

## ⚠️ Legal Disclaimer & Anti-Abuse Policy

> 🚫 **Acceptable Use Notice:**  
> This extension is provided for **fair, individual, non-commercial passenger use** only. Automated web scraping, botting, high-frequency polling, denial-of-service (DoS) attempts, or commercial resale of live data are strictly prohibited. The software enforces strict on-demand click-to-fetch limits and local caching to protect public railway infrastructure.

- **Independent Project:** This extension is an independent open-source project and is **not affiliated with, endorsed by, or connected to** any private ticketing portal. All trademarks belong to their respective owners.
- **AS-IS Software:** Live running delay times and arrival predictions are informational estimates based on public signals and third-party APIs. Always cross-verify journey schedules with official railway station displays before traveling.

See the full [`DISCLAIMER.md`](DISCLAIMER.md) for complete terms.

---

## 🔒 Privacy Policy

**Last Updated:** September 5, 2026

Live Train Delay Tracker is committed to protecting your privacy:
- **Zero Personal Data Collection:** The extension does not collect, track, transmit, sell, or share any personal data, browsing history, cookies, or user credentials.
- **Local Storage Usage:** The `storage` and `unlimitedStorage` permissions are used strictly on your local machine to cache live train status (capped at 50 MB) and save your custom preferences.
- **Permissions:** The `tabs` and `scripting` permissions and host access patterns are used exclusively to inject interactive delay badges into train search results.
- **Zero Remote Code:** No remote scripts, `eval()`, or external executable code are used. All assets are self-contained.

---

## 📄 License & Copyleft Protection

Distributed under the **GNU General Public License v3.0 (GPL-3.0)** (Strict Copyleft / Share-Alike).

> ⚖️ **Open Source Protection Clause:**  
> This project is 100% free and open-source. Under the terms of the GNU GPLv3, anyone who modifies, extends, forks, or builds derivative software based on this codebase **must also release their derivative work as 100% open-source under the exact same GPL-3.0 license**. Proprietary derivatives, closing the source code, or commercial lock-in are legally prohibited.

See the [`LICENSE`](LICENSE) file for complete legal terms.

---

## 👨‍💻 Author & Maintainer

**Rajdip Ghosh**  
🔗 GitHub: [@RajdipGhosh99](https://github.com/RajdipGhosh99)  
🌐 Repository: [https://github.com/RajdipGhosh99/irctc-live-delay-extension](https://github.com/RajdipGhosh99/irctc-live-delay-extension)
