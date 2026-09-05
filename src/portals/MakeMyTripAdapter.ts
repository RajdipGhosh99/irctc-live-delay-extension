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
      '.train-name, [class*="train-name"], [class*="trainName"], [data-testid*="train-name"], .train-name-wrap, .train-heading, h3, h4'
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
      const parent = anchor.parentElement;
      // Ensure the parent container displays inline-flex / flex row to keep badge beside the train name
      if (!parent.classList.contains('flex') && !parent.classList.contains('makeFlex')) {
        parent.style.display = 'inline-flex';
        parent.style.alignItems = 'center';
        parent.style.flexWrap = 'wrap';
        parent.style.gap = '8px';
      } else {
        parent.style.alignItems = 'center';
      }
      parent.insertBefore(badgeWrapper, anchor.nextSibling);
      return;
    }

    super.injectBadge(card, badgeWrapper, position);
  }
}

