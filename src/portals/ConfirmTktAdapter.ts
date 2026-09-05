/**
 * ConfirmTkt Portal Adapter
 * Specialized for ConfirmTkt Tailwind and SPA Layouts
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BadgePosition } from '../core/types';
import { BasePortalAdapter } from './BasePortalAdapter';
import { confirmTktConfig } from './configs/confirmtkt.config';

export class ConfirmTktAdapter extends BasePortalAdapter {
  constructor() {
    super(confirmTktConfig);
  }

  public override injectBadge(card: HTMLElement, badgeWrapper: HTMLElement, position: BadgePosition): void {
    badgeWrapper.classList.add(`position-${position}`);
    badgeWrapper.classList.add('vendor-confirmtkt');

    // ConfirmTkt has a truncate div with max-w-[215px] and overflow:hidden.
    // Insert the badge in the parent flex row beside the truncate div so it is never clipped!
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
