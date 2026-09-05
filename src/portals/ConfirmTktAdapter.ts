/**
 * ConfirmTkt Portal Adapter
 * Specialized for ConfirmTkt Tailwind and SPA Layouts
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BadgePosition } from '../core/types';
import { extractTrainNumberRegex } from '../core/utils';
import { BasePortalAdapter } from './BasePortalAdapter';

export class ConfirmTktAdapter extends BasePortalAdapter {
  readonly id = 'confirmtkt';
  readonly name = 'ConfirmTkt';
  readonly domains = ['confirmtkt.com'];

  public override getSearchContainer(root: ParentNode): HTMLElement | null {
    return (
      (root.querySelector('#app') as HTMLElement) ||
      (root.querySelector('#__next') as HTMLElement) ||
      (root.querySelector('main') as HTMLElement)
    );
  }

  public getTrainCards(root: ParentNode): HTMLElement[] {
    const cards: HTMLElement[] = [];
    const directIds = root.querySelectorAll('[id^="train-"]');
    directIds.forEach((el) => {
      if (el instanceof HTMLElement && !cards.includes(el)) {
        cards.push(el);
      }
    });

    const borderCards = root.querySelectorAll('.border-b.border-tertiary, div.rounded-10, [class*="train-card"]');
    borderCards.forEach((el) => {
      if (el instanceof HTMLElement && !cards.includes(el)) {
        cards.push(el);
      }
    });

    return cards;
  }

  public override extractTrainNumber(card: HTMLElement): string | null {
    if (card.id && /^train-\d{5}$/i.test(card.id)) {
      return card.id.replace(/^train-/i, '');
    }

    const heading = card.querySelector('[class*="truncate"], [class*="train-name"], h2, h3, h4, .body-sm');
    if (heading && heading.textContent) {
      const match = extractTrainNumberRegex(heading.textContent);
      if (match) return match;
    }

    return super.extractTrainNumber(card);
  }

  public override getBadgeAnchor(card: HTMLElement): HTMLElement | null {
    const truncateDiv = card.querySelector('.truncate, [class*="max-w-"], .body-sm');
    if (truncateDiv instanceof HTMLElement) {
      return truncateDiv;
    }
    const heading = card.querySelector('h2, h3, h4, [class*="train-name"]');
    if (heading instanceof HTMLElement) {
      return heading;
    }
    return card;
  }

  public override injectBadge(card: HTMLElement, badgeWrapper: HTMLElement, position: BadgePosition): void {
    badgeWrapper.classList.add(`position-${position}`);
    badgeWrapper.classList.add('vendor-confirmtkt');

    // ConfirmTkt has a truncate div with max-w-[215px] and overflow:hidden.
    // We MUST insert the badge in the parent flex row beside the truncate div so it is never clipped!
    const truncateDiv = card.querySelector('.truncate, [class*="max-w-"], .body-sm');
    if (truncateDiv && truncateDiv.parentElement) {
      const parentFlex = truncateDiv.parentElement;
      if (!parentFlex.classList.contains('flex')) {
        parentFlex.style.display = 'flex';
        parentFlex.style.alignItems = 'center';
      }
      parentFlex.insertBefore(badgeWrapper, truncateDiv.nextSibling);
      return;
    }

    super.injectBadge(card, badgeWrapper, position);
  }
}
