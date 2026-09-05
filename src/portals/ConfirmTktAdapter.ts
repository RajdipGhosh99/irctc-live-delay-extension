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

    // ConfirmTkt has a truncate div with max-w-[215px] and overflow:hidden, or route-link elements
    const anchor = card.querySelector('.truncate, [class*="max-w-"], .body-sm, a.route-link, .train-name, h2, h3, h4');
    if (anchor && anchor.parentElement) {
      if (anchor.parentElement.classList.contains('rail-train-title-row')) {
        anchor.parentElement.appendChild(badgeWrapper);
        return;
      }
      const parent = anchor.parentElement;
      if (parent.classList.contains('flex') || parent.classList.contains('makeFlex')) {
        parent.style.alignItems = 'center';
        parent.style.flexWrap = 'nowrap';
        parent.insertBefore(badgeWrapper, anchor.nextSibling);
        badgeWrapper.style.flexShrink = '0';
        badgeWrapper.style.whiteSpace = 'nowrap';
        return;
      }

      // Wrap in inline-flex nowrap row
      const titleRow = document.createElement('div');
      titleRow.className = 'rail-train-title-row';
      titleRow.style.cssText =
        'display: inline-flex !important; flex-direction: row !important; align-items: center !important; flex-wrap: nowrap !important; gap: 8px !important; max-width: 100% !important; vertical-align: middle !important;';

      parent.insertBefore(titleRow, anchor);
      titleRow.appendChild(anchor);
      titleRow.appendChild(badgeWrapper);

      badgeWrapper.style.flexShrink = '0';
      badgeWrapper.style.whiteSpace = 'nowrap';
      return;
    }

    super.injectBadge(card, badgeWrapper, position);
  }
}
