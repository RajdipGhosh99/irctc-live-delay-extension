/**
 * Content Script Orchestrator for Live Train Delay Tracker
 * Dynamically binds website adapters, injects responsive badges, and mounts controller HUD
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BadgePosition, InjectedWidget, MultiProviderSettings, TrainDelayData } from '../core/types';
import { loadSettings } from '../core/storage';
import { STORAGE_KEYS } from '../core/constants';
import { PortalRegistry } from '../portals/PortalRegistry';
import { BadgeComponent } from '../ui/BadgeComponent';
import { PopoverComponent } from '../ui/PopoverComponent';
import { FloatingHudComponent } from '../ui/FloatingHudComponent';
import '../styles/styles.css';

class ContentScriptOrchestrator {
  private settings: MultiProviderSettings | null = null;
  private adapter = PortalRegistry.getActiveAdapter();
  private injectedWidgets = new Map<string, InjectedWidget>();
  private processedElements = new WeakSet<HTMLElement>();
  private activePopoverWidget: InjectedWidget | null = null;
  private scanDebounceTimer: number | null = null;
  private isScanning = false;

  public async init(): Promise<void> {
    console.log(`[TrainDelayTracker] Initializing on portal: ${this.adapter.name} (${window.location.hostname})`);

    this.settings = await loadSettings();

    // Check if extension is disabled globally or on this specific domain
    if (!this.settings.extensionEnabled || this.isDomainDisabled()) {
      console.log('[TrainDelayTracker] Extension is disabled on this portal.');
      return;
    }

    // Mount Floating HUD
    if (this.settings.showFloatingHUD !== false) {
      FloatingHudComponent.mount(
        this.adapter.getCustomCssClass(),
        () => this.fetchAllTrains(),
        () => chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }),
        this.settings.termsAccepted !== false
      );
    }

    // Listen for live setting updates (e.g. Terms acceptance, sitePositions change, HUD toggle)
    chrome.storage?.onChanged?.addListener((changes, namespace) => {
      if (namespace === 'local' && changes['rail_delay_tracker_settings']?.newValue) {
        const oldSettings = this.settings;
        this.settings = changes['rail_delay_tracker_settings'].newValue as MultiProviderSettings;

        // Terms acceptance status update
        if (this.settings.termsAccepted && !oldSettings?.termsAccepted) {
          FloatingHudComponent.updateTermsStatus(true);
        }

        // Floating HUD toggle from Options
        if (this.settings.showFloatingHUD === false) {
          FloatingHudComponent.dismiss();
        } else if (this.settings.showFloatingHUD === true && oldSettings?.showFloatingHUD === false) {
          FloatingHudComponent.restore();
        }

        // If sitePositions changed for this domain, dynamically reposition all injected badges
        const domain = this.adapter.domains[0];
        const newPos = this.settings?.sitePositions?.[domain] || 'beside-name';
        const oldPos = oldSettings?.sitePositions?.[domain] || 'beside-name';
        if (newPos !== oldPos) {
          this.repositionAllBadges(newPos);
        }
      }
    });

    // Listen for runtime messages (e.g. TRIGGER_FETCH_ALL, RESTORE_FLOATING_HUD, TOGGLE_FLOATING_HUD)
    chrome.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'TRIGGER_FETCH_ALL') {
        this.fetchAllTrains(true);
        sendResponse({ success: true, count: this.injectedWidgets.size });
      } else if (message?.type === 'RESTORE_FLOATING_HUD') {
        FloatingHudComponent.restore();
        sendResponse({ success: true, state: 'restored' });
      } else if (message?.type === 'TOGGLE_FLOATING_HUD') {
        FloatingHudComponent.toggle();
        sendResponse({ success: true, visible: FloatingHudComponent.isCurrentlyVisible() });
      }
    });

    // Keyboard shortcut: Alt+H (Option+H on Mac) to toggle / restore floating HUD
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        FloatingHudComponent.toggle();
      }
    });

    // Initial DOM scan
    this.scanAndInject();

    // Setup MutationObserver for dynamic SPAs
    this.setupObserver();

    // Close popover when clicking outside
    document.addEventListener('click', (e) => this.handleOutsideClick(e));
  }

  private isDomainDisabled(): boolean {
    if (!this.settings) return false;
    const host = window.location.hostname.toLowerCase();
    return this.settings.disabledSites.some((d) => host === d || host.endsWith(`.${d}`));
  }

  private setupObserver(): void {
    const target = document.body || document.documentElement;
    const observer = new MutationObserver(() => {
      if (this.scanDebounceTimer) window.clearTimeout(this.scanDebounceTimer);
      this.scanDebounceTimer = window.setTimeout(() => {
        this.scanAndInject();
      }, 150);
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
    });

    // Handle SPA pushState / popstate navigations
    window.addEventListener('popstate', () => {
      this.adapter = PortalRegistry.getActiveAdapter();
      setTimeout(() => this.scanAndInject(), 250);
    });

    // Fallback periodic scan for late-loading dynamic React / Angular hydrate cycles
    let pollCount = 0;
    const interval = window.setInterval(() => {
      pollCount++;
      this.scanAndInject();
      if (pollCount > 10) window.clearInterval(interval);
    }, 1200);
  }

  public scanAndInject(): void {
    if (this.isScanning) return;
    this.isScanning = true;

    // Ensure HUD remains attached to DOM if portal SPA re-rendered
    if (this.settings?.showFloatingHUD !== false) {
      FloatingHudComponent.ensureAttached();
    }

    try {
      const cards = this.adapter.getTrainCards(document);
      const position = this.settings?.sitePositions?.[this.adapter.domains[0]] || 'beside-name';

      for (const card of cards) {
        if (this.processedElements.has(card)) continue;

        const trainNumber = this.adapter.extractTrainNumber(card);
        if (!trainNumber) continue;

        // 1. Ensure card or any ancestor does not already have a badge attached
        if (
          card.querySelector('.rail-delay-wrapper') ||
          card.closest('.rail-delay-wrapper') ||
          card.closest(`[data-rail-train="${trainNumber}"]`) ||
          card.getAttribute('data-rail-train') === trainNumber
        ) {
          this.processedElements.add(card);
          continue;
        }

        // 2. Ensure badge anchor or its immediate parent doesn't already have a badge
        const anchor = this.adapter.getBadgeAnchor(card);
        if (anchor) {
          const parent = anchor.parentElement;
          if (
            anchor.querySelector('.rail-delay-wrapper') ||
            anchor.closest('.rail-delay-wrapper') ||
            (parent && parent.querySelector('.rail-delay-wrapper'))
          ) {
            this.processedElements.add(card);
            continue;
          }
        }

        const travelDate = this.adapter.extractTravelDate(card) || undefined;
        this.injectWidget(card, trainNumber, travelDate, position);
        this.processedElements.add(card);
      }

      this.updateHudStats();
    } finally {
      this.isScanning = false;
    }
  }

  private injectWidget(
    card: HTMLElement,
    trainNumber: string,
    travelDate: string | undefined,
    position: any
  ): void {
    const wrapper = BadgeComponent.createBadgeWrapper(trainNumber, travelDate);
    wrapper.setAttribute('data-train', trainNumber);
    const badge = BadgeComponent.createBadgeButton(trainNumber);
    wrapper.appendChild(badge);

    const widget: InjectedWidget = {
      trainNumber,
      travelDate,
      wrapper,
      badge,
      state: 'idle',
    };

    // 1. Hover: Open detailed analytics popover on hover (fetches live data if not yet cached)
    let hoverLeaveTimer: any = null;
    wrapper.addEventListener('mouseenter', () => {
      if (hoverLeaveTimer) {
        clearTimeout(hoverLeaveTimer);
        hoverLeaveTimer = null;
      }
      if (widget.popover) {
        this.openPopover(widget);
      } else if (widget.state === 'idle' || widget.state === 'error') {
        this.fetchTrainDelay(widget).then(() => {
          this.openPopover(widget);
        });
      }
    });

    // 2. Mouse leave: Automatically closes popover after brief buffer
    wrapper.addEventListener('mouseleave', () => {
      hoverLeaveTimer = setTimeout(() => {
        if (this.activePopoverWidget === widget) {
          this.closeActivePopover();
        }
      }, 150);
    });

    // 3. Single click: Toggles popover or fetches if idle
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.activePopoverWidget === widget) {
        this.closeActivePopover();
        return;
      }
      if (widget.state === 'idle' || widget.state === 'error') {
        this.fetchTrainDelay(widget).then(() => this.openPopover(widget));
      } else {
        this.openPopover(widget);
      }
    });

    // 4. Double click: Force refreshes live status
    badge.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.fetchTrainDelay(widget, true).then(() => {
        this.openPopover(widget);
      });
    });

    this.adapter.injectBadge(card, wrapper, position);
    card.setAttribute('data-rail-train', trainNumber);
    this.injectedWidgets.set(`${trainNumber}_${travelDate || 'today'}`, widget);

    // Auto-fetch if enabled in settings
    if (this.settings?.autoFetchAllTrains && widget.state === 'idle') {
      setTimeout(() => this.fetchTrainDelay(widget), 200);
    }
  }

  private repositionAllBadges(newPosition: BadgePosition): void {
    for (const widget of this.injectedWidgets.values()) {
      const card = widget.wrapper.closest('[data-rail-train]') as HTMLElement || widget.wrapper.parentElement;
      if (!card) continue;

      // Remove previous position classes
      widget.wrapper.classList.remove(
        'position-beside-name',
        'position-card-header-right',
        'position-below-name'
      );

      // Re-inject badge with new position layout
      this.adapter.injectBadge(card, widget.wrapper, newPosition);
    }
  }

  private openPopover(widget: InjectedWidget): void {
    if (this.activePopoverWidget && this.activePopoverWidget !== widget) {
      this.closeActivePopover();
    }
    if (!widget.popover) return;

    const popover = widget.popover;

    // --- Dynamic viewport-aware positioning (fixed, not relative-to-wrapper) ---
    const POPOVER_WIDTH = 290;
    const POPOVER_HEIGHT = 340; // generous estimate; actual may be smaller
    const GAP = 8;
    const VIEWPORT_MARGIN = 8;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    // Measure the badge button (the trigger) in viewport coords
    const badgeRect = widget.badge.getBoundingClientRect();

    // Horizontal: align left edge of popover with left edge of badge, clamp within viewport
    let left = badgeRect.left;
    if (left + POPOVER_WIDTH > vpW - VIEWPORT_MARGIN) {
      left = vpW - VIEWPORT_MARGIN - POPOVER_WIDTH;
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    // Vertical: prefer bottom; flip to top if not enough room below
    const actualHeight = popover.offsetHeight > 50 ? popover.offsetHeight : POPOVER_HEIGHT;
    const spaceBelow = vpH - badgeRect.bottom;
    const spaceAbove = badgeRect.top;
    let top: number;
    let flipToTop = false;

    if (spaceBelow >= actualHeight + GAP || spaceBelow >= spaceAbove) {
      // Position BELOW badge
      top = badgeRect.bottom + GAP;
      flipToTop = false;
    } else {
      // Not enough space below — position ABOVE badge
      top = badgeRect.top - GAP - actualHeight;
      flipToTop = true;
      // If calculated top would go off the screen, clamp it
      if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
    }

    // Apply position as fixed so it breaks out of any overflow:hidden ancestor
    popover.style.position = 'fixed';
    popover.style.transform = 'none';
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
    popover.style.bottom = 'auto';
    if (flipToTop) {
      popover.classList.add('popover-flip-top');
    } else {
      popover.classList.remove('popover-flip-top');
    }

    popover.style.display = 'block';
    popover.classList.add('is-open');

    // If actual height was not yet rendered in DOM, refine top coordinate once displayed
    if (flipToTop && popover.offsetHeight > 50 && Math.abs(popover.offsetHeight - actualHeight) > 5) {
      top = Math.max(VIEWPORT_MARGIN, badgeRect.top - GAP - popover.offsetHeight);
      popover.style.top = `${Math.round(top)}px`;
    }

    this.activePopoverWidget = widget;
  }

  private handleBadgeClick(widget: InjectedWidget): void {
    if (this.activePopoverWidget === widget) {
      this.closeActivePopover();
    } else if (widget.state === 'idle' || widget.state === 'error') {
      this.fetchTrainDelay(widget);
    }
  }

  private async fetchTrainDelay(widget: InjectedWidget, forceRefresh = false): Promise<void> {
    if (widget.state === 'loading') return;
    BadgeComponent.updateState(widget, 'loading');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_DELAY',
        trainNumber: widget.trainNumber,
        travelDate: widget.travelDate,
        forceRefresh,
      });

      if (response && response.success && response.data) {
        const data: TrainDelayData = response.data;
        const isDelayed = data.delayMinutes > 5;
        const state = isDelayed ? 'delayed' : 'on-time';

        BadgeComponent.updateState(widget, state, data.delayMinutes);
        this.attachPopover(widget, data);
      } else {
        if (response?.termsRequired) {
          chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
        }
        BadgeComponent.updateState(widget, 'error');
      }
    } catch (err) {
      console.error('[TrainDelayTracker] Fetch error:', err);
      BadgeComponent.updateState(widget, 'error');
    } finally {
      this.updateHudStats();
    }
  }

  private attachPopover(widget: InjectedWidget, data: TrainDelayData): void {
    const wasOpen = this.activePopoverWidget === widget || widget.popover?.classList.contains('is-open');
    if (widget.popover) widget.popover.remove();

    const popover = PopoverComponent.renderPopover(
      data,
      () => this.fetchTrainDelay(widget, true),
      () => this.closeActivePopover()
    );

    // Always start hidden; openPopover() will compute position + show
    popover.style.display = 'none';
    popover.classList.remove('is-open');
    if (wasOpen) this.activePopoverWidget = null; // reset so openPopover won't early-close

    widget.wrapper.appendChild(popover);
    widget.popover = popover;
    widget.wrapper.classList.add('has-data');

    // If it was open before the refresh, re-open with correct positioning
    if (wasOpen) {
      this.openPopover(widget);
    }
  }

  private togglePopover(widget: InjectedWidget): void {
    if (this.activePopoverWidget === widget) {
      this.closeActivePopover();
    } else {
      this.openPopover(widget);
    }
  }

  private closeActivePopover(): void {
    if (this.activePopoverWidget && this.activePopoverWidget.popover) {
      this.activePopoverWidget.popover.style.display = 'none';
      this.activePopoverWidget.popover.classList.remove('is-open');
      this.activePopoverWidget = null;
    }
  }

  private handleOutsideClick(e: MouseEvent): void {
    if (!this.activePopoverWidget) return;
    const target = e.target as HTMLElement;
    if (!this.activePopoverWidget.wrapper.contains(target)) {
      this.closeActivePopover();
    }
  }

  public async fetchAllTrains(forceRefresh = false): Promise<void> {
    // 1. Auto-accept terms if user explicitly clicked Fetch All
    if (!this.settings?.termsAccepted) {
      this.settings = {
        ...(this.settings || ({} as MultiProviderSettings)),
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
      };
      chrome.storage?.local?.set?.({ [STORAGE_KEYS.SETTINGS]: this.settings });
      FloatingHudComponent.updateTermsStatus(true);
    }

    // 2. Scan DOM first to capture any dynamically loaded train cards
    this.scanAndInject();

    const allWidgets = Array.from(this.injectedWidgets.values());
    if (allWidgets.length === 0) {
      console.warn('[TrainDelayTracker] No trains found to fetch.');
      return;
    }

    // Target idle and error cards, or all cards if none are idle/error
    let targets = forceRefresh
      ? allWidgets
      : allWidgets.filter((w) => w.state === 'idle' || w.state === 'error');

    if (targets.length === 0) {
      targets = allWidgets;
      forceRefresh = true;
    }

    const total = targets.length;
    let completed = 0;
    FloatingHudComponent.setFetchingState(true, { done: 0, total });

    const BATCH_SIZE = 3;
    const STAGGER_MS = 140;

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((w) =>
          this.fetchTrainDelay(w, forceRefresh).finally(() => {
            completed++;
            FloatingHudComponent.setFetchingState(true, { done: completed, total });
          })
        )
      );
      if (i + BATCH_SIZE < targets.length) {
        await new Promise((resolve) => setTimeout(resolve, STAGGER_MS));
      }
    }

    FloatingHudComponent.setFetchingState(false);
    this.updateHudStats();
  }

  private updateHudStats(): void {
    const total = this.injectedWidgets.size;
    let fetched = 0;
    for (const widget of this.injectedWidgets.values()) {
      if (widget.state === 'on-time' || widget.state === 'delayed' || widget.state === 'error') {
        fetched++;
      }
    }
    FloatingHudComponent.updateCount(total, fetched);
  }
}

// Instantiate and launch
const orchestrator = new ContentScriptOrchestrator();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => orchestrator.init());
} else {
  orchestrator.init();
}
