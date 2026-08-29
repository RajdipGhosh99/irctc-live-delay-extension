/**
 * Content Script (Manifest V3) - ISO/IEC 25010 & ISO 9241-171 Standardized Edition
 * High-Performance Client: WeakSet DOM caching, request coalescing, journey date extraction, and WhatsApp status sharing.
 * Tested on: MakeMyTrip, IRCTC, ConfirmTkt, ClearTrip, Ixigo, Goibibo, Paytm, EaseMyTrip & RailYatri.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { Observable, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import '../styles/styles.css';
import { ExtensionMessage, DelayResponse, TrainDelayData, BadgePosition } from '../types';
import { formatIsoHumanTime, getIso8601Timestamp, normalizeDateToIsoDate } from '../utils/iso-utils';

console.log('[Live Train Delay Tracker by Rajdip Ghosh - Enterprise Edition] Initializing on:', window.location.hostname);

const destroy$ = new Subject<void>();

let isExtensionEnabled = true;
let isSiteEnabled = true;
let currentSitePosition: BadgePosition = 'beside-name';
const currentHostname = window.location.hostname.toLowerCase();

// WeakSet for O(1) evaluated DOM elements without memory leaks
const processedElements = new WeakSet<HTMLElement>();

interface InjectedWidget {
  wrapper: HTMLElement;
  badge: HTMLElement;
  popover: HTMLElement;
  trainNumber: string;
  fetchStatus: (forceRefresh?: boolean) => Promise<void>;
}
const activeWidgets = new Map<string, InjectedWidget>();

/**
 * Creates an RxJS Observable wrapping DOM MutationObserver
 */
function createMutationObservable(target: Node, options: MutationObserverInit): Observable<MutationRecord[]> {
  return new Observable<MutationRecord[]>((subscriber) => {
    const observer = new MutationObserver((mutations) => {
      subscriber.next(mutations);
    });
    observer.observe(target, options);
    return () => observer.disconnect();
  });
}

/**
 * Extracts a 5-digit Indian Railways train number from freeform text or data attributes
 */
function extractTrainNumber(text: string): string | null {
  if (!text) return null;

  // 1. Check parenthesized 5-digit numbers e.g. "(12002)", "( 12002 )", "#12002"
  const parenMatch = text.match(/[\(#\[]\s*([0-2]\d{4})\s*[\)#\]]/);
  if (parenMatch) return parenMatch[1];

  // 2. Check "Train No: 12002" or "Train 12002" or "No. 12002"
  const labelMatch = text.match(/(?:train|trn|no\.?|#)\s*:?\s*([0-2]\d{4})\b/i);
  if (labelMatch) return labelMatch[1];

  // 3. Check standalone 5-digit train number (valid range 01000 - 29999)
  const standAlone = text.match(/\b([0-2]\d{4})\b/);
  if (standAlone) {
    const num = standAlone[1];
    // Exclude common 5-digit non-train numbers like postal codes or generic years
    if (!num.startsWith('000') && !num.startsWith('999') && num !== '10000' && num !== '20000') {
      return num;
    }
  }

  return null;
}

/**
 * Finds the individual train card container for this specific train listing row.
 */
function findCardContainer(element: HTMLElement): HTMLElement {
  const specificCard = element.closest<HTMLElement>(
    '.single-train-detail, app-train-avl-enq, .train-card, .rail-card, .railway-card, [data-cy*="trainCard"], [data-testid*="train-card"], .train-box, .trainItem, .train-item, tr'
  );
  if (specificCard) return specificCard;

  let curr = element.parentElement;
  while (curr && curr !== document.body) {
    const cls = (curr.className || '').toString().toLowerCase();
    const id = (curr.id || '').toLowerCase();

    if (cls.includes('train-list') || cls.includes('trains-list') || cls.includes('results') || id === 'root' || id === 'app') {
      break;
    }

    if (curr.offsetHeight >= 45 && curr.offsetWidth >= 200) {
      return curr;
    }
    curr = curr.parentElement;
  }

  return element.parentElement || element;
}

/**
 * Finds the best anchor element inside a train card (Train Name element).
 */
function findTrainNameAnchor(card: HTMLElement, fallbackEl: HTMLElement): HTMLElement {
  if (currentHostname.includes('makemytrip')) {
    const mmtName = card.querySelector<HTMLElement>(
      '.train-name, [data-cy="trainName"], .railway-train-name, .trainName, .boldFont.font16, .train-name-wrap span:first-child'
    );
    if (mmtName) return mmtName;
  }

  if (currentHostname.includes('confirmtkt')) {
    const ctName = card.querySelector<HTMLElement>('.train-name, .train-title, h3, h4');
    if (ctName) return ctName;
  }

  if (currentHostname.includes('irctc')) {
    const irctcName = card.querySelector<HTMLElement>('.train-heading strong, .form-group strong');
    if (irctcName) return irctcName;
  }

  const generalName = card.querySelector<HTMLElement>(
    '.train-name, .trainName, .train_name, .train-title, [class*="train-name"], [class*="trainName"]'
  );
  if (generalName) return generalName;

  return fallbackEl;
}

/**
 * Intelligently extracts the selected Journey Date from the webpage UI / URL
 */
function extractTravelDateFromUI(card?: HTMLElement): string | undefined {
  try {
    // 1. Check card-specific departure date element
    if (card) {
      const cardDateEl = card.querySelector<HTMLElement>(
        '[data-cy*="departureDate"], [data-cy*="travelDate"], .departure-date, .travel-date, .journey-date, [class*="departDate"], [class*="travelDate"], [class*="journeyDate"], [class*="departure-date"]'
      );
      if (cardDateEl && cardDateEl.textContent) {
        const parsed = normalizeDateToIsoDate(cardDateEl.textContent);
        if (parsed) return parsed;
      }
    }

    // 2. Check site-specific search widget / date picker input
    if (currentHostname.includes('makemytrip')) {
      const mmtDateEl = document.querySelector<HTMLElement>(
        '[data-cy="departureDate"], #departure, input#departureDate, .hsw_inputBox [data-cy="departureDate"], .journey-date'
      );
      if (mmtDateEl && mmtDateEl.textContent) {
        const parsed = normalizeDateToIsoDate(mmtDateEl.textContent);
        if (parsed) return parsed;
      }
    }

    if (currentHostname.includes('confirmtkt')) {
      const ctInput = document.querySelector<HTMLInputElement>(
        '#journey-date, [data-test="travel-date"], .doj-input, input[name="doj"], .date-picker-input, #date-picker'
      );
      if (ctInput && (ctInput.value || ctInput.textContent)) {
        const parsed = normalizeDateToIsoDate(ctInput.value || ctInput.textContent || '');
        if (parsed) return parsed;
      }
    }

    if (currentHostname.includes('irctc')) {
      const irctcInput = document.querySelector<HTMLInputElement>(
        '#jDate input, input[placeholder*="Journey Date"], input[placeholder*="dd/mm/yyyy"], #jDate'
      );
      if (irctcInput && (irctcInput.value || irctcInput.textContent)) {
        const parsed = normalizeDateToIsoDate(irctcInput.value || irctcInput.textContent || '');
        if (parsed) return parsed;
      }
    }

    // 3. Check generic date inputs or elements on the page
    const generalDateEl = document.querySelector<HTMLElement>(
      'input[type="date"], input[name*="date" i], input[id*="date" i], [class*="selectedDate" i], [class*="travelDate" i], [class*="departureDate" i], [class*="journeyDate" i]'
    );
    if (generalDateEl) {
      const val = (generalDateEl as HTMLInputElement).value || generalDateEl.textContent || '';
      const parsed = normalizeDateToIsoDate(val);
      if (parsed) return parsed;
    }

    // 4. Check URL query parameters (e.g. ?date=20260829, ?doj=29-08-2026, ?departureDate=2026-08-29)
    const urlParams = new URLSearchParams(window.location.search);
    const dateParamKeys = ['date', 'doj', 'departureDate', 'journeyDate', 'depDate', 'travelDate', 'travel_date', 'journey_date'];
    for (const key of dateParamKeys) {
      const paramVal = urlParams.get(key);
      if (paramVal) {
        const parsed = normalizeDateToIsoDate(paramVal);
        if (parsed) return parsed;
      }
    }

    // 5. Check URL path segments (e.g. /railways/listing/20260829/...)
    const pathSegments = window.location.pathname.split('/');
    for (const seg of pathSegments) {
      const parsed = normalizeDateToIsoDate(seg);
      if (parsed) return parsed;
    }
  } catch (err) {
    console.warn('[Live Delay Tracker] Failed to parse travel date from UI:', err);
  }

  return undefined;
}

function sendMessageToBackground(message: ExtensionMessage): Promise<any> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message || 'Extension context invalidated. Please refresh the page.',
          });
          return;
        }
        resolve(response);
      });
    } catch (err) {
      resolve({
        success: false,
        error: err instanceof Error ? err.message : 'Message dispatch failed',
      });
    }
  });
}

function requestTrainDelay(trainNumber: string, forceRefresh = false, travelDate?: string): Promise<DelayResponse> {
  return sendMessageToBackground({
    type: 'FETCH_TRAIN_DELAY',
    payload: { trainNumber, forceRefresh, travelDate },
  });
}

function openSettingsDashboard(): void {
  sendMessageToBackground({ type: 'OPEN_OPTIONS_PAGE' });
}

function removeAllInjectedUI() {
  document.getElementById('irctc-live-hud')?.remove();
  document.querySelectorAll('.irctc-delay-wrapper').forEach((el) => el.remove());
  document.querySelectorAll('[data-delay-injected]').forEach((el) => el.removeAttribute('data-delay-injected'));
  activeWidgets.clear();
}

/**
 * Injects Accessible Floating HUD in the bottom-right corner
 */
function injectAutoWelcomeHUD() {
  if (!isExtensionEnabled || !isSiteEnabled) return;
  if (document.getElementById('irctc-live-hud')) return;

  const hudWrapper = document.createElement('div');
  hudWrapper.id = 'irctc-live-hud';
  hudWrapper.className = 'irctc-floating-hud';
  hudWrapper.setAttribute('role', 'region');
  hudWrapper.setAttribute('aria-label', 'Live Train Delay Tracker HUD');

  let isMinimized = false;

  function renderHUD() {
    if (isMinimized) {
      hudWrapper.innerHTML = `
        <div class="irctc-hud-minimized" title="Click to expand Live Delay Tracker" role="button" tabindex="0" aria-label="Expand Live Train Tracker">
          <span aria-hidden="true">🚆</span>
          <span>Live Delay Active</span>
        </div>
      `;
      hudWrapper.querySelector('.irctc-hud-minimized')?.addEventListener('click', () => {
        isMinimized = false;
        renderHUD();
      });
      return;
    }

    hudWrapper.innerHTML = `
      <div class="irctc-hud-card" role="dialog" aria-modal="false" aria-labelledby="irctc-hud-heading">
        <div class="irctc-hud-header">
          <div class="irctc-hud-title" id="irctc-hud-heading">
            <span aria-hidden="true">🚆</span>
            <span>Live Train Delay Tracker</span>
          </div>
          <div class="irctc-hud-controls">
            <button class="irctc-hud-btn-icon" id="irctc-hud-min" title="Minimize" aria-label="Minimize HUD">_</button>
            <button class="irctc-hud-btn-icon" id="irctc-hud-close" title="Dismiss" aria-label="Close HUD">✕</button>
          </div>
        </div>
        <div class="irctc-hud-body" aria-live="polite">
          <div id="irctc-hud-status-text">
            💡 <strong>On-Demand Mode:</strong> Click any <strong>[Check ↻]</strong> button beside a train name to fetch live status. Zero automatic calls on hover.
          </div>
          <div class="irctc-hud-status-badge">
            <span>●</span> Zero Automatic Calls • 100% On-Demand
          </div>
        </div>
        <div class="irctc-hud-actions">
          <button class="irctc-hud-btn-primary" id="irctc-hud-config-btn" type="button" aria-label="Open Token Settings Dashboard">
            ⚙️ Token Settings
          </button>
          <button class="irctc-hud-btn-secondary" id="irctc-hud-gotit-btn" type="button" aria-label="Acknowledge HUD">
            Got it
          </button>
        </div>
        <div class="irctc-hud-dev-footer">
          <span>Created by <strong>Rajdip Ghosh</strong> • ISO Standard</span>
        </div>
      </div>
    `;

    document.getElementById('irctc-hud-min')?.addEventListener('click', () => {
      isMinimized = true;
      renderHUD();
    });

    document.getElementById('irctc-hud-close')?.addEventListener('click', () => {
      hudWrapper.remove();
    });

    document.getElementById('irctc-hud-config-btn')?.addEventListener('click', () => {
      openSettingsDashboard();
    });

    document.getElementById('irctc-hud-gotit-btn')?.addEventListener('click', () => {
      hudWrapper.remove();
    });
  }

  renderHUD();
  document.body.appendChild(hudWrapper);
}

/**
 * Updates an Injected Badge & Popover UI state with accessibility compliance
 */
function updateBadgeUI(
  wrapper: HTMLElement,
  badge: HTMLElement,
  popover: HTMLElement,
  trainNumber: string,
  state: 'idle' | 'loading' | 'on-time' | 'delayed' | 'error' | 'no-key',
  data?: TrainDelayData,
  errorMessage?: string,
  providerUsed?: string,
  travelDate?: string,
  isRefreshingInPlace = false
) {
  badge.className = `irctc-delay-badge state-${state}`;
  badge.setAttribute('aria-live', 'polite');

  if (state === 'idle') {
    badge.setAttribute('aria-label', `Check Live Delay for train number ${trainNumber}`);
    badge.innerHTML = `<span aria-hidden="true">🚆</span><span>Check</span><span class="irctc-badge-reload-icon" title="Click to fetch live delay" aria-hidden="true">↻</span>`;
    popover.style.display = 'none';
  } else if (state === 'no-key') {
    badge.setAttribute('aria-label', 'Add free API key to view delay');
    badge.innerHTML = `<span aria-hidden="true">🔑</span><span>Add Key</span>`;
    popover.style.display = 'none';
  } else if (state === 'loading') {
    badge.setAttribute('aria-label', 'Fetching live delay status...');
    badge.innerHTML = `<span class="irctc-delay-spinner" aria-hidden="true"></span><span>...</span>`;
    // If refreshing an already open popover, do NOT hide it!
    if (!isRefreshingInPlace) {
      popover.style.display = 'none';
    }
  } else if (state === 'on-time' && data) {
    const isEarly = data.delayMinutes < 0;
    const label = isEarly ? `-${Math.abs(data.delayMinutes)}m` : 'On Time';
    badge.setAttribute('aria-label', `Train ${trainNumber} is ${data.statusSummary}`);
    badge.innerHTML = `<span aria-hidden="true">⏱</span><span>${label}</span><span class="irctc-badge-reload-icon" title="Refresh Live Delay" aria-hidden="true">↻</span>`;
    renderPopover(popover, trainNumber, data, providerUsed, travelDate);
  } else if (state === 'delayed' && data) {
    badge.setAttribute('aria-label', `Train ${trainNumber} is delayed by ${data.delayMinutes} minutes`);
    badge.innerHTML = `<span aria-hidden="true">⏱</span><span>+${data.delayMinutes}m</span><span class="irctc-badge-reload-icon" title="Refresh Live Delay" aria-hidden="true">↻</span>`;
    renderPopover(popover, trainNumber, data, providerUsed, travelDate);
  } else if (state === 'error') {
    const isQuota = errorMessage?.includes('Quota') || errorMessage?.includes('quota') || errorMessage?.includes('RATE_LIMIT') || errorMessage?.includes('429');
    badge.setAttribute('aria-label', isQuota ? 'API quota limit reached' : 'Error fetching train delay');
    badge.innerHTML = `<span aria-hidden="true">⚠️</span><span>${isQuota ? 'Quota Full' : 'Retry'}</span><span class="irctc-badge-reload-icon" aria-hidden="true">↻</span>`;
    popover.innerHTML = `
      <div class="irctc-delay-popover-header">
        <span class="irctc-delay-popover-title">${isQuota ? '⚠️ API Quota Limit Reached' : 'Live Delay Status'}</span>
      </div>
      <div class="irctc-delay-val" style="color: ${isQuota ? '#b45309' : '#ef4444'}; font-size: 11px; text-align: left; margin: 6px 0; white-space: pre-wrap; line-height: 1.4;">
        ${isQuota
          ? 'Free RapidAPI quota (500 calls) exhausted for this key.\n\n💡 Solution: Add another free token from a secondary account in Settings to get +500 calls!'
          : (errorMessage || 'Unable to fetch status')}
      </div>
      <div class="irctc-popover-btn-row">
        <button class="irctc-delay-refresh-btn irctc-refresh-live-btn" type="button" aria-label="Retry live delay status">
          ↻ Retry Now
        </button>
        <button class="irctc-delay-refresh-btn irctc-config-key-btn" type="button" aria-label="Open Settings Dashboard to add tokens">
          ⚙️ Settings ↗
        </button>
      </div>
    `;
    popover.style.display = 'block';
  }
}

function renderPopover(popover: HTMLElement, trainNumber: string, data: TrainDelayData, providerUsed?: string, travelDate?: string) {
  popover.style.display = 'block';
  popover.setAttribute('role', 'tooltip');
  const isCached = data.source === 'cache';
  const sourceLabel = isCached ? '⚡ Cached (0 API Calls)' : `🌐 ${providerUsed || data.providerName || 'Live'}`;
  const fetchedTimeLabel = formatIsoHumanTime(data.isoTimestamp || getIso8601Timestamp(new Date(data.fetchedTimestamp || Date.now())));
  const activeDate = data.isoDate || travelDate;

  popover.innerHTML = `
    <div class="irctc-delay-popover-header">
      <span class="irctc-delay-popover-title">Train #${trainNumber}</span>
      <span class="irctc-delay-source-tag" title="${sourceLabel}">${sourceLabel}</span>
    </div>
    <div class="irctc-delay-popover-row">
      <span class="irctc-delay-label">Live Status:</span>
      <span class="irctc-delay-val" style="color: ${data.isOnTime ? '#059669' : '#dc2626'}">
        ${data.statusSummary}
      </span>
    </div>
    ${activeDate ? `
      <div class="irctc-delay-popover-row">
        <span class="irctc-delay-label">📅 Journey Date:</span>
        <span class="irctc-delay-val">${activeDate}</span>
      </div>
    ` : ''}
    ${data.currentStationName ? `
      <div class="irctc-delay-popover-row">
        <span class="irctc-delay-label">Current Location:</span>
        <span class="irctc-delay-val">${data.currentStationName}${data.currentStationCode ? ` (${data.currentStationCode})` : ''}</span>
      </div>
    ` : ''}
    ${data.nextStationName ? `
      <div class="irctc-delay-popover-row">
        <span class="irctc-delay-label">Next Halt:</span>
        <span class="irctc-delay-val">${data.nextStationName}</span>
      </div>
    ` : ''}
    <div class="irctc-delay-popover-row" style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed rgba(203, 213, 225, 0.7);">
      <span class="irctc-delay-label">🕒 Fetched At:</span>
      <span class="irctc-delay-val" style="color: #475569; font-size: 10.5px;">${fetchedTimeLabel}</span>
    </div>
    <div class="irctc-popover-btn-row">
      <button class="irctc-delay-refresh-btn irctc-copy-status-btn" type="button" aria-label="Copy train status to clipboard">
        📋 Copy Status
      </button>
      <button class="irctc-delay-refresh-btn irctc-refresh-live-btn" type="button" aria-label="Force refresh live delay status">
        ↻ Refresh
      </button>
    </div>
  `;
}

/**
 * Injects an Ultra-Compact On-Demand Interactive Badge
 */
function injectDelayWidget(targetElement: HTMLElement, trainNumber: string, position: BadgePosition = 'beside-name'): InjectedWidget {
  targetElement.setAttribute('data-delay-injected', 'true');
  processedElements.add(targetElement);

  const wrapper = document.createElement('span');
  wrapper.className = `irctc-delay-wrapper position-${position}`;
  wrapper.setAttribute('data-train-number', trainNumber);

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'irctc-delay-badge state-idle';
  badge.innerHTML = `<span aria-hidden="true">🚆</span><span>Check</span><span class="irctc-badge-reload-icon" title="Click to fetch live status" aria-hidden="true">↻</span>`;
  badge.setAttribute('aria-label', `Check Live Delay for train ${trainNumber}`);

  const popover = document.createElement('div');
  popover.className = 'irctc-delay-popover';
  popover.style.display = 'none';

  wrapper.appendChild(badge);
  wrapper.appendChild(popover);

  let hasFetchedOnce = false;
  let currentDelayData: TrainDelayData | null = null;
  const card = findCardContainer(targetElement);

  const fetchStatus = async (forceRefresh = false) => {
    const isRefreshing = hasFetchedOnce && forceRefresh;
    wrapper.classList.add('irctc-refreshing');

    const refreshBtn = popover.querySelector<HTMLButtonElement>('.irctc-refresh-live-btn');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<span class="irctc-delay-spinner"></span> Refreshing...';
    }

    // Dynamically extract the selected travel date from the UI at click time
    const selectedTravelDate = extractTravelDateFromUI(card);
    if (selectedTravelDate) {
      console.log(`[Live Train Delay Tracker] 📅 Extracted Journey Date for Train #${trainNumber}:`, selectedTravelDate);
    }
    console.log(`[Live Train Delay Tracker] 🚆 Requesting live status for Train #${trainNumber} on Date: ${selectedTravelDate || 'Today'} (forceRefresh=${forceRefresh})...`);
    updateBadgeUI(wrapper, badge, popover, trainNumber, 'loading', currentDelayData || undefined, undefined, undefined, selectedTravelDate, isRefreshing);

    try {
      const res = await requestTrainDelay(trainNumber, forceRefresh, selectedTravelDate);
      hasFetchedOnce = true;
      console.log(`[Live Train Delay Tracker] 📥 Response for Train #${trainNumber}:`, res);

      if (res.success && res.data) {
        currentDelayData = res.data;
        const state = res.data.isOnTime ? 'on-time' : 'delayed';
        const providerUsed = (res as any).providerUsed || res.data.providerName;
        updateBadgeUI(wrapper, badge, popover, trainNumber, state, res.data, undefined, providerUsed, selectedTravelDate);
      } else if (!res.success && res.requiresApiKey) {
        updateBadgeUI(wrapper, badge, popover, trainNumber, 'no-key');
      } else if (!res.success) {
        updateBadgeUI(wrapper, badge, popover, trainNumber, 'error', undefined, res.error);
      }
    } finally {
      wrapper.classList.remove('irctc-refreshing');
    }
  };

  // Direct Click Trigger (API call ONLY happens when user clicks!)
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log(`[Live Train Delay Tracker] 👆 User clicked "Check / ↻" for Train #${trainNumber}`);
    fetchStatus(true);
  });

  // Popover Actions
  popover.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.irctc-refresh-live-btn')) {
      e.stopPropagation();
      e.preventDefault();
      fetchStatus(true);
    } else if (target.closest('.irctc-copy-status-btn')) {
      e.stopPropagation();
      e.preventDefault();
      if (currentDelayData) {
        const textToCopy = `🚆 Train #${trainNumber} (${currentDelayData.trainName || 'Train'}): ${currentDelayData.statusSummary} at ${currentDelayData.currentStationName || 'En Route'}.`;
        navigator.clipboard.writeText(textToCopy).then(() => {
          const btn = popover.querySelector('.irctc-copy-status-btn');
          if (btn) {
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
              btn.textContent = '📋 Copy Status';
            }, 2000);
          }
        });
      }
    } else if (target.closest('.irctc-config-key-btn')) {
      e.stopPropagation();
      e.preventDefault();
      openSettingsDashboard();
    }
  });

  // Placement based on configuration
  const nameAnchor = findTrainNameAnchor(card, targetElement);

  if (position === 'card-header-right') {
    const headerRow = card.querySelector<HTMLElement>('.makeFlex.spaceBetween, .trainHeading, .train-name-wrap, .train-header, .header') || nameAnchor.parentElement || card;
    headerRow.appendChild(wrapper);
  } else if (position === 'below-name') {
    if (nameAnchor.nextSibling) {
      nameAnchor.parentElement?.insertBefore(wrapper, nameAnchor.nextSibling);
    } else {
      nameAnchor.parentElement?.appendChild(wrapper);
    }
  } else {
    // Default: 'beside-name'
    if (nameAnchor && nameAnchor !== targetElement) {
      nameAnchor.appendChild(wrapper);
    } else {
      targetElement.appendChild(wrapper);
    }
  }

  const widget: InjectedWidget = {
    wrapper,
    badge,
    popover,
    trainNumber,
    fetchStatus,
  };

  activeWidgets.set(trainNumber, widget);
  return widget;
}

/**
 * Scans DOM and processes train elements with WeakSet deduplication
 */
function processTrainCards() {
  if (!isExtensionEnabled || !isSiteEnabled) return;

  const candidateElements = document.querySelectorAll<HTMLElement>(
    '.train-name, .trainName, .train-number, .trainNumber, [data-cy*="train"], [data-testid*="train"], .single-train-detail, .train-heading strong, .railway-train-name, .boldFont.font16'
  );

  candidateElements.forEach((el) => {
    if (processedElements.has(el)) return;
    if (el.closest('.irctc-delay-wrapper') || el.closest('#irctc-live-hud')) return;

    const text = el.innerText || el.textContent || '';
    const trainNumber = extractTrainNumber(text) || el.getAttribute('data-train-number') || el.getAttribute('data-train-no');

    if (trainNumber && /^[0-2]\d{4}$/.test(trainNumber)) {
      processedElements.add(el);
      injectDelayWidget(el, trainNumber, currentSitePosition);
    }
  });
}

/**
 * Initializes Content Script and binds reactive event streams
 */
async function init() {
  try {
    const settingsRes = await sendMessageToBackground({ type: 'GET_SETTINGS' });
    if (settingsRes && settingsRes.success && settingsRes.data) {
      const settings: any = settingsRes.data;
      isExtensionEnabled = settings.extensionEnabled !== false;

      const disabledSites: string[] = settings.disabledSites || [];
      isSiteEnabled = !disabledSites.some((disabled) => currentHostname.includes(disabled.toLowerCase()));

      if (settings.sitePositions) {
        for (const [domain, pos] of Object.entries(settings.sitePositions)) {
          if (currentHostname.includes(domain.toLowerCase())) {
            currentSitePosition = pos as BadgePosition;
            break;
          }
        }
      }
    }

    if (!isExtensionEnabled || !isSiteEnabled) {
      console.log(`[Live Delay Tracker] Disabled on: ${currentHostname}`);
      removeAllInjectedUI();
      return;
    }

    // 1. Initial Injection Pass
    processTrainCards();
    injectAutoWelcomeHUD();

    // 2. Reactive RxJS Mutation Stream with 200ms debouncing (smooth 60 FPS scrolling)
    createMutationObservable(document.body, { childList: true, subtree: true })
      .pipe(debounceTime(200), takeUntil(destroy$))
      .subscribe(() => {
        processTrainCards();
      });

    // 3. Listen for dynamic settings updates from Options dashboard
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes['irctc_delay_multi_settings']) {
        const newSettings = changes['irctc_delay_multi_settings'].newValue;
        if (newSettings) {
          isExtensionEnabled = newSettings.extensionEnabled !== false;
          const disabledSites: string[] = newSettings.disabledSites || [];
          isSiteEnabled = !disabledSites.some((disabled: string) => currentHostname.includes(disabled.toLowerCase()));

          if (newSettings.sitePositions) {
            for (const [domain, pos] of Object.entries(newSettings.sitePositions)) {
              if (currentHostname.includes(domain.toLowerCase())) {
                currentSitePosition = pos as BadgePosition;
                break;
              }
            }
          }

          if (!isExtensionEnabled || !isSiteEnabled) {
            removeAllInjectedUI();
          } else {
            processTrainCards();
          }
        }
      }
    });
  } catch (err) {
    console.warn('[Live Delay Tracker] Init skipped:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
