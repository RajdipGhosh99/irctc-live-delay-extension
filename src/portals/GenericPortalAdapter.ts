/**
 * Generic Portal Adapter (Universal Leaf-Node Fallback)
 * Automatically scans any booking portal for train numbers (< 90 char leaves)
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { extractTrainNumberRegex } from '../core/utils';
import { BasePortalAdapter } from './BasePortalAdapter';

export class GenericPortalAdapter extends BasePortalAdapter {
  readonly id = 'generic';
  readonly name = 'Universal Booking Portal';
  readonly domains = ['*'];

  public override matches(): boolean {
    return true; // Always matches as fallback
  }

  public getTrainCards(root: ParentNode): HTMLElement[] {
    const candidateElements: HTMLElement[] = [];
    const elements = root.querySelectorAll(
      'div, span, p, a, h1, h2, h3, h4, h5, h6, strong, b, td, li, section, article'
    );

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;

      // Ignore our own injected widgets or massive container blocks
      if (
        el.closest('.rail-delay-wrapper') ||
        el.closest('#rail-live-hud') ||
        el.classList.contains('rail-delay-wrapper')
      ) {
        continue;
      }

      // Check if this element is a short leaf or direct train header
      const text = el.textContent || '';
      if (text.length > 0 && text.length < 90 && el.children.length <= 4) {
        const trainNum = extractTrainNumberRegex(text);
        if (trainNum) {
          candidateElements.push(el);
        }
      }
    }

    return candidateElements;
  }
}
