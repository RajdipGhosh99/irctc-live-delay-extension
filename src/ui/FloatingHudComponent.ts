/**
 * Viewport-Pinned Floating Action Controller HUD
 * Resilient DOM lifecycle, rich floating launcher pill, and multi-portal restore capability.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import {
  checkIcon,
  minusIcon,
  settingsIcon,
  shieldCheckIcon,
  trainIcon,
  xIcon,
  zapIcon,
} from './icons';

export class FloatingHudComponent {
  private static hudElement: HTMLElement | null = null;
  private static minimizedElement: HTMLElement | null = null;
  private static isMinimized = false;
  private static isDismissed = false;
  private static vendorClass = '';
  private static onFetchAllCallback: (() => void) | null = null;
  private static onOpenSettingsCallback: (() => void) | null = null;
  private static termsAccepted = true;
  private static detectedCount = 0;
  private static fetchedCount = 0;

  public static mount(
    vendorClass: string,
    onFetchAll: () => void,
    onOpenSettings: () => void,
    termsAccepted = true
  ): void {
    this.vendorClass = vendorClass;
    this.onFetchAllCallback = onFetchAll;
    this.onOpenSettingsCallback = onOpenSettings;
    this.termsAccepted = termsAccepted;

    // If already mounted and in DOM, just update visibility and return
    const host = document.body || document.documentElement;
    if (!host) return;

    if (this.hudElement && host.contains(this.hudElement) && this.minimizedElement && host.contains(this.minimizedElement)) {
      this.applyVisibility();
      return;
    }

    // Clean up any stale orphaned elements with these IDs
    document.getElementById('rail-live-hud')?.remove();
    document.getElementById('rail-hud-minimized')?.remove();

    const manifestVersion =
      typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version
        ? `v${chrome.runtime.getManifest().version}`
        : 'v2.0.1';

    // 1. Minimized Floating Launcher Pill
    const minBubble = document.createElement('div');
    minBubble.id = 'rail-hud-minimized';
    minBubble.className = `rail-floating-hud-minimized ${vendorClass}`;
    minBubble.title = `Live Train Delay Tracker ${manifestVersion} — Click to expand (or press Alt+H)`;
    minBubble.setAttribute('role', 'button');
    minBubble.setAttribute('tabindex', '0');
    minBubble.innerHTML = `
      <span class="rail-hud-min-icon">${trainIcon({ size: 16 })}</span>
      <span class="rail-hud-min-label">Live Tracker</span>
      <span class="rail-hud-min-badge" id="rail-hud-min-badge">${this.detectedCount > 0 ? `${this.detectedCount} Trains` : 'Live'}</span>
    `;

    minBubble.addEventListener('click', () => this.expand());
    minBubble.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.expand();
      }
    });
    this.minimizedElement = minBubble;
    host.appendChild(minBubble);

    // 2. Main HUD Card
    const hud = document.createElement('div');
    hud.id = 'rail-live-hud';
    hud.className = `rail-floating-hud ${vendorClass}`;
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Live Train Delay Controller');

    hud.innerHTML = `
      <div class="rail-hud-header">
        <div class="rail-hud-title">
          <span class="rail-hud-icon">${trainIcon({ size: 14 })}</span>
          <strong class="rail-hud-brand-name">Train Delay Tracker</strong>
          <span class="rail-hud-version-badge" id="rail-hud-version-badge">${manifestVersion}</span>
        </div>
        <div class="rail-hud-controls">
          <button type="button" class="rail-hud-btn-mini" id="rail-hud-minimize-btn" title="Minimize to launcher pill">
            ${minusIcon({ size: 12 })}
          </button>
          <button type="button" class="rail-hud-btn-close" id="rail-hud-close-btn" title="Dismiss HUD (Restore anytime via extension popup or Alt+H)">
            ${xIcon({ size: 12 })}
          </button>
        </div>
      </div>
      <div class="rail-hud-body">
        <div class="rail-hud-status-row">
          <span id="rail-hud-count-text">0 trains detected</span>
          <span class="rail-hud-live-indicator">${termsAccepted ? '● Active' : 'Terms Required'}</span>
        </div>
        <div class="rail-hud-actions">
          <button type="button" class="rail-hud-action-btn primary" id="rail-hud-fetch-all-btn" ${termsAccepted ? '' : 'title="Please accept terms first"'}>
            ${zapIcon({ size: 12, className: 'svg-icon-inline' })} Fetch All
          </button>
          <button type="button" class="rail-hud-action-btn secondary" id="rail-hud-settings-btn" title="Open Settings">
            ${settingsIcon({ size: 13 })}
          </button>
        </div>
        <div class="rail-hud-disclaimer">
          <span>${shieldCheckIcon({ size: 10, className: 'svg-icon-inline' })} ${termsAccepted ? 'Individual Non-Commercial Tool' : 'Please accept Compliance Terms in popup'}</span>
        </div>
      </div>
    `;

    hud.querySelector('#rail-hud-minimize-btn')?.addEventListener('click', () => this.minimize());
    hud.querySelector('#rail-hud-close-btn')?.addEventListener('click', () => this.dismiss());
    hud.querySelector('#rail-hud-fetch-all-btn')?.addEventListener('click', onFetchAll);
    hud.querySelector('#rail-hud-settings-btn')?.addEventListener('click', onOpenSettings);

    this.hudElement = hud;
    host.appendChild(hud);

    this.applyVisibility();
    if (this.detectedCount > 0 || this.fetchedCount > 0) {
      this.updateCount(this.detectedCount, this.fetchedCount);
    }
  }

  /**
   * Ensures the HUD is attached to document.body, re-attaching if an SPA re-render purged it.
   */
  public static ensureAttached(): void {
    if (this.isDismissed) return;

    const host = document.body || document.documentElement;
    if (!host) return;

    const hudAttached = this.hudElement && host.contains(this.hudElement);
    const minAttached = this.minimizedElement && host.contains(this.minimizedElement);

    if (!hudAttached || !minAttached) {
      if (this.onFetchAllCallback && this.onOpenSettingsCallback) {
        this.mount(
          this.vendorClass,
          this.onFetchAllCallback,
          this.onOpenSettingsCallback,
          this.termsAccepted
        );
      } else if (this.hudElement && this.minimizedElement) {
        if (!minAttached) host.appendChild(this.minimizedElement);
        if (!hudAttached) host.appendChild(this.hudElement);
        this.applyVisibility();
      }
    }
  }

  public static updateCount(detectedCount: number, fetchedCount: number): void {
    this.detectedCount = detectedCount;
    this.fetchedCount = fetchedCount;

    const textEl = document.getElementById('rail-hud-count-text');
    if (textEl) {
      if (detectedCount === 0) {
        textEl.textContent = 'Searching trains…';
      } else if (fetchedCount >= detectedCount) {
        textEl.textContent = `All ${detectedCount} trains updated`;
      } else {
        textEl.textContent = `${fetchedCount}/${detectedCount} trains loaded`;
      }
    }

    const minBadge = document.getElementById('rail-hud-min-badge');
    if (minBadge) {
      minBadge.textContent = detectedCount > 0 ? `${detectedCount} Trains` : 'Live';
    }
  }

  public static setFetchingState(isFetching: boolean, count?: { done: number; total: number }): void {
    const btn = document.getElementById('rail-hud-fetch-all-btn') as HTMLButtonElement | null;
    if (!btn) return;

    if (isFetching) {
      btn.disabled = true;
      btn.style.opacity = '0.8';
      btn.style.cursor = 'wait';
      const label = count ? `Fetching (${count.done}/${count.total})…` : 'Fetching…';
      btn.innerHTML = `<span class="rail-delay-spinner" style="width:10px;height:10px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:4px;"></span> ${label}`;
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.innerHTML = `${checkIcon({ size: 12, className: 'svg-icon-inline' })} All Updated`;
      setTimeout(() => {
        if (btn && !btn.disabled) {
          btn.innerHTML = `${zapIcon({ size: 12, className: 'svg-icon-inline' })} Fetch All`;
        }
      }, 2500);
    }
  }

  public static updateTermsStatus(accepted: boolean): void {
    this.termsAccepted = accepted;
    const indicator = document.querySelector('.rail-hud-live-indicator');
    if (indicator) {
      indicator.textContent = accepted ? '● Active' : 'Terms Required';
    }
    const btn = document.getElementById('rail-hud-fetch-all-btn') as HTMLButtonElement | null;
    if (btn && accepted) {
      btn.removeAttribute('title');
    }
  }

  public static minimize(): void {
    this.isDismissed = false;
    this.isMinimized = true;
    this.applyVisibility();
  }

  public static expand(): void {
    this.isDismissed = false;
    this.isMinimized = false;
    this.applyVisibility();
  }

  public static dismiss(): void {
    this.isDismissed = true;
    this.applyVisibility();
  }

  /**
   * Restores HUD unconditionally, re-attaches to DOM if needed, and pulses highlight.
   */
  public static restore(): void {
    this.isDismissed = false;
    this.isMinimized = false;

    this.ensureAttached();
    this.applyVisibility();

    if (this.hudElement) {
      this.hudElement.classList.remove('rail-hud-highlight-pulse');
      void this.hudElement.offsetWidth; // Force reflow
      this.hudElement.classList.add('rail-hud-highlight-pulse');
      setTimeout(() => {
        this.hudElement?.classList.remove('rail-hud-highlight-pulse');
      }, 1200);
    }
  }

  public static toggle(): void {
    if (this.isDismissed || this.isMinimized) {
      this.restore();
    } else {
      this.minimize();
    }
  }

  public static isCurrentlyVisible(): boolean {
    return !this.isDismissed && !this.isMinimized;
  }

  private static applyVisibility(): void {
    if (this.isDismissed) {
      if (this.hudElement) {
        this.hudElement.classList.add('rail-hud-hidden');
        this.hudElement.classList.remove('rail-hud-visible');
        this.hudElement.style.setProperty('display', 'none', 'important');
      }
      if (this.minimizedElement) {
        this.minimizedElement.classList.add('rail-hud-hidden');
        this.minimizedElement.classList.remove('rail-hud-visible');
        this.minimizedElement.style.setProperty('display', 'none', 'important');
      }
      return;
    }

    if (this.isMinimized) {
      if (this.hudElement) {
        this.hudElement.classList.add('rail-hud-hidden');
        this.hudElement.classList.remove('rail-hud-visible');
        this.hudElement.style.setProperty('display', 'none', 'important');
      }
      if (this.minimizedElement) {
        this.minimizedElement.classList.remove('rail-hud-hidden');
        this.minimizedElement.classList.add('rail-hud-visible');
        this.minimizedElement.style.setProperty('display', 'flex', 'important');
      }
    } else {
      if (this.hudElement) {
        this.hudElement.classList.remove('rail-hud-hidden');
        this.hudElement.classList.add('rail-hud-visible');
        this.hudElement.style.setProperty('display', 'flex', 'important');
      }
      if (this.minimizedElement) {
        this.minimizedElement.classList.add('rail-hud-hidden');
        this.minimizedElement.classList.remove('rail-hud-visible');
        this.minimizedElement.style.setProperty('display', 'none', 'important');
      }
    }
  }
}
