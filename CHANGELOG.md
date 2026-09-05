# Changelog

All notable changes to the **Live Train Delay Tracker** extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
