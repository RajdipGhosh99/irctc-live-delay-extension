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
      '.train-list-card',
      '[class*="trainCard"]',
      '[class*="trainList"]',
      '.srp-card',
      'div[class*="train-details"]',
    ],
    titleSelectors: [
      '.train-name',
      '.boldFont',
      'h3',
      'h4',
      '[class*="name"]',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '.journey-date', '[class*="date"]'],
    badgeAnchorSelectors: [
      '.train-name',
      '.boldFont',
      'h3',
      'h4',
    ],
    insertStrategy: 'after',
  },
  styling: {
    customCssClass: 'vendor-goibibo',
    extraBadgeWrapperClass: 'vendor-goibibo',
  },
};
