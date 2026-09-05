/**
 * MakeMyTrip Vendor Configuration
 * Selectors, script checks, container rules, and styling for MakeMyTrip.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { VendorPortalConfig } from './types';

export const makeMyTripConfig: VendorPortalConfig = {
  id: 'makemytrip',
  name: 'MakeMyTrip',
  domains: ['makemytrip.com'],
  detection: {
    scriptSignatures: ['makemytrip', 'mmt', 'react'],
    containerSelectors: ['#root', '#react-root', '.train-listing', 'body'],
    cssSignatures: ['makemytrip', 'mmt'],
  },
  selectors: {
    cardSelectors: [
      'div.train-list-item',
      '[class*="trainCard"]',
      '[class*="trainList"]',
      '.single-train-detail',
      '[class*="railway-card"]',
    ],
    titleSelectors: [
      '.train-name',
      '.boldFont',
      'h3',
      '[class*="name"]',
      'span.train-name',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '.journey-date', '[class*="travelDate"]'],
    badgeAnchorSelectors: [
      '.train-name',
      '.boldFont',
      'h3',
      '[class*="name"]',
    ],
    insertStrategy: 'after',
  },
  styling: {
    customCssClass: 'vendor-makemytrip',
    extraBadgeWrapperClass: 'vendor-makemytrip',
  },
};
