/**
 * ClearTrip Vendor Configuration
 * Selectors, script checks, container rules, and styling for ClearTrip.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { VendorPortalConfig } from './types';

export const clearTripConfig: VendorPortalConfig = {
  id: 'cleartrip',
  name: 'ClearTrip',
  domains: ['cleartrip.com'],
  detection: {
    scriptSignatures: ['cleartrip'],
    containerSelectors: ['#root', 'main', '.train-container', 'body'],
    cssSignatures: ['cleartrip'],
  },
  selectors: {
    cardSelectors: [
      '[data-test-attrib="train-card"]',
      '.train-card',
      '[class*="trainItem"]',
      '[class*="train-row"]',
      'div[class*="trainCard"]',
    ],
    titleSelectors: [
      '.train-name',
      'h3',
      'h4',
      '[class*="title"]',
      'span',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '.journey-date', '[class*="date"]'],
    badgeAnchorSelectors: [
      '.train-name',
      'h3',
      'h4',
      '[class*="title"]',
    ],
    insertStrategy: 'after',
  },
  route: {
    mockPath: '/cleartrip',
    getLiveUrl: (src, dest, date) =>
      `https://www.cleartrip.com/trains/results?from_station=${encodeURIComponent(src)}&to_station=${encodeURIComponent(dest)}&date=${date.dd_mm_yyyy}`,
  },
  badge: {
    preferredPosition: 'beside-name',
    maxDeltaYPx: 6,
  },
  popup: {
    styleVariant: 'standard',
    hoverEnabled: true,
    clickEnabled: true,
    doubleClickRefresh: true,
  },
  styling: {
    customCssClass: 'vendor-cleartrip',
    extraBadgeWrapperClass: 'vendor-cleartrip',
  },
};
