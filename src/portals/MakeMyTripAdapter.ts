/**
 * MakeMyTrip Portal Adapter
 * Specialized for MakeMyTrip React Search Results
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BadgePosition } from '../core/types';
import { extractTrainNumberRegex } from '../core/utils';
import { BasePortalAdapter } from './BasePortalAdapter';

export class MakeMyTripAdapter extends BasePortalAdapter {
  readonly id = 'makemytrip';
  readonly name = 'MakeMyTrip';
  readonly domains = ['makemytrip.com'];

  public override getSearchContainer(root: ParentNode): HTMLElement | null {
    return (
      (root.querySelector('#root') as HTMLElement) ||
      (root.querySelector('#react-root') as HTMLElement) ||
      (root.querySelector('.train-listing') as HTMLElement)
    );
  }

  public getTrainCards(root: ParentNode): HTMLElement[] {
    const cards: HTMLElement[] = [];
    const elements = root.querySelectorAll(
      '.train-name-wrap, .single-train-detail, .train-heading, [class*="trainCard"], [class*="trainList"]'
    );
    elements.forEach((el) => {
      if (el instanceof HTMLElement && !cards.includes(el)) {
        cards.push(el);
      }
    });
    return cards;
  }

  public override extractTrainNumber(card: HTMLElement): string | null {
    const titleEl = card.querySelector('.train-name, .boldFont, h3, [class*="name"]');
    if (titleEl && titleEl.textContent) {
      const match = extractTrainNumberRegex(titleEl.textContent);
      if (match) return match;
    }
    return super.extractTrainNumber(card);
  }

  public override getBadgeAnchor(card: HTMLElement): HTMLElement | null {
    const titleEl = card.querySelector('.train-name, .boldFont, h3, [class*="name"]');
    if (titleEl instanceof HTMLElement) {
      return titleEl;
    }
    return card;
  }

  public override injectBadge(card: HTMLElement, badgeWrapper: HTMLElement, position: BadgePosition): void {
    badgeWrapper.classList.add(`position-${position}`);
    badgeWrapper.classList.add('vendor-makemytrip');

    const anchor = this.getBadgeAnchor(card);
    if (anchor && anchor.parentElement) {
      anchor.parentElement.insertBefore(badgeWrapper, anchor.nextSibling);
      return;
    }

    super.injectBadge(card, badgeWrapper, position);
  }
}
