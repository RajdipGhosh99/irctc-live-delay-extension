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
      'li:has(a[href*="/railways/train-coach/"])',
      'div:has(> a[href*="/railways/train-coach/"])',
      '.train-card-wrap',
      '.train-box',
      '[class*="trainCard"]',
      '.listing-card',
      'div[class*="train-details"]',
    ],
    titleSelectors: [
      'a[href*="/railways/train-coach/"]',
      '.train-name',
      'h2.bs-pra',
      'h3',
      'h4',
      '[class*="name"]',
      'span',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '.journey-date', '[class*="date"]'],
    badgeAnchorSelectors: [
      'a[href*="/railways/train-coach/"]',
      '.train-name',
      'h2.bs-pra',
      'h3',
      'h4',
      '[class*="name"]',
    ],
    insertStrategy: 'after',
  },
  route: {
    mockPath: '/easemytrip',
    getLiveUrl: (_src, _dest, _date, srcCity, destCity) => {
      const s = (srcCity || 'Delhi').toLowerCase().replace(/\s+/g, '-');
      const d = (destCity || 'Kanpur').toLowerCase().replace(/\s+/g, '-');
      return `https://www.easemytrip.com/railways/${s}-to-${d}-train-distance/`;
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
    customCssClass: 'vendor-easemytrip',
    extraBadgeWrapperClass: 'vendor-easemytrip',
  },
};
