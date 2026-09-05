/**
 * EaseMyTrip Vendor Configuration
 * Selectors, script checks, container rules, and styling for EaseMyTrip.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { VendorPortalConfig } from './types';

export const easeMyTripConfig: VendorPortalConfig = {
  id: 'easemytrip',
  name: 'EaseMyTrip',
  domains: ['easemytrip.com'],
  detection: {
    scriptSignatures: ['easemytrip'],
    containerSelectors: ['#root', 'main', '.train-container', 'body'],
    cssSignatures: ['easemytrip'],
  },
  selectors: {
    cardSelectors: [
      '.train-card-wrap',
      '.train-box',
      '[class*="trainCard"]',
      '.listing-card',
      'div[class*="train-details"]',
    ],
    titleSelectors: [
      '.train-name',
      'h3',
      'h4',
      '[class*="name"]',
      'span',
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
    customCssClass: 'vendor-easemytrip',
    extraBadgeWrapperClass: 'vendor-easemytrip',
  },
};
