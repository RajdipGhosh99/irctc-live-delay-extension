# Privacy Policy — Live Train Delay Tracker

**Extension:** Live Train Delay Tracker  
**Developer:** Rajdip Ghosh  
**Contact:** [github.com/RajdipGhosh99](https://github.com/RajdipGhosh99)  
**Last updated:** September 9, 2026

---

## 1. Overview

Live Train Delay Tracker is a Chrome browser extension that overlays real-time train delay badges and punctuality history onto train booking search results on supported portals (MakeMyTrip, ConfirmTkt, Ixigo, ClearTrip, Goibibo, Paytm, EaseMyTrip, RailYatri, and IRCTC).

**This extension does not collect, transmit, store remotely, or share any personal data about its users.**

---

## 2. Data We Do NOT Collect

We do not collect or have access to:

- Your name, email address, or any personally identifiable information
- Your location or IP address
- Your browsing history or the list of pages you visit
- Financial or payment information
- Authentication credentials (passwords, PINs, tokens)
- Personal communications
- Clicks, mouse movements, keystrokes, or any behavioral data
- The content of the travel booking pages you view

---

## 3. Data Stored Locally On Your Device

The extension stores the following data **only on your own device** using `chrome.storage.local`. This data never leaves your browser and is never sent to us or any third party.

| Data | Purpose |
|---|---|
| API keys you enter in Settings | To authenticate requests to third-party train status APIs on your behalf |
| Provider preferences (active provider, fallback order, cache TTL, max cache size) | To remember your chosen configuration between browser sessions |
| Cached train delay responses | To avoid redundant API calls for the same train within the user-configured TTL window |

You can clear all locally stored data at any time from the extension's Settings page using the **"Clear All Cache"** button, or by uninstalling the extension.

---

## 4. Network Requests

When you query a train's delay status, the extension calls **third-party public train status APIs** (e.g., RapidAPI, IndianRailAPI, or a custom endpoint you configure). These requests:

- Are made directly from your browser to the API provider
- Contain only the train number and optional travel date required to fetch running status
- Are subject to the privacy policies of the respective API providers
- Do not include any personal information about you

We have no server infrastructure. No data is routed through our servers.

---

## 5. Permissions Explanation

| Permission | Why it's needed |
|---|---|
| `storage` | Save your settings and train delay cache locally on your device |
| `unlimitedStorage` | Allow the local cache to hold data for many trains without hitting Chrome's default 5 MB quota |
| `scripting` | Inject delay badges onto booking portal pages and trigger bulk lookups from the popup |
| `tabs` | Open the Settings page in a new tab when you click "Open Settings" in the popup |
| Host permissions (booking portals) | Run the content script on supported booking sites to inject delay information |
| Host permissions (API domains) | Allow the extension to call third-party train status APIs directly from your browser |

---

## 6. Third-Party APIs

Depending on the provider you configure, the extension may call:

- **RapidAPI** (rapidapi.com) — subject to [RapidAPI's Privacy Policy](https://rapidapi.com/privacy)
- **IndianRailAPI** (indianrailapi.com) — subject to IndianRailAPI's own terms
- A **custom API endpoint** of your own choosing

We do not control these services and are not responsible for their data practices.

---

## 7. No Remote Code

All JavaScript and CSS that this extension executes is bundled inside the extension package itself. The extension does not load, evaluate, or execute any remote code from external URLs.

---

## 8. Children's Privacy

This extension is not directed at children under 13 and does not knowingly collect any information from children.

---

## 9. Changes to This Policy

If we make material changes to this privacy policy, we will update the **Last updated** date at the top of this document and publish the updated version to this repository.

---

## 10. Contact

If you have questions about this privacy policy, please open an issue at:  
[https://github.com/RajdipGhosh99/live-train-running-status-browser-extension/issues](https://github.com/RajdipGhosh99/live-train-running-status-browser-extension/issues)
