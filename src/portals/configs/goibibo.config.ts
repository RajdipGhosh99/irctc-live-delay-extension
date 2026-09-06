/**
 * Goibibo Vendor Configuration
 * Selectors, script checks, container rules, and styling for Goibibo.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { VendorPortalConfig } from './types';

export const goibiboConfig: VendorPortalConfig = {
  id: 'goibibo',
  name: 'Goibibo',
  domains: ['goibibo.com'],
  detection: {
    scriptSignatures: ['goibibo'],
    containerSelectors: ['#root', 'main', '.train-container', 'body'],
    cssSignatures: ['goibibo'],
  },
  selectors: {
    cardSelectors: [
      'tr:has(p.font18)',
      'tbody tr',
      'table tr',
      '.train-list-card',
      '[class*="trainCard"]',
      '[class*="trainList"]',
      '.srp-card',
      'div[class*="train-details"]',
    ],
    titleSelectors: [
      'p.font18',
      'p[class*="blueText"]',
      '.train-name',
      '.boldFont',
      'h3',
      'h4',
      '[class*="name"]',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '.journey-date', '[class*="date"]'],
    badgeAnchorSelectors: [
      'p.font18',
      'p[class*="blueText"]',
      '.train-name',
      '.boldFont',
      'h3',
      'h4',
    ],
    insertStrategy: 'after',
  },
  route: {
    mockPath: '/goibibo',
    getLiveUrl: (_src, _dest, _date, srcCity, destCity) => {
      const s = (srcCity || 'New Delhi').toLowerCase().replace(/\s+/g, '-');
      const d = (destCity || 'Kanpur').toLowerCase().replace(/\s+/g, '-');
      return `https://www.goibibo.com/trains/${s}-to-${d}-trains/`;
    },
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
    customCssClass: 'vendor-goibibo',
    extraBadgeWrapperClass: 'vendor-goibibo',
  },
};
