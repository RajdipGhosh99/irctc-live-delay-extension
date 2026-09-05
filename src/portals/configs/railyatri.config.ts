/**
 * RailYatri Vendor Configuration
 * Selectors, script checks, container rules, and styling for RailYatri.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { VendorPortalConfig } from './types';

export const railYatriConfig: VendorPortalConfig = {
  id: 'railyatri',
  name: 'RailYatri',
  domains: ['railyatri.in'],
  detection: {
    scriptSignatures: ['railyatri'],
    containerSelectors: ['#root', 'main', '.train-container', 'body'],
    cssSignatures: ['railyatri'],
  },
  selectors: {
    cardSelectors: [
      'div[class*="train-block"]',
      'div[class*="train_details"]',
      '[class*="trainCard"]',
      'div.train-item',
      '.train-info',
    ],
    titleSelectors: [
      '.train-name',
      'h3',
      'h4',
      '[class*="name"]',
      'a',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '.journey-date', '[class*="date"]'],
    badgeAnchorSelectors: [
      '.train-name',
      'h3',
      'h4',
      '[class*="name"]',
    ],
    insertStrategy: 'after',
  },
  styling: {
    customCssClass: 'vendor-railyatri',
    extraBadgeWrapperClass: 'vendor-railyatri',
  },
};
