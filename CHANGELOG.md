# Changelog

All notable changes to the **Live Train Delay Tracker** extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.3] - 2026-09-06

### 🐛 Fixed
- **Settings Navigation Linking**: Fixed broken sidebar links for "Data Providers & Keys" (`#providers`) and "Caching & Performance" (`#caching`) on the options dashboard by assigning matching section element IDs.
- **Settings Card Decoupling**: Separated background on-demand controls from local memory cache TTL retention into dedicated, focused cards.

### 🚀 Added
- **IntersectionObserver Scroll-Spy**: Added responsive scroll-spy to automatically synchronize the active sidebar tab as users scroll through settings cards.

---

## [2.0.2] - 2026-09-06

### 🚀 Added
- **Universal Floating HUD Restore Action**: Added a dedicated "Restore HUD" action button in the extension popup context card and a global keyboard shortcut (`Alt + H` / `Option + H`) to resurrect or toggle the HUD on any supported booking portal.
- **High-Visibility Minimized Launcher Pill**: Replaced minimal bubble with an informative floating badge (`[ 🚄 Live Tracker | X Trains ]`) featuring live train counter badge, hover illumination, and keyboard accessibility.
- **Version & Extension ID Badges**: Embedded manifest version tags and extension IDs across the in-page Floating HUD header, popup toolbar, and options dashboard.
- **Deep-Linkable Release Anchors**: Added direct anchor targets (`#v2.0.2`, `#v2.0.1`, etc.) in the options release history hub.

### 🐛 Fixed
- **HUD Auto-Hiding on SPA Route Transitions**: Integrated `FloatingHudComponent.ensureAttached()` into the `MutationObserver` scan cycle to automatically re-attach the HUD when single-page portals (ConfirmTkt, MakeMyTrip, Ixigo, ClearTrip) wipe non-React DOM nodes on filter changes or route navigations.
- **CSS Specificity for Minimizing**: Swapped inline style toggles with explicit utility classes (`.rail-hud-visible`, `.rail-hud-hidden`) and `!important` priority to eliminate stylesheet specificity conflicts.

---

## [2.0.1] - 2026-09-06

### 🚀 Added
- **Official Extension Identity (Option 1D)**: New modern Squircle app icon featuring deep obsidian canvas, vibrant Indian Tricolor perimeter gradient, overhead Navy Ashoka Chakra punctuality dial, and a real-time live status beacon.
- **Modular Playwright E2E Suite**: Decoupled monolithic test suite into dedicated provider packages under `tests/e2e/providers/` (`makemytrip/`, `confirmtkt/`, `railyatri/`, `irctc/`, `cleartrip/`, `ixigo/`, `goibibo/`, `paytm/`, `easemytrip/`).
- **Standalone Provider Test Execution**: Added direct execution capability (`npx tsx tests/e2e/providers/<provider>`) for isolated local validation.

### 🔄 Changed
- **Asset Re-generation**: Re-rendered master vector SVG and all resolution icons (`16px`, `32px`, `48px`, `128px`, `512px`) with crisp transparency and high DPI.
- **Workflow & Command Standardization**: Harmonized npm build, release, and E2E automation scripts.

### 🐛 Fixed
- **Clean Git Tracking**: Untracked runtime test screenshot artifacts from git into `.gitignore`.
- **Portal Popover Alignment**: Enhanced popover transform stability and zero-duplicate containment across booking portals.

---

## [2.0.0] - 2026-09-05

### 🚀 Added
- **50 MB Cache Quota**: Strictly enforced 50 MB local storage cap with automatic LRU and expired cache item eviction.
- **Selectable Cache Policies**: Added options for **No Cache (Default)**, **1 Minute (Ultra Fresh)**, **5 Minutes (Recommended)**, and **15 Minutes**.
- **Mandatory Terms & Fair Use Gate**: First-run onboarding modal in popup requiring users to review and accept the Personal Fair Use Policy, Anti-Abuse Rules, and Legal Disclaimers before querying.
- **Floating Viewport HUD**: Expandable floating controller on booking portals with batch fetch (`⚡ Fetch All`) and live status metrics.
- **Modular Portal Strategy Pattern**: Decoupled architecture (`src/portals/`) supporting ConfirmTkt, MakeMyTrip, ClearTrip, Ixigo, Goibibo, Paytm, EaseMyTrip, RailYatri, and generic fallback.
- **Multi-Token API Rotation Pool**: High-speed failover rotation across direct public gateway, RapidAPI Rail Engine 1, RapidAPI Rail Engine 2, and IndianRailAPI.
- **Automated GitHub Releases Pipeline**: GitHub Actions workflow packaging deterministic `.zip` archives with SHA-256 checksums on tag push.

### 🛡️ Legal & Compliance
- **Brand-Neutral Refactoring**: Completely scrubbed trademarked and proprietary identifiers.
- **De-branding**: Removed all instances of "Unofficial"; established "Personal Fair Use Only" independent project guidelines.
- **Anti-Abuse Protection**: Rate-limiting safeguards and click-to-fetch on-demand querying to prevent unnecessary network load.

---

## [1.5.0] - 2026-08-29

### 🚀 Added
- Initial Chrome Manifest V3 extension architecture.
- Real-time live train delay tracking with 3-metric statistical cards (Live delay, Day-of-week average, 30-day punctuality rate).
- Quick Search popup toolbar for instantaneous 5-digit train number lookups.
- Options settings dashboard with token configuration and custom badge positions.

---

[2.0.3]: https://github.com/RajdipGhosh99/irctc-live-delay-extension/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/RajdipGhosh99/irctc-live-delay-extension/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/RajdipGhosh99/irctc-live-delay-extension/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/RajdipGhosh99/irctc-live-delay-extension/compare/v1.5.0...v2.0.0
[1.5.0]: https://github.com/RajdipGhosh99/irctc-live-delay-extension/releases/tag/v1.5.0
