/**
 * MakeMyTrip Portal Adapter
 * Specialized for MakeMyTrip React Search Results
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BadgePosition } from '../core/types';
import { BasePortalAdapter } from './BasePortalAdapter';
import { makeMyTripConfig } from './configs/makemytrip.config';

export class MakeMyTripAdapter extends BasePortalAdapter {
  constructor() {
    super(makeMyTripConfig);
  }

  public override getBadgeAnchor(card: HTMLElement): HTMLElement | null {
    // Specifically search for train name element first, avoiding departure/arrival times
    const trainNameEl = card.querySelector(
      '[data-testid="train-name"], [class*="ListingCard_listName"], [class*="listName"], .train-name, [class*="train-name"], [class*="trainName"], [data-testid*="train-name"], .train-name-wrap, .train-heading, h3, h4'
    );
    if (trainNameEl instanceof HTMLElement) {
      return trainNameEl;
    }
    return super.getBadgeAnchor(card);
  }

  public override injectBadge(card: HTMLElement, badgeWrapper: HTMLElement, position: BadgePosition): void {
    badgeWrapper.classList.add(`position-${position}`);
    badgeWrapper.classList.add('vendor-makemytrip');

    const anchor = this.getBadgeAnchor(card);
    if (anchor && anchor !== card && anchor.parentElement) {
      // If already wrapped in our dedicated title row, append directly
      if (anchor.parentElement.classList.contains('rail-train-title-row')) {
        anchor.parentElement.appendChild(badgeWrapper);
        return;
      }

      const parent = anchor.parentElement;

      // Check if adjacent sibling is a train number element (e.g. "#12301" or "(12301)")
      let nextTarget: HTMLElement = anchor;
      const sib = anchor.nextElementSibling;
      if (
        sib instanceof HTMLElement &&
        (/(?:num|no|code|id)/i.test(sib.className) || /\(\d{5}\)/.test(sib.textContent || ''))
      ) {
        nextTarget = sib;
      }

      // Ensure anchor does not force a full-width line break
      anchor.style.display = 'inline-block';
      anchor.style.width = 'auto';
      anchor.style.maxWidth = 'fit-content';
      anchor.style.margin = '0';

      // To guarantee the badge is NEVER pushed below longer train names,
      // wrap the train title and badge together in an inline-flex nowrap row.
      const titleRow = document.createElement('div');
      titleRow.className = 'rail-train-title-row';
      titleRow.style.cssText =
        'display: inline-flex !important; flex-direction: row !important; align-items: center !important; flex-wrap: nowrap !important; gap: 8px !important; max-width: 100% !important; vertical-align: middle !important;';

      parent.insertBefore(titleRow, anchor);
      titleRow.appendChild(anchor);
      if (nextTarget !== anchor && nextTarget.parentNode === parent) {
        titleRow.appendChild(nextTarget);
      }
      titleRow.appendChild(badgeWrapper);

      // Prevent badge from shrinking or wrapping
      badgeWrapper.style.flexShrink = '0';
      badgeWrapper.style.whiteSpace = 'nowrap';
      return;
    }

    super.injectBadge(card, badgeWrapper, position);
  }
}

