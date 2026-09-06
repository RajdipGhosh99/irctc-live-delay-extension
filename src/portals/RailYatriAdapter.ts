/**
 * RailYatri Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BadgePosition } from '../core/types';
import { BasePortalAdapter } from './BasePortalAdapter';
import { railYatriConfig } from './configs/railyatri.config';

export class RailYatriAdapter extends BasePortalAdapter {
  constructor() {
    super(railYatriConfig);
  }

  public override getBadgeAnchor(card: HTMLElement): HTMLElement | null {
    const titleLink = card.querySelector('a[href*="/time-table/"]');
    if (titleLink instanceof HTMLElement) {
      return titleLink;
    }
    const legacyTitle = card.querySelector('.train-name, [class*="train-name"], h3, h4');
    if (legacyTitle instanceof HTMLElement) {
      return legacyTitle;
    }
    return super.getBadgeAnchor(card);
  }

  public override injectBadge(card: HTMLElement, badgeWrapper: HTMLElement, position: BadgePosition): void {
    badgeWrapper.classList.add(`position-${position}`);
    badgeWrapper.classList.add('vendor-railyatri');

    const anchor = this.getBadgeAnchor(card);
    if (anchor && anchor !== card && anchor.parentElement) {
      if (anchor.parentElement.classList.contains('rail-train-title-row')) {
        anchor.parentElement.appendChild(badgeWrapper);
        return;
      }

      const parent = anchor.parentElement;
      anchor.style.display = 'inline-block';
      anchor.style.width = 'auto';
      anchor.style.maxWidth = 'fit-content';
      anchor.style.margin = '0';

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

