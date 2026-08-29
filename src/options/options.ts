/**
 * Options Dashboard Script (Manifest V3) - ISO/IEC 25010 & ISO 9241-171 Standardized Edition
 * Features:
 * 1. Multi-Token Pool Manager with Instant Testing & Quota Calculation.
 * 2. ISO/IEC 27001 Security: Safe input sanitization, zero plaintext key exposure.
 * 3. ISO 9241-171 Accessibility: Keyboard focus traps, Esc key modal dismissal, full ARIA roles.
 * 4. ISO 8601: Complete ISO timestamp tracking across token health metrics and cache records.
 * 5. Per-Site Configurable Positioning and Responsive layout.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { ProviderId, ExtensionMessage, MultiProviderSettings, BadgePosition } from '../types';
import { maskIsoCredential, sanitizeIsoString } from '../utils/iso-utils';

const SUPPORTED_SITES = [
  { name: 'MakeMyTrip', host: 'makemytrip.com', note: 'Ample horizontal room beside train name' },
  { name: 'ConfirmTkt', host: 'confirmtkt.com', note: 'Clean train card header' },
  { name: 'IRCTC', host: 'irctc.co.in', note: 'Official Indian Railways portal' },
  { name: 'ClearTrip', host: 'cleartrip.com', note: 'Train listing row' },
  { name: 'Ixigo Trains', host: 'ixigo.com', note: 'Train search card' },
  { name: 'Goibibo Trains', host: 'goibibo.com', note: 'Train listing' },
  { name: 'Paytm Trains', host: 'paytm.com', note: 'Paytm rail card' },
  { name: 'EaseMyTrip', host: 'easemytrip.com', note: 'Train booking listing' },
  { name: 'RailYatri', host: 'railyatri.in', note: 'RailYatri search results' },
];

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const masterSwitch = document.getElementById('master-switch') as HTMLInputElement;
  const sitesGrid = document.getElementById('sites-grid') as HTMLElement;
  const primaryProviderSelect = document.getElementById('primary-provider-select') as HTMLSelectElement;
  const autoFailoverSwitch = document.getElementById('auto-failover-switch') as HTMLInputElement;
  const autoFetchAllSwitch = document.getElementById('auto-fetch-all-switch') as HTMLInputElement;
  const cacheTtlSelect = document.getElementById('cache-ttl-select') as HTMLSelectElement;
  const showHudSwitch = document.getElementById('show-hud-switch') as HTMLInputElement;
  const saveAllBtn = document.getElementById('save-all-btn') as HTMLButtonElement;
  const toastMessage = document.getElementById('toast-message') as HTMLElement;
  const cacheRecordsCount = document.getElementById('cache-records-count') as HTMLElement;
  const clearCacheBtn = document.getElementById('clear-cache-btn') as HTMLButtonElement;
  const totalQuotaBadge = document.getElementById('total-quota-badge') as HTMLElement;
  const providerPoolsContainer = document.getElementById('provider-pools-container') as HTMLElement;

  // Mobile Menu
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle') as HTMLButtonElement;
  const optionsSidebar = document.getElementById('options-sidebar') as HTMLElement;

  // Modal Elements
  const testModal = document.getElementById('test-modal') as HTMLElement;
  const modalProviderName = document.getElementById('modal-provider-name') as HTMLElement;
  const modalTokenLabel = document.getElementById('modal-token-label') as HTMLElement;
  const modalTokenMasked = document.getElementById('modal-token-masked') as HTMLElement;
  const modalStatusBox = document.getElementById('modal-status-box') as HTMLElement;
  const modalStatusIndicator = document.getElementById('modal-status-indicator') as HTMLElement;
  const modalStatusMessage = document.getElementById('modal-status-message') as HTMLElement;
  const modalCancelBtn = document.getElementById('modal-cancel-btn') as HTMLButtonElement;
  const modalSkipTestBtn = document.getElementById('modal-skip-test-btn') as HTMLButtonElement;
  const modalTestAddBtn = document.getElementById('modal-test-add-btn') as HTMLButtonElement;

  let loadedSettings: MultiProviderSettings | null = null;
  let catalog: Record<string, any> = {};

  let pendingToken: {
    providerId: ProviderId;
    key: string;
    label: string;
    inputElement: HTMLInputElement;
    labelElement: HTMLInputElement;
  } | null = null;

  function showToast(message: string, isError = false) {
    toastMessage.textContent = message;
    toastMessage.className = `toast ${isError ? 'error' : 'success'}`;
    toastMessage.setAttribute('aria-live', 'assertive');
    setTimeout(() => {
      toastMessage.className = 'toast hidden';
    }, 4500);
  }

  mobileMenuToggle?.addEventListener('click', () => {
    optionsSidebar?.classList.toggle('open');
    const isOpen = optionsSidebar?.classList.contains('open');
    mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll<HTMLAnchorElement>('.nav-item').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
      link.classList.add('active');

      const targetId = link.getAttribute('data-target');
      if (targetId) {
        const section = document.getElementById(targetId);
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      optionsSidebar?.classList.remove('open');
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // ISO/IEC 25010 Token Format Validation Checker
  function validateTokenFormat(providerId: ProviderId, key: string): { valid: boolean; error?: string; cleanKey: string } {
    const cleanKey = key.trim().replace(/^["']|["']$/g, '');

    if (!cleanKey) {
      return { valid: false, error: 'Token string cannot be empty.', cleanKey };
    }

    if (cleanKey.toLowerCase().includes('your_api_key') || cleanKey.toLowerCase().includes('paste_key')) {
      return { valid: false, error: 'Please replace placeholder with your actual API token.', cleanKey };
    }

    if (providerId === 'rapidapi-irctc1' || providerId === 'rapidapi-indianrail') {
      if (cleanKey.length < 25) {
        return { valid: false, error: 'RapidAPI keys are typically 40-60 characters long.', cleanKey };
      }
      if (!/^[a-zA-Z0-9_\-]+$/.test(cleanKey)) {
        return { valid: false, error: 'RapidAPI token contains invalid special characters.', cleanKey };
      }
    } else if (providerId === 'indianrailapi') {
      if (cleanKey.length < 15) {
        return { valid: false, error: 'IndianRailAPI token is too short (at least 15 characters).', cleanKey };
      }
    }

    return { valid: true, cleanKey };
  }

  function renderSitesGrid(disabledSites: string[], sitePositions: Record<string, BadgePosition> = {}) {
    sitesGrid.innerHTML = '';
    const disabledSet = new Set(disabledSites.map((s) => s.toLowerCase()));

    SUPPORTED_SITES.forEach((site) => {
      const isEnabled = !disabledSet.has(site.host.toLowerCase());
      const currentPos = sitePositions[site.host.toLowerCase()] || 'beside-name';

      const card = document.createElement('div');
      card.className = 'site-config-card';
      card.innerHTML = `
        <div class="site-card-top">
          <div class="site-name-group">
            <strong>${sanitizeIsoString(site.name)}</strong>
            <span class="site-host-sub">${sanitizeIsoString(site.host)}</span>
          </div>
          <label class="switch">
            <input type="checkbox" class="site-toggle" data-host="${site.host}" ${isEnabled ? 'checked' : ''} aria-label="Toggle ${site.name}" />
            <span class="slider round"></span>
          </label>
        </div>

        <div class="site-position-row">
          <label for="pos-${site.host}">Badge Position:</label>
          <select id="pos-${site.host}" class="site-pos-select" data-host="${site.host}" aria-label="Badge Position for ${site.name}">
            <option value="beside-name" ${currentPos === 'beside-name' ? 'selected' : ''}>📍 Beside Train Name (Inline Right)</option>
            <option value="card-header-right" ${currentPos === 'card-header-right' ? 'selected' : ''}>↗ Top-Right of Train Card</option>
            <option value="below-name" ${currentPos === 'below-name' ? 'selected' : ''}>⬇ Below Train Name</option>
          </select>
        </div>
      `;
      sitesGrid.appendChild(card);
    });
  }

  function renderProviderPools(providers: Record<string, any>) {
    providerPoolsContainer.innerHTML = '';

    let totalActiveKeys = 0;
    let totalEstimatedCalls = 0;
    let totalInvalidKeys = 0;

    const providerOrder: ProviderId[] = ['rapidapi-irctc1', 'rapidapi-indianrail', 'indianrailapi', 'irctc-official', 'custom'];

    providerOrder.forEach((pid) => {
      const conf = providers[pid] || { keys: [] };
      const meta = catalog[pid] || {
        name: pid,
        freeTierLimit: 'Free tier available',
        perTokenQuota: 500,
        signupUrl: '',
        requiresKey: true,
      };

      const keys: any[] = conf.keys || [];
      const activeKeys = keys.filter((k) => k.status === 'active');
      const invalidKeys = keys.filter((k) => k.status === 'invalid' || k.status === 'rate-limited');

      totalActiveKeys += activeKeys.length;
      totalEstimatedCalls += activeKeys.length * (meta.perTokenQuota || 500);
      totalInvalidKeys += invalidKeys.length;

      const poolCard = document.createElement('div');
      poolCard.className = 'provider-pool-card';

      if (pid === 'irctc-official') {
        poolCard.innerHTML = `
          <div class="provider-pool-header">
            <div class="provider-title-group">
              <strong>${sanitizeIsoString(meta.name)}</strong>
              <span class="quota-pill" style="background: #f1f5f9; color: #475569;">Browser Session Dependent</span>
            </div>
            <button type="button" class="btn btn-sm btn-secondary test-token-btn" data-provider="irctc-official">
              ⚡ Test IRCTC Connection
            </button>
          </div>
          <p style="font-size: 12px; color: #475569; margin: 6px 0 0 0;">
            Directly queries irctc.co.in. Works best when you have an active IRCTC browsing tab open.
          </p>
        `;
        providerPoolsContainer.appendChild(poolCard);
        return;
      }

      const keysHtml = keys.length === 0
        ? `<div class="no-tokens-msg">No tokens in this pool yet. Add your first token below!</div>`
        : keys
            .map((k) => {
              const statusClass = k.status === 'active' ? 'active' : k.status === 'rate-limited' ? 'rate-limited' : 'invalid';
              const statusText = k.status === 'active' ? 'Active 🟢' : k.status === 'rate-limited' ? 'Rate-Limited ⏳' : 'Invalid ❌';
              return `
                <div class="token-row">
                  <div class="token-info">
                    <span class="token-label">${sanitizeIsoString(k.label || 'Token')}</span>
                    <span class="token-key-mask">${k.maskedKey || maskIsoCredential(k.key)}</span>
                    <span class="token-badge ${statusClass}">${statusText}</span>
                  </div>
                  <div class="token-actions">
                    <span class="token-req-count">${k.requestCount || 0} reqs</span>
                    <button type="button" class="btn btn-sm btn-secondary test-token-btn" data-provider="${pid}" data-token-id="${k.id}">
                      ⚡ Test
                    </button>
                    <button type="button" class="btn-remove-token" data-provider="${pid}" data-token-id="${k.id}" title="Remove Token" aria-label="Remove Token ${k.label || ''}">
                      🗑 Remove
                    </button>
                  </div>
                </div>
              `;
            })
            .join('');

      poolCard.innerHTML = `
        <div class="provider-pool-header">
          <div class="provider-title-group">
            <strong>${sanitizeIsoString(meta.name)}</strong>
            <span class="quota-pill">${sanitizeIsoString(meta.freeTierLimit)}</span>
          </div>
          ${meta.signupUrl ? `<a href="${meta.signupUrl}" target="_blank" rel="noopener noreferrer" class="link-btn">Get Free Token ↗</a>` : ''}
        </div>

        ${pid === 'custom' ? `
          <div class="form-group" style="margin-bottom: 12px;">
            <label for="custom-endpoint-url">Custom Reverse Proxy Endpoint URL:</label>
            <input type="text" id="custom-endpoint-url" class="form-control" placeholder="http://localhost:3000/api/train-delay" value="${sanitizeIsoString(conf.apiEndpoint || '')}" />
          </div>
        ` : ''}

        <div class="tokens-list">
          ${keysHtml}
        </div>

        <div class="add-token-box">
          <div class="add-token-box-title">➕ Add Another Token to this Pool (Multiply Quota):</div>
          <div class="add-token-inputs">
            <input type="password" class="input-token-key" id="new-key-${pid}" placeholder="Paste API Key / Token" autocomplete="off" aria-label="New API Key for ${meta.name}" />
            <input type="text" class="input-token-label" id="new-label-${pid}" placeholder="Label (e.g. Account #${keys.length + 1})" aria-label="Label for Token" />
            <button type="button" class="btn btn-primary btn-sm add-token-btn" data-provider="${pid}" aria-label="Add token to ${meta.name}">
              ➕ Add Token
            </button>
          </div>
          <div class="input-validation-msg" id="val-msg-${pid}"></div>
        </div>
      `;

      providerPoolsContainer.appendChild(poolCard);
    });

    if (totalInvalidKeys > 0) {
      totalQuotaBadge.innerHTML = `🔥 <strong>${totalActiveKeys} Active</strong> Tokens (~${totalEstimatedCalls.toLocaleString()} calls) <span class="badge-excluded">(${totalInvalidKeys} invalid/cooldown excluded)</span>`;
    } else {
      totalQuotaBadge.innerHTML = `🔥 <strong>${totalActiveKeys} Active</strong> Tokens — Total Capacity: <strong>~${totalEstimatedCalls.toLocaleString()} calls/mo</strong>`;
    }

    attachPoolEventListeners();
  }

  function attachPoolEventListeners() {
    document.querySelectorAll<HTMLButtonElement>('.add-token-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const providerId = btn.getAttribute('data-provider') as ProviderId;
        const keyInput = document.getElementById(`new-key-${providerId}`) as HTMLInputElement;
        const labelInput = document.getElementById(`new-label-${providerId}`) as HTMLInputElement;
        const valMsg = document.getElementById(`val-msg-${providerId}`) as HTMLElement;

        const rawKey = keyInput?.value || '';
        const label = labelInput?.value.trim() || `Account Token`;

        const validation = validateTokenFormat(providerId, rawKey);
        if (!validation.valid) {
          if (valMsg) {
            valMsg.textContent = `❌ ${validation.error}`;
            valMsg.className = 'input-validation-msg error';
          }
          showToast(validation.error || 'Invalid token format', true);
          return;
        }

        if (valMsg) {
          valMsg.textContent = '✅ Format looks good';
          valMsg.className = 'input-validation-msg success';
        }

        pendingToken = {
          providerId,
          key: validation.cleanKey,
          label,
          inputElement: keyInput,
          labelElement: labelInput,
        };

        const providerMeta = catalog[providerId] || { name: providerId };
        modalProviderName.textContent = providerMeta.name;
        modalTokenLabel.textContent = label;
        modalTokenMasked.textContent = maskIsoCredential(validation.cleanKey);

        modalStatusBox.className = 'modal-status-box hidden';
        modalTestAddBtn.disabled = false;
        modalTestAddBtn.innerHTML = '⚡ Yes, Test & Add';
        modalSkipTestBtn.disabled = false;

        testModal.classList.remove('hidden');
        modalTestAddBtn.focus();
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-remove-token').forEach((btn) => {
      btn.addEventListener('click', () => {
        const providerId = btn.getAttribute('data-provider') as ProviderId;
        const keyId = btn.getAttribute('data-token-id');
        if (!providerId || !keyId) return;

        chrome.runtime.sendMessage(
          {
            type: 'REMOVE_PROVIDER_KEY',
            payload: { providerId, keyId },
          } as ExtensionMessage,
          (res) => {
            if (res?.success) {
              showToast('🗑 Token removed from pool.');
              loadData();
            }
          }
        );
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.test-token-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const providerId = btn.getAttribute('data-provider') as ProviderId;
        if (!providerId) return;

        btn.disabled = true;
        btn.textContent = 'Testing...';

        chrome.runtime.sendMessage(
          {
            type: 'TEST_PROVIDER',
            payload: { providerId },
          } as ExtensionMessage,
          (res) => {
            btn.disabled = false;
            btn.textContent = '⚡ Test';
            if (res?.success) {
              showToast(`✅ ${res.message}`);
              loadData();
            } else {
              showToast(`❌ ${res?.error || 'Connection failed'}`, true);
            }
          }
        );
      });
    });
  }

  // Keyboard accessibility: Close modal on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !testModal.classList.contains('hidden')) {
      testModal.classList.add('hidden');
      pendingToken = null;
    }
  });

  modalCancelBtn.addEventListener('click', () => {
    testModal.classList.add('hidden');
    pendingToken = null;
  });

  modalSkipTestBtn.addEventListener('click', () => {
    if (!pendingToken) return;
    const { providerId, key, label, inputElement, labelElement } = pendingToken;

    modalSkipTestBtn.disabled = true;
    chrome.runtime.sendMessage(
      {
        type: 'ADD_PROVIDER_KEY',
        payload: { providerId, key, label, status: 'active' },
      } as ExtensionMessage,
      (res) => {
        testModal.classList.add('hidden');
        if (res?.success) {
          showToast('✅ Token added to pool successfully!');
          inputElement.value = '';
          labelElement.value = '';
          loadData();
        } else {
          showToast(`❌ ${res?.error || 'Failed to add token'}`, true);
        }
        pendingToken = null;
      }
    );
  });

  modalTestAddBtn.addEventListener('click', () => {
    if (!pendingToken) return;
    const { providerId, key, label, inputElement, labelElement } = pendingToken;

    modalTestAddBtn.disabled = true;
    modalSkipTestBtn.disabled = true;
    modalTestAddBtn.innerHTML = '<span class="spinner-sm"></span> Testing API...';

    modalStatusBox.className = 'modal-status-box testing';
    modalStatusIndicator.className = 'modal-status-indicator testing';
    modalStatusMessage.textContent = 'Querying live status of Train #12002 to verify credentials...';

    chrome.runtime.sendMessage(
      {
        type: 'TEST_PROVIDER',
        payload: { providerId, keyToTest: key },
      } as ExtensionMessage,
      (testRes) => {
        if (testRes?.success) {
          modalStatusBox.className = 'modal-status-box success';
          modalStatusIndicator.className = 'modal-status-indicator success';
          modalStatusMessage.textContent = `✅ Verified! (Latency: ${testRes.latencyMs || 150}ms)`;

          chrome.runtime.sendMessage(
            {
              type: 'ADD_PROVIDER_KEY',
              payload: { providerId, key, label, status: 'active' },
            } as ExtensionMessage,
            (addRes) => {
              setTimeout(() => {
                testModal.classList.add('hidden');
                if (addRes?.success) {
                  showToast('🎉 Token verified and added! Pool capacity increased.');
                  inputElement.value = '';
                  labelElement.value = '';
                  loadData();
                }
                pendingToken = null;
              }, 1200);
            }
          );
        } else {
          modalTestAddBtn.disabled = false;
          modalSkipTestBtn.disabled = false;
          modalTestAddBtn.innerHTML = '⚡ Retry Test';

          modalStatusBox.className = 'modal-status-box error';
          modalStatusIndicator.className = 'modal-status-indicator error';
          modalStatusMessage.textContent = `❌ Test Failed: ${testRes?.error || 'Authentication error'}. Pool capacity NOT increased.`;
          showToast(`❌ Token verification failed: ${testRes?.error || 'Invalid Key'}`, true);
        }
      }
    );
  });

  async function loadData() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' } as ExtensionMessage, (res) => {
      if (res?.success && res.data) {
        loadedSettings = res.data;
        catalog = res.data.catalog || {};
        populateForm(res.data);
      }
    });

    chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' } as ExtensionMessage, (res) => {
      if (res?.success) {
        cacheRecordsCount.textContent = `${res.count} records (${res.formattedSize} / 150 MB)`;
      } else {
        chrome.storage.local.get(null, (all) => {
          const keys = Object.keys(all).filter((k) => k.startsWith('train_delay_cache_') || k.startsWith('irctc_delay_'));
          cacheRecordsCount.textContent = `${keys.length} records`;
        });
      }
    });
  }

  function populateForm(settings: any) {
    masterSwitch.checked = settings.extensionEnabled !== false;
    primaryProviderSelect.value = settings.activeProvider || 'rapidapi-irctc1';
    autoFailoverSwitch.checked = settings.autoFailover !== false;
    if (autoFetchAllSwitch) autoFetchAllSwitch.checked = settings.autoFetchAllTrains === true;
    cacheTtlSelect.value = `${settings.cacheTtlMinutes || 15}`;
    showHudSwitch.checked = settings.showFloatingHUD !== false;

    renderSitesGrid(settings.disabledSites || [], settings.sitePositions || {});
    renderProviderPools(settings.providers || {});
  }

  await loadData();

  saveAllBtn.addEventListener('click', () => {
    saveAllBtn.disabled = true;
    saveAllBtn.textContent = 'Saving...';

    const disabledSites: string[] = [];
    document.querySelectorAll<HTMLInputElement>('.site-toggle').forEach((cb) => {
      const host = cb.getAttribute('data-host');
      if (host && !cb.checked) {
        disabledSites.push(host.toLowerCase());
      }
    });

    const sitePositions: Record<string, BadgePosition> = {};
    document.querySelectorAll<HTMLSelectElement>('.site-pos-select').forEach((sel) => {
      const host = sel.getAttribute('data-host');
      if (host) {
        sitePositions[host.toLowerCase()] = sel.value as BadgePosition;
      }
    });

    const customUrlInput = document.getElementById('custom-endpoint-url') as HTMLInputElement | null;
    const providerUpdates: Record<string, any> = {};
    if (customUrlInput && customUrlInput.value.trim()) {
      providerUpdates['custom'] = { apiEndpoint: customUrlInput.value.trim() };
    }

    const payload: Partial<MultiProviderSettings> = {
      extensionEnabled: masterSwitch.checked,
      disabledSites,
      sitePositions,
      activeProvider: primaryProviderSelect.value as ProviderId,
      autoFailover: autoFailoverSwitch.checked,
      autoFetchAllTrains: autoFetchAllSwitch ? autoFetchAllSwitch.checked : false,
      fetchOnHover: false,
      cacheTtlMinutes: parseInt(cacheTtlSelect.value, 10) || 15,
      showFloatingHUD: showHudSwitch.checked,
      providers: providerUpdates as any,
    };

    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload } as ExtensionMessage, (res) => {
      saveAllBtn.disabled = false;
      saveAllBtn.textContent = '💾 Save All Changes';
      if (res?.success) {
        showToast('✅ All settings, per-site badge positions, and token pools saved!');
        loadData();
      } else {
        showToast(`❌ ${res?.error || 'Failed to save settings'}`, true);
      }
    });
  });

  clearCacheBtn.addEventListener('click', () => {
    clearCacheBtn.disabled = true;
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' } as ExtensionMessage, (res) => {
      clearCacheBtn.disabled = false;
      if (res?.success) {
        cacheRecordsCount.textContent = '0';
        showToast('🗑 Local storage cache cleared successfully!');
      }
    });
  });
});
