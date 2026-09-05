/**
 * Base Config-Driven Portal Adapter Interface & Implementation
 * Strategy Pattern parameterized by VendorPortalConfig.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BadgePosition } from '../core/types';
import { extractTrainNumberRegex, normalizeDateToIsoDate } from '../core/utils';
import { VendorPortalConfig } from './configs/types';

export interface PortalAdapter {
  readonly id: string;
  readonly name: string;
  readonly domains: string[];
  readonly config?: VendorPortalConfig;

  matches(url: string, hostname: string): boolean;
  getSearchContainer(root: ParentNode): HTMLElement | null;
  getTrainCards(root: ParentNode): HTMLElement[];
  extractTrainNumber(cardOrElement: HTMLElement): string | null;
  getBadgeAnchor(card: HTMLElement): HTMLElement | null;
  injectBadge(card: HTMLElement, badgeWrapper: HTMLElement, position: BadgePosition): void;
  extractTravelDate(card: HTMLElement): string | null;
  getCustomCssClass(): string;
}

export class BasePortalAdapter implements PortalAdapter {
  readonly id: string;
  readonly name: string;
  readonly domains: string[];
  readonly config?: VendorPortalConfig;

  constructor(config?: VendorPortalConfig) {
    if (config) {
      this.config = config;
      this.id = config.id;
      this.name = config.name;
      this.domains = config.domains;
    } else {
      this.id = 'generic';
      this.name = 'Universal Booking Portal';
      this.domains = ['*'];
    }
  }

  public matches(_url: string, hostname: string): boolean {
    const host = (hostname || '').toLowerCase();
    return this.domains.some((d) => host === d || host.endsWith(`.${d}`));
  }

  public getSearchContainer(root: ParentNode): HTMLElement | null {
    if (!this.config?.detection?.containerSelectors) return null;
    for (const selector of this.config.detection.containerSelectors) {
      const el = root.querySelector(selector);
      if (el instanceof HTMLElement) return el;
    }
    return null;
  }

  public getTrainCards(root: ParentNode): HTMLElement[] {
    const cards: HTMLElement[] = [];

    // 1. Primary scan using vendor config selectors
    if (this.config?.selectors?.cardSelectors) {
      for (const selector of this.config.selectors.cardSelectors) {
        try {
          const elements = root.querySelectorAll(selector);
          elements.forEach((el) => {
            if (el instanceof HTMLElement && !cards.includes(el)) {
              cards.push(el);
            }
          });
        } catch (e) {
          console.warn(`[PortalAdapter:${this.id}] Invalid selector ${selector}:`, e);
        }
      }
    }

    // 2. If vendor-specific selectors found cards, deduplicate nested sub-elements
    if (cards.length > 0) {
      // Keep ONLY the outermost container cards.
      // If card A contains card B, discard card B so we never create duplicate badges for sub-elements!
      const topLevelCards = cards.filter((card) => {
        return !cards.some((other) => other !== card && other.contains(card));
      });
      return topLevelCards;
    }

    // 3. Resilient Fallback: Scan root for containers containing 5-digit train numbers
    const candidateNodes = root.querySelectorAll('div, tr, li, article, section, a, td');
    for (let i = 0; i < candidateNodes.length; i++) {
      const el = candidateNodes[i] as HTMLElement;
      if (
        el.closest('.rail-delay-wrapper') ||
        el.closest('#rail-live-hud') ||
        el.classList.contains('rail-delay-wrapper')
      ) {
        continue;
      }

      const text = el.textContent || '';
      if (text.length > 0 && text.length < 150 && el.children.length <= 8) {
        const trainNum = extractTrainNumberRegex(text);
        if (trainNum && !cards.includes(el)) {
          cards.push(el);
        }
      }
    }

    // Deduplicate nested elements in fallback
    const topLevelCandidates = cards.filter((card) => {
      return !cards.some((other) => other !== card && other.contains(card));
    });

    return topLevelCandidates;
  }

  public extractTrainNumber(cardOrElement: HTMLElement): string | null {
    if (!cardOrElement) return null;

    // 1. Check vendor-configured attributes
    const attrs = this.config?.selectors?.trainNumberAttributes || ['data-train-number', 'data-trainno', 'id'];
    for (const attr of attrs) {
      const val = cardOrElement.getAttribute(attr);
      if (val) {
        const match = extractTrainNumberRegex(val);
        if (match) return match;
      }
    }

    // 2. Check vendor-configured title / number child selectors
    if (this.config?.selectors?.titleSelectors) {
      for (const sel of this.config.selectors.titleSelectors) {
        try {
          const titleEl = cardOrElement.querySelector(sel);
          if (titleEl && titleEl.textContent) {
            const match = extractTrainNumberRegex(titleEl.textContent);
            if (match) return match;
          }
        } catch {
          // ignore
        }
      }
    }

    // 3. Fallback to card textContent
    const text = cardOrElement.textContent || '';
    return extractTrainNumberRegex(text);
  }

  public getBadgeAnchor(card: HTMLElement): HTMLElement | null {
    if (this.config?.selectors?.badgeAnchorSelectors) {
      for (const sel of this.config.selectors.badgeAnchorSelectors) {
        try {
          const anchor = card.querySelector(sel);
          if (anchor instanceof HTMLElement) {
            return anchor;
          }
        } catch {
          // ignore
        }
      }
    }
    return card;
  }

  public injectBadge(card: HTMLElement, badgeWrapper: HTMLElement, position: BadgePosition): void {
    const anchor = this.getBadgeAnchor(card) || card;
    badgeWrapper.classList.add(`position-${position}`);

    if (this.config?.styling?.customCssClass) {
      badgeWrapper.classList.add(this.config.styling.customCssClass);
    }
    if (this.config?.styling?.extraBadgeWrapperClass) {
      badgeWrapper.classList.add(this.config.styling.extraBadgeWrapperClass);
    }

    if (position === 'card-header-right') {
      const header = card.querySelector('header, .header, [class*="header"], [class*="top"]') || anchor;
      header.appendChild(badgeWrapper);
      return;
    }

    if (position === 'below-name') {
      if (anchor.parentNode) {
        anchor.parentNode.insertBefore(badgeWrapper, anchor.nextSibling);
      } else {
        card.appendChild(badgeWrapper);
      }
      return;
    }

    // Default: beside-name
    if (anchor !== card && anchor.parentElement) {
      const parent = anchor.parentElement;
      // If parent is block or inline, ensure it uses inline-flex / flex row to keep badge beside the title
      if (!parent.classList.contains('flex') && !parent.classList.contains('makeFlex') && !parent.classList.contains('d-flex')) {
        parent.style.display = 'inline-flex';
        parent.style.alignItems = 'center';
        parent.style.flexWrap = 'nowrap';
        parent.style.gap = '8px';
      } else {
        parent.style.alignItems = 'center';
        parent.style.flexWrap = 'nowrap';
      }
      badgeWrapper.style.flexShrink = '0';
      badgeWrapper.style.whiteSpace = 'nowrap';
      parent.insertBefore(badgeWrapper, anchor.nextSibling);
      return;
    }

    if (anchor.parentNode) {
      anchor.parentNode.insertBefore(badgeWrapper, anchor.nextSibling);
    } else {
      card.appendChild(badgeWrapper);
    }
  }

  public extractTravelDate(card: HTMLElement): string | null {
    // 1. Check card data-date attribute
    const dataDate = card.getAttribute('data-date') || card.getAttribute('data-journey-date');
    if (dataDate) {
      const iso = normalizeDateToIsoDate(dataDate);
      if (iso) return iso;
    }

    // 2. Check URL search params or path (e.g., /30-08-2026)
    const urlIso = normalizeDateToIsoDate(window.location.href);
    if (urlIso) return urlIso;

    // 3. Scan vendor date selectors or general DOM for date strings
    const dateSelectors = this.config?.selectors?.dateSelectors || ['[class*="date"]', '[class*="day"]', '[id*="date"]'];
    for (const sel of dateSelectors) {
      const el = card.querySelector(sel) || document.querySelector(sel);
      if (el && el.textContent) {
        const iso = normalizeDateToIsoDate(el.textContent);
        if (iso) return iso;
      }
    }

    return null;
  }

  public getCustomCssClass(): string {
    return this.config?.styling?.customCssClass || `vendor-${this.id}`;
  }
}
