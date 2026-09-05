/**
 * EaseMyTrip Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';

export class EaseMyTripAdapter extends BasePortalAdapter {
  readonly id = 'easemytrip';
  readonly name = 'EaseMyTrip';
  readonly domains = ['easemytrip.com'];

  public getTrainCards(root: ParentNode): HTMLElement[] {
    const cards: HTMLElement[] = [];
    const elements = root.querySelectorAll(
      '.train-card-wrap, .train-box, [class*="trainCard"], .listing-card'
    );
    elements.forEach((el) => {
      if (el instanceof HTMLElement && !cards.includes(el)) {
        cards.push(el);
      }
    });
    return cards;
  }
}
