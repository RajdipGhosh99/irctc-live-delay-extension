/**
 * Ixigo Vendor Configuration
 * Selectors, script checks, container rules, and styling for Ixigo.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { VendorPortalConfig } from './types';

export const ixigoConfig: VendorPortalConfig = {
  id: 'ixigo',
  name: 'Ixigo',
  domains: ['ixigo.com'],
  detection: {
    scriptSignatures: ['ixigo', 'ixi'],
    containerSelectors: ['.train-listing', '#content', 'main', 'body'],
    cssSignatures: ['ixigo', 'ixi'],
  },
  selectors: {
    cardSelectors: [
      'div.pt-15.px-15.pb-0',
      'div[class*="rounded-10"]',
      'div[class*="pt-15"]',
      '.c-train-list-item',
      'div.org-train-list-item',
      'div.train-item',
      '[data-testid*="train-card"]',
      '[class*="trainCard"]',
      '[class*="trainItem"]',
    ],
    titleSelectors: [
      'div.body-sm',
      '[class*="body-sm"]',
      '[class*="truncate"]',
      '.train-name',
      '.train-number',
      'h3',
      'h4',
      'a[href*="/trains/"]',
      '.u-text-ellipsis',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '.journey-date', '[class*="date"]'],
    badgeAnchorSelectors: [
      'div.body-sm',
      '[class*="body-sm"]',
      '.train-name',
      '.train-number',
      'h3',
      'h4',
      'a[href*="/trains/"]',
    ],
    insertStrategy: 'after',
  },
  route: {
    mockPath: '/ixigo',
    getLiveUrl: (src, dest, date) =>
      `https://www.ixigo.com/trains/search-pwa/from/${encodeURIComponent(src || 'NDLS')}/to/${encodeURIComponent(dest || 'CNB')}/${date.dd_mm_yyyy}`,
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
    customCssClass: 'vendor-ixigo',
    extraBadgeWrapperClass: 'vendor-ixigo',
  },
};
