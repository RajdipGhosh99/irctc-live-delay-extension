/**
 * Ixigo Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';

export class IxigoAdapter extends BasePortalAdapter {
  readonly id = 'ixigo';
  readonly name = 'Ixigo';
  readonly domains = ['ixigo.com'];

  public getTrainCards(root: ParentNode): HTMLElement[] {
    const cards: HTMLElement[] = [];
    const elements = root.querySelectorAll(
      '.c-train-list-item, .train-info, [class*="trainCard"], [class*="trainItem"]'
    );
    elements.forEach((el) => {
      if (el instanceof HTMLElement && !cards.includes(el)) {
        cards.push(el);
      }
    });
    return cards;
  }
}
