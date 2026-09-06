/**
 * Paytm Vendor Configuration
 * Selectors, script checks, container rules, and styling for Paytm Trains.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { VendorPortalConfig } from './types';

export const paytmConfig: VendorPortalConfig = {
  id: 'paytm',
  name: 'Paytm Trains',
  domains: ['paytm.com'],
  detection: {
    scriptSignatures: ['paytm', 'react'],
    containerSelectors: ['#app', '#react-root', 'main', '.train-container', 'body'],
    cssSignatures: ['paytm'],
  },
  selectors: {
    cardSelectors: [
      'div._2q7r',
      'div._3_8g',
      'div[class*="train-item"]',
      'div[class*="trainCard"]',
      'div[class*="TrainCard"]',
      'div[class*="_3-train"]',
      'div[class*="_2q7r"]',
    ],
    titleSelectors: [
      'div._1Xv1',
      'div[class*="_1Xv1"]',
      'div[class*="train-name"]',
      'div[class*="name"]',
      'h3',
      'h4',
      'div._3w7K',
      'span',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '.journey-date', '[class*="date"]'],
    badgeAnchorSelectors: [
      'div._1Xv1',
      'div[class*="_1Xv1"]',
      'div[class*="train-name"]',
      'div[class*="name"]',
      'h3',
      'div._3w7K',
    ],
    insertStrategy: 'after',
  },
  route: {
    mockPath: '/paytm',
    getLiveUrl: (src, dest, date) =>
      `https://tickets.paytm.com/trains/search/${encodeURIComponent(src)}/${encodeURIComponent(dest)}/${date.yyyymmdd}/1`,
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
    customCssClass: 'vendor-paytm',
    extraBadgeWrapperClass: 'vendor-paytm',
  },
};
