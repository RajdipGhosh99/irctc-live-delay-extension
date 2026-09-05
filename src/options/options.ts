/**
 * Options Dashboard Script for Live Train Delay Tracker
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { PROVIDER_METADATA_MAP } from '../core/constants';
import { getCacheStorageInfo, loadSettings, saveSettings } from '../core/storage';
import { ApiKeyItem, BadgePosition, MultiProviderSettings, ProviderId } from '../core/types';
import { maskIsoCredential, sanitizeHtml } from '../core/utils';

const SUPPORTED_SITES = [
  { name: 'ConfirmTkt', host: 'confirmtkt.com', note: 'Clean train card header' },
  { name: 'MakeMyTrip', host: 'makemytrip.com', note: 'Ample horizontal room beside train name' },
  { name: 'IRCTC', host: 'irctc.co.in', note: 'Public booking portal' },
  { name: 'ClearTrip', host: 'cleartrip.com', note: 'Train listing row' },
  { name: 'Ixigo Trains', host: 'ixigo.com', note: 'Train search card' },
  { name: 'Goibibo Trains', host: 'goibibo.com', note: 'Train listing' },
  { name: 'Paytm Trains', host: 'paytm.com', note: 'Paytm rail card' },
  { name: 'EaseMyTrip', host: 'easemytrip.com', note: 'Train booking listing' },
  { name: 'RailYatri', host: 'railyatri.in', note: 'RailYatri search results' },
];

document.addEventListener('DOMContentLoaded', async () => {
  const masterEnableSwitch = document.getElementById('master-enable-switch') as HTMLInputElement;
  const floatingHudSwitch = document.getElementById('floating-hud-switch') as HTMLInputElement;
  const sitesContainer = document.getElementById('sites-container') as HTMLElement;
  const primaryProviderSelect = document.getElementById('primary-provider-select') as HTMLSelectElement;
  const autoFailoverSwitch = document.getElementById('auto-failover-switch') as HTMLInputElement;
  const autoFetchAllSwitch = document.getElementById('auto-fetch-all-switch') as HTMLInputElement;
  const cacheTtlSelect = document.getElementById('cache-ttl-select') as HTMLSelectElement;
  const totalQuotaBadge = document.getElementById('total-quota-badge') as HTMLElement;
  const providerPoolsContainer = document.getElementById('provider-pools-container') as HTMLElement;
  const clearAllCacheBtn = document.getElementById('clear-all-cache-btn') as HTMLButtonElement;
  const saveBanner = document.getElementById('save-banner') as HTMLElement;
  const saveBannerText = document.getElementById('save-banner-text') as HTMLElement;
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle') as HTMLButtonElement;
  const optionsSidebar = document.getElementById('options-sidebar') as HTMLElement;
  const storageUsedText = document.getElementById('storage-used-text') as HTMLElement;
  const storageBarFill = document.getElementById('storage-bar-fill') as HTMLElement;
  const termsStatusText = document.getElementById('terms-status-text') as HTMLElement;
  const reacceptTermsBtn = document.getElementById('reaccept-terms-btn') as HTMLButtonElement;
  const dashboardGlobalStatus = document.getElementById('dashboard-global-status') as HTMLElement;

  let currentSettings: MultiProviderSettings = await loadSettings();

  function showSaveBanner(msg = 'Settings saved successfully') {
    if (!saveBanner) return;
    if (saveBannerText) {
      saveBannerText.textContent = msg;
    } else {
      saveBanner.textContent = msg;
    }
    saveBanner.classList.add('visible');
    setTimeout(() => {
      saveBanner.classList.remove('visible');
    }, 2400);
  }

  async function updateStorageMeter() {
    const info = await getCacheStorageInfo(currentSettings.maxCacheSizeMb ?? 50);
    const maxMb = Math.min(50, Math.round(info.maxBytes / (1024 * 1024)));
    const usedMb = (info.bytes / (1024 * 1024)).toFixed(2);
    const percent = Math.min(100, Math.max(0, (info.bytes / info.maxBytes) * 100));

    if (storageUsedText) {
      storageUsedText.textContent = `${usedMb} MB / ${maxMb} MB`;
    }
    if (storageBarFill) {
      storageBarFill.style.width = `${Math.max(2, percent)}%`;
      if (percent > 85) {
        storageBarFill.style.background = '#ef4444';
      } else if (percent > 60) {
        storageBarFill.style.background = '#f59e0b';
      } else {
        storageBarFill.style.background = '#2563eb';
      }
    }
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

  function renderUI() {
    const isGloballyActive = currentSettings.extensionEnabled !== false;
    masterEnableSwitch.checked = isGloballyActive;
    floatingHudSwitch.checked = currentSettings.showFloatingHUD !== false;
    primaryProviderSelect.value = currentSettings.activeProvider || 'direct-rail-gateway';
    autoFailoverSwitch.checked = currentSettings.autoFailover !== false;
    autoFetchAllSwitch.checked = Boolean(currentSettings.autoFetchAllTrains);
    cacheTtlSelect.value = String(currentSettings.cacheTtlMinutes ?? 0);

    if (dashboardGlobalStatus) {
      if (isGloballyActive) {
        dashboardGlobalStatus.innerHTML = '<span class="pulse-dot"></span> Live Monitoring Active';
        dashboardGlobalStatus.className = 'global-status-pill';
      } else {
        dashboardGlobalStatus.innerHTML = '<span class="pulse-dot" style="background:#dc2626;"></span> Monitoring Paused';
        dashboardGlobalStatus.className = 'global-status-pill';
        dashboardGlobalStatus.style.background = '#fee2e2';
        dashboardGlobalStatus.style.color = '#dc2626';
        dashboardGlobalStatus.style.borderColor = '#fca5a5';
      }
    }

    // Terms Status
    if (termsStatusText) {
      if (currentSettings.termsAccepted) {
        const dateStr = currentSettings.termsAcceptedAt
          ? new Date(currentSettings.termsAcceptedAt).toLocaleDateString()
          : 'Active';
        termsStatusText.textContent = `✓ Verified & Accepted for Personal Fair Use (${dateStr})`;
        termsStatusText.style.color = '#15803d';
        if (reacceptTermsBtn) {
          reacceptTermsBtn.style.display = 'none';
        }
      } else {
        termsStatusText.textContent = '⚠️ Pending Acceptance (Accept terms to enable tracking)';
        termsStatusText.style.color = '#dc2626';
        if (reacceptTermsBtn) {
          reacceptTermsBtn.style.display = 'inline-block';
        }
      }
    }

    renderSitesGrid();
    renderProviderPools();
    updateStorageMeter();
  }

  reacceptTermsBtn?.addEventListener('click', () => {
    currentSettings.termsAccepted = true;
    currentSettings.termsAcceptedAt = new Date().toISOString();
    saveSettings(currentSettings);
    showSaveBanner('✓ Terms accepted for Personal Fair Use');
    renderUI();
  });

  function renderSitesGrid() {
    if (!sitesContainer) return;
    sitesContainer.innerHTML = '';

    const disabledSet = new Set((currentSettings.disabledSites || []).map((s) => s.toLowerCase()));
    const positions = currentSettings.sitePositions || {};

    SUPPORTED_SITES.forEach((site) => {
      const isEnabled = !disabledSet.has(site.host.toLowerCase());
      const currentPos = positions[site.host.toLowerCase()] || 'beside-name';

      const card = document.createElement('div');
      card.className = 'site-config-card';
      card.innerHTML = `
        <div class="site-card-top">
          <div class="site-name-group">
            <strong>${sanitizeHtml(site.name)}</strong>
            <span class="site-host-sub">${sanitizeHtml(site.host)}</span>
          </div>
          <label class="modern-switch" title="Toggle ${site.name}">
            <input type="checkbox" class="site-toggle" data-host="${site.host}" ${isEnabled ? 'checked' : ''} aria-label="Toggle ${site.name}" />
            <span class="switch-slider"></span>
          </label>
        </div>

        <div class="site-position-row">
          <label for="pos-${site.host}">Badge Position:</label>
          <select id="pos-${site.host}" class="site-pos-select" data-host="${site.host}">
            <option value="beside-name" ${currentPos === 'beside-name' ? 'selected' : ''}>📍 Beside Train Name (Inline Right)</option>
            <option value="card-header-right" ${currentPos === 'card-header-right' ? 'selected' : ''}>↗ Top-Right of Card</option>
            <option value="below-name" ${currentPos === 'below-name' ? 'selected' : ''}>⬇ Below Train Name</option>
          </select>
        </div>
      `;
      sitesContainer.appendChild(card);
    });

    sitesContainer.querySelectorAll<HTMLInputElement>('.site-toggle').forEach((toggle) => {
      toggle.addEventListener('change', () => {
        const host = toggle.getAttribute('data-host') || '';
        const enabled = toggle.checked;
        currentSettings.disabledSites = currentSettings.disabledSites || [];
        const idx = currentSettings.disabledSites.indexOf(host);

        if (enabled && idx >= 0) {
          currentSettings.disabledSites.splice(idx, 1);
        } else if (!enabled && idx < 0) {
          currentSettings.disabledSites.push(host);
        }

        saveSettings(currentSettings);
        showSaveBanner(`Portal "${host}" ${enabled ? 'Enabled' : 'Disabled'}`);
      });
    });

    sitesContainer.querySelectorAll<HTMLSelectElement>('.site-pos-select').forEach((select) => {
      select.addEventListener('change', () => {
        const host = select.getAttribute('data-host') || '';
        currentSettings.sitePositions = currentSettings.sitePositions || {};
        currentSettings.sitePositions[host] = select.value as BadgePosition;
        saveSettings(currentSettings);
        showSaveBanner(`Placement for ${host} updated`);
      });
    });
  }

  function renderProviderPools() {
    if (!providerPoolsContainer) return;
    providerPoolsContainer.innerHTML = '';

    const providerOrder: ProviderId[] = [
      'direct-rail-gateway',
      'rapidapi-rail-v1',
      'rapidapi-rail-v2',
      'indianrailapi',
      'custom-webhook',
    ];

    let totalTokens = 0;

    providerOrder.forEach((pid) => {
      const meta = PROVIDER_METADATA_MAP[pid];
      const conf = currentSettings.providers[pid] || { enabled: true, keys: [] };
      const keys = conf.keys || [];
      totalTokens += keys.filter((k) => k.status === 'active').length;

      const card = document.createElement('div');
      card.className = 'provider-pool-card';

      if (!meta.requiresKey) {
        card.innerHTML = `
          <div class="provider-pool-header">
            <div class="provider-title-group">
              <strong>${sanitizeHtml(meta.name)}</strong>
              <span class="quota-pill" style="background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0;">100% Free & Unlimited (Zero Setup)</span>
            </div>
            <span style="font-size: 11.5px; color: #16a34a; font-weight: 700;">● Active Default</span>
          </div>
          <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0; line-height: 1.45;">
            ${sanitizeHtml(meta.description)}
          </p>
        `;
        providerPoolsContainer.appendChild(card);
        return;
      }

      const keysHtml = keys.length === 0
        ? `<div class="no-tokens-msg" style="font-size: 12px; color: #64748b; padding: 6px 0;">No keys added yet. Add a token below to enable redundant failover for this gateway.</div>`
        : keys.map((k) => `
          <div class="token-row" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 12px; font-weight: 700; color: #0f172a;">${sanitizeHtml(k.label || 'Token')}</span>
              <code style="font-size: 11px; color: #334155; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${maskIsoCredential(k.key)}</code>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; background: ${k.status === 'active' ? '#dcfce7; color: #166534;' : '#fee2e2; color: #991b1b;'}">${k.status}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="btn-copy-token" data-key="${k.key}" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; color: #334155;" title="Copy key">📋 Copy</button>
              <button type="button" class="btn-test-token" data-provider="${pid}" data-key="${k.key}" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer; color: #1e40af;" title="Test live key validity">⚡ Test Key</button>
              <button type="button" class="btn-remove-token" data-provider="${pid}" data-token-id="${k.id}" style="background: transparent; border: none; color: #dc2626; cursor: pointer; font-size: 13px; padding: 2px 6px;" title="Delete token">🗑</button>
            </div>
          </div>
        `).join('');

      card.innerHTML = `
        <div class="provider-pool-header">
          <div class="provider-title-group">
            <strong>${sanitizeHtml(meta.name)}</strong>
            <span class="quota-pill" style="font-size: 10.5px; background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 9999px; border: 1px solid #bfdbfe;">${meta.freeTierLimit}</span>
          </div>
        </div>
        <p style="font-size: 12px; color: #475569; margin: 4px 0 10px 0; line-height: 1.45;">${sanitizeHtml(meta.description)}</p>

        <div class="token-list" id="tokens-${pid}">
          ${keysHtml}
        </div>

        <div class="add-token-form" style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
          <input type="text" id="label-input-${pid}" placeholder="Token Label (e.g. Backup Key)" style="flex: 1; min-width: 140px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px;" />
          <input type="password" id="key-input-${pid}" placeholder="Paste API Key / Token" style="flex: 2; min-width: 200px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px;" />
          <button type="button" class="btn-add-token" data-provider="${pid}" style="background: #2563eb; color: #fff; border: none; border-radius: 6px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
            + Add Key
          </button>
        </div>
      `;

      providerPoolsContainer.appendChild(card);
    });

    if (totalQuotaBadge) {
      totalQuotaBadge.textContent = `⚡ Total Pool: ${totalTokens} Active Tokens`;
    }

    // Attach copy token listeners
    providerPoolsContainer.querySelectorAll<HTMLButtonElement>('.btn-copy-token').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key') || '';
        navigator.clipboard.writeText(key).then(() => {
          btn.textContent = '✓ Copied';
          setTimeout(() => {
            btn.textContent = '📋 Copy';
          }, 1500);
        });
      });
    });

    // Attach test token listeners
    providerPoolsContainer.querySelectorAll<HTMLButtonElement>('.btn-test-token').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-provider') as ProviderId;
        const key = btn.getAttribute('data-key') || '';
        btn.textContent = 'Testing...';
        btn.disabled = true;

        chrome.runtime.sendMessage(
          { type: 'TEST_KEY', providerId: pid, apiKey: key },
          (res) => {
            btn.disabled = false;
            if (res?.success && res.data) {
              btn.textContent = '✓ Valid Key';
              btn.style.color = '#15803d';
              btn.style.background = '#dcfce7';
              showSaveBanner(`Key test passed for ${PROVIDER_METADATA_MAP[pid]?.name || pid}`);
            } else {
              btn.textContent = '❌ Test Failed';
              btn.style.color = '#b91c1c';
              btn.style.background = '#fee2e2';
            }
            setTimeout(() => {
              btn.textContent = '⚡ Test Key';
              btn.style.color = '';
              btn.style.background = '';
            }, 3000);
          }
        );
      });
    });

    // Attach token add listeners
    providerPoolsContainer.querySelectorAll<HTMLButtonElement>('.btn-add-token').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-provider') as ProviderId;
        const keyInput = document.getElementById(`key-input-${pid}`) as HTMLInputElement;
        const labelInput = document.getElementById(`label-input-${pid}`) as HTMLInputElement;

        const rawKey = keyInput?.value?.trim();
        const label = labelInput?.value?.trim() || `Key ${(currentSettings.providers[pid]?.keys?.length || 0) + 1}`;

        if (!rawKey) return;

        const newItem: ApiKeyItem = {
          id: `token-${Date.now()}`,
          key: rawKey,
          label,
          status: 'active',
          requestCount: 0,
        };

        currentSettings.providers[pid] = currentSettings.providers[pid] || { enabled: true, keys: [] };
        currentSettings.providers[pid].keys = currentSettings.providers[pid].keys || [];
        currentSettings.providers[pid].keys.push(newItem);

        keyInput.value = '';
        if (labelInput) labelInput.value = '';

        saveSettings(currentSettings);
        showSaveBanner(`Token added to ${PROVIDER_METADATA_MAP[pid]?.name || pid}`);
        renderProviderPools();
      });
    });

    // Attach token delete listeners
    providerPoolsContainer.querySelectorAll<HTMLButtonElement>('.btn-remove-token').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-provider') as ProviderId;
        const tokenId = btn.getAttribute('data-token-id');
        if (!pid || !tokenId) return;

        const keys = currentSettings.providers[pid]?.keys || [];
        currentSettings.providers[pid].keys = keys.filter((k) => k.id !== tokenId);

        saveSettings(currentSettings);
        showSaveBanner('Token removed');
        renderProviderPools();
      });
    });
  }

  // Master Switch Change
  masterEnableSwitch.addEventListener('change', () => {
    currentSettings.extensionEnabled = masterEnableSwitch.checked;
    saveSettings(currentSettings);
    showSaveBanner(`Extension ${masterEnableSwitch.checked ? 'Enabled Globally' : 'Paused'}`);
    renderUI();
  });

  // Floating HUD Switch Change
  floatingHudSwitch.addEventListener('change', () => {
    currentSettings.showFloatingHUD = floatingHudSwitch.checked;
    saveSettings(currentSettings);
    showSaveBanner(`Floating HUD ${floatingHudSwitch.checked ? 'Enabled' : 'Disabled'}`);
  });

  // Primary Provider Select Change
  primaryProviderSelect.addEventListener('change', () => {
    currentSettings.activeProvider = primaryProviderSelect.value as ProviderId;
    saveSettings(currentSettings);
    showSaveBanner(`Primary provider set to: ${PROVIDER_METADATA_MAP[currentSettings.activeProvider]?.name || currentSettings.activeProvider}`);
  });

  // Auto-Failover Switch Change
  autoFailoverSwitch.addEventListener('change', () => {
    currentSettings.autoFailover = autoFailoverSwitch.checked;
    saveSettings(currentSettings);
    showSaveBanner('Failover setting saved');
  });

  // Auto-Fetch All Switch Change
  autoFetchAllSwitch.addEventListener('change', () => {
    currentSettings.autoFetchAllTrains = autoFetchAllSwitch.checked;
    saveSettings(currentSettings);
    showSaveBanner('Auto-fetch setting saved');
  });

  // Cache TTL Change
  cacheTtlSelect.addEventListener('change', () => {
    currentSettings.cacheTtlMinutes = parseInt(cacheTtlSelect.value, 10) || 0;
    saveSettings(currentSettings);
    showSaveBanner(
      currentSettings.cacheTtlMinutes === 0
        ? 'Cache retention set to No Cache (Live Fetch Only)'
        : `Cache retention set to ${currentSettings.cacheTtlMinutes} minutes`
    );
    updateStorageMeter();
  });

  // Clear All Cache
  clearAllCacheBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, () => {
      showSaveBanner('✓ All cached train delays cleared from memory');
      updateStorageMeter();
    });
  });

  renderUI();
});

