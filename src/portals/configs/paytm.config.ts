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
      'div.b6HHQ',
      'div[class*="b6HHQ"]',
      'div._2q7r',
      'div._3_8g',
      'div[class*="train-item"]',
      'div[class*="trainCard"]',
      'div[class*="TrainCard"]',
      'div[class*="_3-train"]',
      'div[class*="_2q7r"]',
    ],
    titleSelectors: [
      'div.k9j0o',
      'div[class*="k9j0o"]',
      'div.MNRXF',
      'div[class*="MNRXF"]',
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
      'div.k9j0o',
      'div[class*="k9j0o"]',
      'div.MNRXF',
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
    getLiveUrl: (src, dest, date, srcCity, destCity) =>
      `https://tickets.paytm.com/trains/searchTrains?srccode=${encodeURIComponent(src || 'NDLS')}&srcname=${encodeURIComponent(srcCity || 'New Delhi')}&dstcode=${encodeURIComponent(dest || 'CNB')}&dstname=${encodeURIComponent(destCity || 'Kanpur Central')}&date=${date.yyyymmdd}`,
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
