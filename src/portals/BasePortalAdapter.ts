/**
 * Base Portal Adapter Interface & Abstract Implementation
 * Strategy Pattern for Website-by-Website Isolation
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BadgePosition } from '../core/types';
import { extractTrainNumberRegex, normalizeDateToIsoDate } from '../core/utils';

export interface PortalAdapter {
  readonly id: string;
  readonly name: string;
  readonly domains: string[];

  matches(url: string, hostname: string): boolean;
  getSearchContainer(root: ParentNode): HTMLElement | null;
  getTrainCards(root: ParentNode): HTMLElement[];
  extractTrainNumber(cardOrElement: HTMLElement): string | null;
  getBadgeAnchor(card: HTMLElement): HTMLElement | null;
  injectBadge(card: HTMLElement, badgeWrapper: HTMLElement, position: BadgePosition): void;
  extractTravelDate(card: HTMLElement): string | null;
  getCustomCssClass(): string;
}

export abstract class BasePortalAdapter implements PortalAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly domains: string[];

  public matches(_url: string, hostname: string): boolean {
    const host = (hostname || '').toLowerCase();
    return this.domains.some((d) => host === d || host.endsWith(`.${d}`));
  }

  public getSearchContainer(_root: ParentNode): HTMLElement | null {
    return null;
  }

  public abstract getTrainCards(root: ParentNode): HTMLElement[];

  public extractTrainNumber(cardOrElement: HTMLElement): string | null {
    if (!cardOrElement) return null;

    // Check data attributes
    const dataNum = cardOrElement.getAttribute('data-train-number') || cardOrElement.getAttribute('data-trainno');
    if (dataNum && /^[0-2]\d{4}$/.test(dataNum.trim())) {
      return dataNum.trim();
    }

    // Check card element ID (e.g., id="train-12952")
    const id = cardOrElement.id || '';
    const idMatch = id.match(/train-(\d{5})/i);
    if (idMatch) return idMatch[1];

    // Fallback to text matching
    const text = cardOrElement.textContent || '';
    return extractTrainNumberRegex(text);
  }

  public getBadgeAnchor(card: HTMLElement): HTMLElement | null {
    return card;
  }

  public injectBadge(card: HTMLElement, badgeWrapper: HTMLElement, position: BadgePosition): void {
    const anchor = this.getBadgeAnchor(card) || card;
    badgeWrapper.classList.add(`position-${position}`);

    if (position === 'card-header-right') {
      const header = card.querySelector('header, .header, [class*="header"], [class*="top"]') || anchor;
      header.appendChild(badgeWrapper);
    } else if (position === 'below-name') {
      if (anchor.parentNode) {
        anchor.parentNode.insertBefore(badgeWrapper, anchor.nextSibling);
      } else {
        card.appendChild(badgeWrapper);
      }
    } else {
      // Default: beside-name
      if (anchor.parentNode) {
        anchor.parentNode.insertBefore(badgeWrapper, anchor.nextSibling);
      } else {
        card.appendChild(badgeWrapper);
      }
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

    // 3. Scan DOM for date strings
    const dateElement = card.querySelector('[class*="date"], [class*="day"], [id*="date"]');
    if (dateElement && dateElement.textContent) {
      const iso = normalizeDateToIsoDate(dateElement.textContent);
      if (iso) return iso;
    }

    return null;
  }

  public getCustomCssClass(): string {
    return `vendor-${this.id}`;
  }
}
