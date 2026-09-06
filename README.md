# 🚆 Live Train Delay Tracker

<p align="center">
  <img src="./public/icons/icon128.png" width="96" height="96" alt="Live Train Delay Tracker Logo" />
  <br />
  <strong>Real-time Indian Railways live train running status and historical punctuality ratings directly on your favorite booking websites.</strong>
</p>

<p align="center">
  <a href="https://microsoftedge.microsoft.com/addons/detail/live-train-delay-tracker/pknpnmpklieceipblhgfniafbcmpakao"><img src="https://img.shields.io/badge/Microsoft%20Edge-Available%20on%20Edge%20Add--ons-0078D7?style=for-the-badge&logo=microsoftedge&logoColor=white" alt="Edge Add-ons" /></a>
  <a href="https://github.com/RajdipGhosh99/irctc-live-delay-extension/releases/latest"><img src="https://img.shields.io/badge/Download-Latest%20Release-blue?style=for-the-badge&logo=github" alt="Download Release" /></a>
  <a href="https://github.com/RajdipGhosh99/irctc-live-delay-extension/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg?style=for-the-badge" alt="GPL 3.0" /></a>
  <img src="https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge" alt="Manifest V3" />
</p>

---

## ⚡ Quick Install

### Option 1: Microsoft Edge Add-ons Store (Recommended)
Install with one click on **Microsoft Edge** or any Chromium browser:  
👉 **[Add to Edge from Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/live-train-delay-tracker/pknpnmpklieceipblhgfniafbcmpakao)**

### Option 2: Chrome / Brave / Vivaldi / Opera (Manual Sideload)
1. **Download:** Grab the latest [`train-delay-tracker-v2.0.0.zip`](https://github.com/RajdipGhosh99/irctc-live-delay-extension/releases/latest/download/train-delay-tracker-v2.0.0.zip).
2. **Unzip:** Extract the archive into a permanent folder on your computer.
3. **Load:** Open `chrome://extensions/` (or `edge://extensions/`), enable **Developer mode** (top-right), click **Load unpacked**, and select the extracted folder.

---

## ✨ Features

- 🟢 **Live Delay Badges:** Interactive `[🚆 Check Live]` delay badges placed seamlessly beside train names on booking portals.
- 📊 **3-Metric Delay Analytics:**
  - **Today Live:** Current real-time delay status and live station arrival/departure.
  - **4-Week Typical:** Historical average delay for today's day of the week over the last month.
  - **Punctuality Score:** 30-day reliability rating percentage.
- 🎯 **Instant Train Lookup:** Enter any 5-digit train number in the extension popup to check its live status instantly without opening a booking site.
- 🎛️ **Floating Quick-Action Button:** Convenient button on search results to fetch all train delays on the page in a single click.
- 💾 **Data Saver & Strict 50 MB Cache:** On-demand fetching only. Remembers checked trains to save mobile data and battery with zero background tracking.
- 🇮🇳 **Out-of-the-Box National Rail Gateways:** Connects directly to real-time train feeds with zero setup, plus optional backup API key support for power users.

---

## 🌐 Supported Booking Websites

| Booking Portal | Website | Integration |
| :--- | :--- | :---: |
| **ConfirmTkt** | `confirmtkt.com` | ✅ Full Support |
| **MakeMyTrip** | `makemytrip.com` | ✅ Full Support |
| **ClearTrip** | `cleartrip.com` | ✅ Full Support |
| **Ixigo** | `ixigo.com` | ✅ Full Support |
| **Goibibo** | `goibibo.com` | ✅ Full Support |
| **Paytm Travel** | `paytm.com` | ✅ Full Support |
| **EaseMyTrip** | `easemytrip.com` | ✅ Full Support |
| **RailYatri** | `railyatri.in` | ✅ Full Support |
| **Universal Scanner** | *Any railway portal* | ✅ Auto-Detect |

---

## 🛠️ How It Works

```mermaid
flowchart LR
    A[Browse Booking Site] --> B[Live Delay Badge]
    B --> C{Checked in Memory?}
    C -->|Yes| D[Instant Display]
    C -->|No| E[National Rail Gateway]
    E --> D
    D --> F[Show Live Delay & Station]
```

1. When you search for tickets on any supported booking site, the extension automatically identifies train listings.
2. Click **Check Live** (or use **Fetch All Delays**) to retrieve the current running delay and station location.
3. Live results are displayed directly on the train card so you can pick the most punctual train before booking.

---

## ⚙️ Customization & Settings

Open **Settings** by clicking the gear icon ⚙️ in the extension popup or via browser extensions menu:
- **Badge Placement:** Choose whether badges appear beside the train name, below it, or in the top-right corner.
- **Data Saver Memory:** Customize how long checked trains are remembered (`0`, `1`, `5`, or `15` minutes).
- **Backup Data Sources:** Add optional RapidAPI or IndianRailAPI backup keys for automatic failover.
- **Site Controls:** Enable or pause badges for specific booking sites.

---

## 💻 Development

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Getting Started
```bash
# Clone the repository
git clone https://github.com/RajdipGhosh99/irctc-live-delay-extension.git
cd irctc-live-delay-extension

# Install dependencies
npm install

# Start development server
npm run dev

# Run type checks and build
npm run build

# Package extension zip
npm run package

# Run Playwright Multi-Tab Live Real-Site E2E Test Suite (Headful by default)
npm run test:e2e
```

---

## 🧪 Automated Playwright Multi-Tab E2E Testing & Single-Source Architecture

The extension features a comprehensive, high-performance E2E testing framework powered by **Playwright** (`playwright`) testing real live production websites without mock fixture URLs:

```mermaid
flowchart TD
    Config["Single-Source Config (src/portals/configs/)"] --> Runtime["Extension Content Adapters"]
    Config --> Playwright["Playwright Multi-Tab E2E Runner"]
    
    subgraph MultiTab [Playwright Multi-Tab Real-Browser Execution]
        T1["Tab 1: Google Search (Scrape Live Trains)"]
        T2["Tab 2: MakeMyTrip Live (Cards, Position Switch, Hover Popup)"]
        T3["Tab 3: ConfirmTkt Live (Cards, Position Switch, Hover Popup)"]
        T4["Tab 4: RailYatri Live (Cards, Position Switch, Hover Popup)"]
        T5["Tab 5: IRCTC NextGen Live (Cards, Position Switch, Hover Popup)"]
    end
    
    Playwright --> MultiTab
    MultiTab --> Evidence["Crisp Test Evidence & Screenshots"]
```

### 1. Single Source of Truth (`src/portals/configs/`)
- All portal URL templates, DOM selectors (cards, titles, anchors), badge positioning rules, and popup interaction parameters are defined once in `src/portals/configs/` (`types.ts`, `routing.ts`, `*.config.ts`).
- Imported directly by both the extension runtime adapters and the E2E test runner, eliminating duplicate configurations.

### 2. Live Multi-Tab Execution & Validation
- **Real Headful Browser Tabs:** Opens real browser tabs sequentially across Google Search and live booking portals so all tabs remain open and observable side-by-side.
- **Dynamic Badge Position Switching:** Every provider is automatically verified across all 3 supported badge positions:
  - `beside-name`: Positioned inline beside train title with pixel-perfect alignment ($\Delta Y \le 6\text{px}$).
  - `card-header-right`: Positioned in card header or right-aligned.
  - `below-name`: Positioned directly underneath the train title.
- **Dedicated Hover Popover Interactivity:**
  - Standardized color system: `box-late` (crimson red) for delayed status, `box-ontime` (emerald green) for on-time status, and `box-neutral` (mature slate) for 4-week typical runs and punctuality ratings.
  - Formatted strictly as 24-hr clock duration (e.g. `04:49` or `00:00`) with zero raw minute counts (`289m Late`).
  - Clean physical station location micro-banner with zero redundant delay text.
  - Action footer featuring compact 24-hour update clock (`Updated: HH:MM`) and interactive **Copy** and **Refresh** buttons.

### 3. Consolidated Real-Site E2E Test Results

Executed on Route: **Kharagpur (`KGP`) ➔ Howrah (`HWH`)**

| Tab | Portal | Trains Identified | Badge Injected | Position Switching (`beside`, `right`, `below`) | Hover Popover | Standard Colors (`box-late`, `box-ontime`, `box-neutral`) | Clean 24h & Zero Duplicates | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tab 1** | **Google Search (Live Scraper)** | 38 Trains | N/A | N/A | N/A | N/A | N/A | ✅ **PASSED** |
| **Tab 2** | **MakeMyTrip (Live Search)** | 42 Cards | ✅ YES | ✅ ALL 3 POSITIONS | ✅ OPENED | ✅ RED / SLATE | ✅ 100% CLEAN | ✅ **PASSED** |
| **Tab 3** | **ConfirmTkt (Live Route)** | 85 Cards | ✅ YES | ✅ ALL 3 POSITIONS | ✅ OPENED | ✅ RED / SLATE | ✅ 100% CLEAN | ✅ **PASSED** |
| **Tab 4** | **RailYatri (Live Route)** | 121 Cards | ✅ YES | ✅ ALL 3 POSITIONS | ✅ OPENED | ✅ RED / SLATE | ✅ 100% CLEAN | ✅ **PASSED** |
| **Tab 5** | **IRCTC NextGen (Live Official)** | 1 Portal | ✅ YES | ✅ ALL 3 POSITIONS | ✅ OPENED | ✅ RED / SLATE | ✅ 100% CLEAN | ✅ **PASSED** |

> 📸 **Visual Test Evidence:** Timestamped screenshot artifacts for all live tabs are generated in [`tests/e2e/screenshots/`](tests/e2e/screenshots/).

---

## 🔒 Privacy & Terms

- **100% Local & Private:** No personal data, browsing history, cookies, or account credentials are collected or transmitted.
- **Zero Telemetry:** No analytics, trackers, or remote code execution.
- **Community Tool:** Designed for interactive passenger use to help travelers choose punctual trains.

> [!NOTE]  
> This is an independent open-source project and is not affiliated with or endorsed by Indian Railways or any third-party booking portals. Delays are informational public estimates. Always verify official station display indicators before boarding.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.  
See the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Rajdip Ghosh**  
- GitHub: [@RajdipGhosh99](https://github.com/RajdipGhosh99)  
- Microsoft Edge Add-on: [Live Train Delay Tracker](https://microsoftedge.microsoft.com/addons/detail/live-train-delay-tracker/pknpnmpklieceipblhgfniafbcmpakao)
