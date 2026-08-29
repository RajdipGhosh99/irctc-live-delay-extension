# 🚆 Live Train Delay Tracker (Open Source Edition)

![Banner](./public/icons/banner.jpg)

<p align="center">
  <img src="./public/icons/icon128.png" width="80" height="80" alt="Extension Logo" />
  <br />
  <strong>Open-source, high-performance Chrome Extension displaying real-time train running delays and historical punctuality directly on IRCTC, ConfirmTkt, MakeMyTrip, ClearTrip, Ixigo, Goibibo, and Paytm.</strong>
</p>

<p align="center">
  <a href="https://github.com/RajdipGhosh99/irctc-live-delay-extension/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=for-the-badge" alt="GPL 3.0 License" /></a>
  <a href="https://github.com/RajdipGhosh99/irctc-live-delay-extension/releases/tag/v1.5.0"><img src="https://img.shields.io/badge/Release-v1.5.0-indigo?style=for-the-badge" alt="Release v1.5.0" /></a>
  <a href="https://github.com/RajdipGhosh99"><img src="https://img.shields.io/badge/Author-Rajdip%20Ghosh-blue?style=for-the-badge&logo=github" alt="Author" /></a>
  <img src="https://img.shields.io/badge/Copyleft-ShareAlike-success?style=for-the-badge" alt="Copyleft ShareAlike" />
  <img src="https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" alt="PRs Welcome" />
</p>

---

## 🌟 Key Features

- ⚡ **Zero-Friction Live Delay Badges:** Injects interactive `[🚆 Check ↻]` badges directly beside train names on search results pages.
- 📊 **3-Metric Delay Analytics:**
  - **`🟢 Today Live`** ➔ Real-time running delay for today's active trip.
  - **`📊 Today Avg`** ➔ Historical average delay on this specific day of the week across the **Last 4 Weeks**.
  - **`📈 30-Day Avg`** ➔ Overall 30-day all-days punctuality rate and percentage.
- 📍 **Crisp Live Station Position:** Short, actionable updates (e.g. `📍 Arrived at NEW DELHI (06:30)` or `📍 Departed from JHARSUGUDA JN (10:56)`).
- 🚆 **Multi-Portal Support:** Works out-of-the-box on:
  - ✅ **IRCTC** (`irctc.co.in`)
  - ✅ **ConfirmTkt** (`confirmtkt.com`)
  - ✅ **MakeMyTrip** (`makemytrip.com`)
  - ✅ **ClearTrip** (`cleartrip.com`)
  - ✅ **Ixigo** (`ixigo.com`)
  - ✅ **Goibibo** (`goibibo.com`)
  - ✅ **Paytm Travel** (`paytm.com`)
  - ✅ **EaseMyTrip** (`easemytrip.com`)
- 🛡️ **Multi-Token API Rotation Pool:** Automatically rotates across official NTES, RapidAPI IRCTC1, RapidAPI IndianRail, and IndianRailAPI with automatic circuit breaker fallback.
- 💾 **Smart Local Cache:** 0 duplicate API calls on hover — cached entries load instantaneously with zero network overhead.
- 🎛️ **Floating HUD with Batch Fetch:** Floating controller pinned to the viewport with `⚡ Fetch All` and tab-specific dismissal.
- 🔍 **Instant Quick Search Popup:** Look up any 5-digit train number directly from the browser extension popup without visiting any booking website.

---

## 🏛️ Architecture & Data Flow

```
                                  [ User Interacts ]
                                          │
            ┌─────────────────────────────┴─────────────────────────────┐
            ▼                                                           ▼
 [ Booking Sites Content Script ]                             [ Extension Popup ]
  • WeakSet DOM Registry O(1)                                  • Quick 5-Digit Search Bar
  • RxJS Debounced Mutation Observer                           • Real-Time Delay Status Card
  • 0 Hover API Calls (Strict On-Demand)                       • Global & Per-Site Toggles
            │                                                           │
            └─────────────────────────────┬─────────────────────────────┘
                                          ▼
                      [ Background Service Worker Gateway ]
                                          │
              ┌───────────────────────────┴───────────────────────────┐
              ▼                                                       ▼
  [ Local Cache Engine ]                                  [ In-Flight Coalescer ]
   • Zero-latency local records                            • Deduplicates rapid clicks
   • Auto-pruned expired storage                           • 1 single flight request
              │                                                       │
              └───────────────────────────┬───────────────────────────┘
                                          ▼
                         [ Multi-Tier Resilient Fallback ]
                                          │
    ┌─────────────────────────┬───────────┴───────────┬─────────────────────────┐
    ▼                         ▼                       ▼                         ▼
[ Tier 1: Official IRCTC ] [ Tier 2: RapidAPI 1 ]  [ Tier 3: RapidAPI 2 ]   [ Tier 4: IndianRail ]
 • NTES Direct API          • Key Pool Rotation     • Key Pool Rotation      • Direct Token Key
 • 100% Free & Unlimited    • Circuit Breaker       • Circuit Breaker        • 250 calls/day
```

---

## 🚀 Quickstart & Developer Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Google Chrome or any Chromium-based browser (Brave, Edge, Arc)

### 1. Clone & Install
```bash
git clone https://github.com/RajdipGhosh99/irctc-live-delay-extension.git
cd irctc-live-delay-extension
npm install
```

### 2. Build the Extension
```bash
# Development build
npm run dev

# Production build
npm run build

# Package distribution zip
npm run package
```

### 3. Load in Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory.
4. Open any train booking site (e.g. [ConfirmTkt](https://www.confirmtkt.com) or [IRCTC](https://www.irctc.co.in)) and start tracking!

---

## ⚙️ Configuration & Custom API Keys

1. Right-click the extension icon in Chrome and select **Options** (or click the ⚙️ icon in the popup).
2. Add your personal RapidAPI or IndianRailAPI tokens for custom failover pools.
3. Toggle individual portal integrations or customize badge placement (`Beside Name`, `Below Name`, `Card Header Right`).

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!  
Feel free to check the [Issues page](https://github.com/RajdipGhosh99/irctc-live-delay-extension/issues) or submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

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

