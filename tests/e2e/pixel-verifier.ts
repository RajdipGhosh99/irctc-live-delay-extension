/**
 * Pixel-Perfect Verifier & DOM Geometry Assertions Engine
 * Inspects sub-pixel rendering, alignment, hover popover states, and text quality
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { WebDriver, WebElement } from 'selenium-webdriver';

export interface AlignmentResult {
  cardId?: string;
  trainNumber?: string;
  trainTitleText: string;
  isAlignedBesideTitle: boolean;
  deltaY: number;
  badgeRect: { top: number; left: number; width: number; height: number };
  titleRect: { top: number; left: number; width: number; height: number };
}

export interface PopoverVerificationResult {
  isDisplayed: boolean;
  has3MetricGrid: boolean;
  box1Class: string;
  hasLateOrOntimeColor: boolean;
  hasNeutralBoxes: boolean;
  zeroRawMinutesFound: boolean;
  locationClean: boolean;
  footerIsSingleLine: boolean;
  popoverRect: { top: number; left: number; width: number; height: number };
  details: string[];
}

export class PixelVerifier {
  constructor(private driver: WebDriver, private maxDeltaY = 6) {}

  /**
   * Evaluates pixel-perfect horizontal alignment of the badge beside the train title
   */
  public async verifyBadgeAlignment(cardElement: WebElement): Promise<AlignmentResult> {
    const evalScript = `
      const card = arguments[0];
      const badgeWrapper = card.querySelector('.rail-delay-wrapper');
      if (!badgeWrapper) return null;

      // Find the specific title text element anchor
      const titleRow = card.querySelector('.rail-train-title-row');
      let titleEl = titleRow ? titleRow.querySelector('[data-testid="train-name"], [class*="listName"], .train-name, [class*="train-name"], [class*="trainName"], h3, strong, .truncate, p, span') : null;
      if (!titleEl) {
        titleEl = badgeWrapper.previousElementSibling ||
                  card.querySelector('[data-testid="train-name"], [class*="listName"], .train-name, [class*="train-name"], [class*="trainName"], h3, strong, .truncate, p');
      }

      if (!titleEl) return null;

      const badgeRect = badgeWrapper.getBoundingClientRect();
      const titleRect = titleEl.getBoundingClientRect();

      // Delta between title top and badge top
      const deltaY = Math.abs(badgeRect.top - titleRect.top);

      // Verify badge is positioned horizontally beside, and not wrapped below the title
      const isBeside = (badgeRect.left >= titleRect.left) && (badgeRect.top <= titleRect.bottom + 6);

      return {
        cardId: card.id || card.getAttribute('data-rail-train') || '',
        trainNumber: badgeWrapper.getAttribute('data-train-number') || '',
        trainTitleText: (titleEl.textContent || '').trim().slice(0, 40),
        isAlignedBesideTitle: isBeside && (deltaY <= arguments[1]),
        deltaY,
        badgeRect: { top: badgeRect.top, left: badgeRect.left, width: badgeRect.width, height: badgeRect.height },
        titleRect: { top: titleRect.top, left: titleRect.left, width: titleRect.width, height: titleRect.height },
      };
    `;

    const res = await this.driver.executeScript<AlignmentResult>(evalScript, cardElement, this.maxDeltaY);
    if (!res) {
      throw new Error('Badge wrapper or train title element was not found in card.');
    }
    return res;
  }

  /**
   * Inspects the opened popover for pixel-perfect layout, standard colors, and non-redundancy
   */
  public async verifyPopoverContents(cardElement: WebElement): Promise<PopoverVerificationResult> {
    const evalScript = `
      const card = arguments[0];
      const popover = card.querySelector('.rail-delay-popover');
      if (!popover) {
        return { isDisplayed: false, details: ['Popover DOM element not found'] };
      }

      const style = window.getComputedStyle(popover);
      const isDisplayed = style.display !== 'none' && style.visibility !== 'hidden' && popover.classList.contains('is-open');

      const popoverRect = popover.getBoundingClientRect();
      const details = [];

      // 1. Check 3-Metric Stats Grid
      const grid = popover.querySelector('.rail-popover-stats-grid');
      const has3MetricGrid = !!grid && grid.children.length === 3;
      if (!has3MetricGrid) details.push('Missing 3-metric stats grid');

      // 2. Check Box 1 Colors (box-late or box-ontime)
      const box1 = grid ? grid.children[0] : null;
      const box1Class = box1 ? box1.className : '';
      const hasLateOrOntimeColor = box1Class.includes('box-late') || box1Class.includes('box-ontime');
      if (!hasLateOrOntimeColor) details.push('Box 1 missing box-late or box-ontime class: ' + box1Class);

      // 3. Check Boxes 2 & 3 Colors (box-neutral)
      const box2 = grid ? grid.children[1] : null;
      const box3 = grid ? grid.children[2] : null;
      const hasNeutralBoxes = (box2?.className.includes('box-neutral') ?? false) &&
                             (box3?.className.includes('box-neutral') ?? false);
      if (!hasNeutralBoxes) details.push('Boxes 2 and 3 must have box-neutral class');

      // 4. Assert zero raw minute text (e.g. "289m Late", "289m Behind", "running 4 hours 49 minutes late")
      const popoverText = popover.textContent || '';
      const rawMinMatch = popoverText.match(/\\b\\d+m\\s*(?:late|behind)\\b/i) ||
                          popoverText.match(/running\\s+\\d+\\s*(?:hours?|hrs?)/i);
      const zeroRawMinutesFound = !rawMinMatch;
      if (rawMinMatch) details.push('Found raw minute/narrative text in popover: ' + rawMinMatch[0]);

      // 5. Check location banner does not repeat delay narratives
      const locationBar = popover.querySelector('.rail-popover-location-bar');
      const locationText = (locationBar?.textContent || '').trim();
      const locationClean = !/(?:running|delay|late|behind|right\\s*time)/i.test(locationText);
      if (!locationClean) details.push('Location banner contains redundant delay narrative: ' + locationText);

      // 6. Check single line footer
      const footer = popover.querySelector('.rail-popover-footer');
      const footerRect = footer ? footer.getBoundingClientRect() : { height: 0 };
      const footerIsSingleLine = footerRect.height > 0 && footerRect.height <= 36;
      if (!footerIsSingleLine) details.push('Footer wraps awkwardly (height: ' + footerRect.height + 'px)');

      return {
        isDisplayed,
        has3MetricGrid,
        box1Class,
        hasLateOrOntimeColor,
        hasNeutralBoxes,
        zeroRawMinutesFound,
        locationClean,
        footerIsSingleLine,
        popoverRect: { top: popoverRect.top, left: popoverRect.left, width: popoverRect.width, height: popoverRect.height },
        details,
      };
    `;

    return await this.driver.executeScript<PopoverVerificationResult>(evalScript, cardElement);
  }
}
