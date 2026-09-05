/**
 * Viewport-Pinned Floating Action Controller HUD
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

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

    const host = document.documentElement || document.body;

    // 1. Minimized Bubble
    const minBubble = document.createElement('div');
    minBubble.id = 'rail-hud-minimized';
    minBubble.className = `rail-floating-hud-minimized ${vendorClass}`;
    minBubble.title = 'Click to expand Live Train Delay HUD';
    minBubble.innerHTML = `<span>🚆</span>`;
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
          <span class="rail-hud-icon">🚆</span>
          <strong>Train Delay Tracker</strong>
        </div>
        <div class="rail-hud-controls">
          <button type="button" class="rail-hud-btn-mini" id="rail-hud-minimize-btn" title="Minimize to icon">_</button>
          <button type="button" class="rail-hud-btn-close" id="rail-hud-close-btn" title="Dismiss for this tab">✕</button>
        </div>
      </div>
      <div class="rail-hud-body">
        <div class="rail-hud-status-row">
          <span id="rail-hud-count-text">0 trains detected</span>
          <span class="rail-hud-live-indicator">${termsAccepted ? '● Active' : '⚠️ Terms Required'}</span>
        </div>
        <div class="rail-hud-actions">
          <button type="button" class="rail-hud-action-btn primary" id="rail-hud-fetch-all-btn" ${termsAccepted ? '' : 'title="Please accept terms first"'}>
            ⚡ Fetch All
          </button>
          <button type="button" class="rail-hud-action-btn secondary" id="rail-hud-settings-btn" title="Open Settings">
            ⚙️
          </button>
        </div>
        <div class="rail-hud-disclaimer">
          <span>${termsAccepted ? '⚠️ Personal Fair Use Only' : '⚠️ Please accept Fair Use Terms in popup'}</span>
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
