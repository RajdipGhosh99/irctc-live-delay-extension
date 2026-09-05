/**
 * ClearTrip Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';

export class ClearTripAdapter extends BasePortalAdapter {
  readonly id = 'cleartrip';
  readonly name = 'ClearTrip';
  readonly domains = ['cleartrip.com'];

  public getTrainCards(root: ParentNode): HTMLElement[] {
    const cards: HTMLElement[] = [];
    const elements = root.querySelectorAll(
      '[data-test-attrib="train-card"], .train-card, [class*="trainItem"], [class*="train-row"]'
    );
    elements.forEach((el) => {
      if (el instanceof HTMLElement && !cards.includes(el)) {
        cards.push(el);
      }
    });
    return cards;
  }
}
