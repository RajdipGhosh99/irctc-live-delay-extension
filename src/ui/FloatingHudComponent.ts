/**
 * Viewport-Pinned Floating Action Controller HUD
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

  public static mount(
    vendorClass: string,
    onFetchAll: () => void,
    onOpenSettings: () => void,
    termsAccepted = true
  ): void {
    if (this.isDismissed || document.getElementById('rail-live-hud')) {
      return;
    }

    const host = document.body || document.documentElement;

    // 1. Minimized Bubble
    const minBubble = document.createElement('div');
    minBubble.id = 'rail-hud-minimized';
    minBubble.className = `rail-floating-hud-minimized ${vendorClass}`;
    minBubble.title = 'Click to expand Live Train Delay HUD';
    minBubble.innerHTML = `<span>${trainIcon({ size: 18 })}</span>`;
    minBubble.style.display = this.isMinimized ? 'flex' : 'none';
    minBubble.addEventListener('click', () => this.expand());
    this.minimizedElement = minBubble;
    host.appendChild(minBubble);

    // 2. Main HUD Card
    const hud = document.createElement('div');
    hud.id = 'rail-live-hud';
    hud.className = `rail-floating-hud ${vendorClass}`;
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Live Train Delay Controller');
    hud.style.display = this.isMinimized ? 'none' : 'flex';

    hud.innerHTML = `
      <div class="rail-hud-header">
        <div class="rail-hud-title">
          <span class="rail-hud-icon">${trainIcon({ size: 14 })}</span>
          <strong>Train Delay Tracker</strong>
        </div>
        <div class="rail-hud-controls">
          <button type="button" class="rail-hud-btn-mini" id="rail-hud-minimize-btn" title="Minimize to icon">
            ${minusIcon({ size: 12 })}
          </button>
          <button type="button" class="rail-hud-btn-close" id="rail-hud-close-btn" title="Dismiss for this tab">
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
  }

  public static updateCount(detectedCount: number, fetchedCount: number): void {
    const textEl = document.getElementById('rail-hud-count-text');
    if (!textEl) return;
    if (detectedCount === 0) {
      textEl.textContent = 'Searching trains…';
    } else if (fetchedCount >= detectedCount) {
      textEl.textContent = `All ${detectedCount} trains updated`;
    } else {
      textEl.textContent = `${fetchedCount}/${detectedCount} trains loaded`;
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
    this.isMinimized = true;
    if (this.hudElement) this.hudElement.style.display = 'none';
    if (this.minimizedElement) this.minimizedElement.style.display = 'flex';
  }

  public static expand(): void {
    this.isMinimized = false;
    if (this.hudElement) this.hudElement.style.display = 'flex';
    if (this.minimizedElement) this.minimizedElement.style.display = 'none';
  }

  public static dismiss(): void {
    this.isDismissed = true;
    if (this.hudElement) this.hudElement.remove();
    if (this.minimizedElement) this.minimizedElement.remove();
    this.hudElement = null;
    this.minimizedElement = null;
  }
}
