/**
 * Goibibo Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';

export class GoibiboAdapter extends BasePortalAdapter {
  readonly id = 'goibibo';
  readonly name = 'Goibibo';
  readonly domains = ['goibibo.com'];

  public getTrainCards(root: ParentNode): HTMLElement[] {
    const cards: HTMLElement[] = [];
    const elements = root.querySelectorAll(
      '.train-list-card, [class*="trainCard"], [class*="trainList"], .srp-card'
    );
    elements.forEach((el) => {
      if (el instanceof HTMLElement && !cards.includes(el)) {
        cards.push(el);
      }
    });
    return cards;
  }
}
