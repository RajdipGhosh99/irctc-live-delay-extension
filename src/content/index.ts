/**
 * Content Script Orchestrator for Live Train Delay Tracker
 * Dynamically binds website adapters, injects responsive badges, and mounts controller HUD
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { InjectedWidget, MultiProviderSettings, TrainDelayData } from '../core/types';
import { loadSettings } from '../core/storage';
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
        () => chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })
      );
    }

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
    const target = this.adapter.getSearchContainer(document) || document.body || document.documentElement;
    const observer = new MutationObserver(() => {
      if (this.scanDebounceTimer) window.clearTimeout(this.scanDebounceTimer);
      this.scanDebounceTimer = window.setTimeout(() => {
        this.scanAndInject();
      }, 180);
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
    });
  }

  public scanAndInject(): void {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      const cards = this.adapter.getTrainCards(document);
      const position = this.settings?.sitePositions?.[this.adapter.domains[0]] || 'beside-name';

      for (const card of cards) {
        if (this.processedElements.has(card)) continue;

        const trainNumber = this.adapter.extractTrainNumber(card);
        if (!trainNumber) continue;

        // Ensure card does not already have a badge attached
        if (card.querySelector('.rail-delay-wrapper')) {
          this.processedElements.add(card);
          continue;
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
    const badge = BadgeComponent.createBadgeButton(trainNumber);
    wrapper.appendChild(badge);

    const widget: InjectedWidget = {
      trainNumber,
      travelDate,
      wrapper,
      badge,
      state: 'idle',
    };

    // Attach click and hover events
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleBadgeClick(widget);
    });

    if (this.settings?.fetchOnHover) {
      wrapper.addEventListener('mouseenter', () => {
        if (widget.state === 'idle') {
          this.fetchTrainDelay(widget);
        }
      });
    }

    this.adapter.injectBadge(card, wrapper, position);
    this.injectedWidgets.set(`${trainNumber}_${travelDate || 'today'}`, widget);

    // Auto-fetch if enabled in settings
    if (this.settings?.autoFetchAllTrains && widget.state === 'idle') {
      setTimeout(() => this.fetchTrainDelay(widget), 200);
    }
  }

  private handleBadgeClick(widget: InjectedWidget): void {
    if (widget.state === 'idle' || widget.state === 'error') {
      this.fetchTrainDelay(widget);
    } else if (widget.popover) {
      this.togglePopover(widget);
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
        this.updateHudStats();
      } else {
        BadgeComponent.updateState(widget, 'error');
      }
    } catch (err) {
      console.error('[TrainDelayTracker] Fetch error:', err);
      BadgeComponent.updateState(widget, 'error');
    }
  }

  private attachPopover(widget: InjectedWidget, data: TrainDelayData): void {
    if (widget.popover) widget.popover.remove();

    const popover = PopoverComponent.renderPopover(
      data,
      () => this.fetchTrainDelay(widget, true),
      () => this.closeActivePopover()
    );

    widget.wrapper.appendChild(popover);
    widget.popover = popover;
    widget.wrapper.classList.add('has-data');
  }

  private togglePopover(widget: InjectedWidget): void {
    if (this.activePopoverWidget === widget) {
      this.closeActivePopover();
    } else {
      this.closeActivePopover();
      if (widget.popover) {
        widget.popover.style.display = 'block';
        this.activePopoverWidget = widget;
      }
    }
  }

  private closeActivePopover(): void {
    if (this.activePopoverWidget && this.activePopoverWidget.popover) {
      this.activePopoverWidget.popover.style.display = 'none';
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

  public fetchAllTrains(): void {
    let delayMs = 0;
    for (const widget of this.injectedWidgets.values()) {
      if (widget.state === 'idle' || widget.state === 'error') {
        setTimeout(() => {
          this.fetchTrainDelay(widget);
        }, delayMs);
        delayMs += 140; // Stagger requests gracefully
      }
    }
  }

  private updateHudStats(): void {
    const total = this.injectedWidgets.size;
    let fetched = 0;
    for (const widget of this.injectedWidgets.values()) {
      if (widget.state === 'on-time' || widget.state === 'delayed') {
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
