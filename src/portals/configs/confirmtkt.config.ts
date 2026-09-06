/**
 * ConfirmTkt Vendor Configuration
 * Selectors, script checks, container rules, and styling for ConfirmTkt.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { VendorPortalConfig } from './types';

export const confirmTktConfig: VendorPortalConfig = {
  id: 'confirmtkt',
  name: 'ConfirmTkt',
  domains: ['confirmtkt.com'],
  detection: {
    scriptSignatures: ['confirmtkt', '__NEXT_DATA__', 'cdn.confirmtkt.com'],
    containerSelectors: ['#app', '#__next', 'main', '.train-list', '.root-container', 'body'],
    cssSignatures: ['confirmtkt', 'ct-'],
  },
  selectors: {
    cardSelectors: [
      // Exclude #train-card-list (the wrapper) so only individual train cards are returned
      '[id^="train-"]:not(#train-card-list)',
      '.border-b.border-tertiary',
    ],
    titleSelectors: [
      '.truncate',
      '[class*="train-name"]',
      '.body-sm',
      'h2',
      'h3',
      'h4',
      'p.route-link-element-desktop',
      'a[href*="/train-schedule/"]',
      'a[href*="/train-seat-availability/"]',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '[class*="date"]', '.journey-date', 'input[name="date"]'],
    badgeAnchorSelectors: [
      '.truncate',
      '[class*="max-w-"]',
      '.body-sm',
      '[class*="train-name"]',
      'p.route-link-element-desktop',
      'h2',
      'h3',
      'h4',
    ],
    insertStrategy: 'after',
  },
  route: {
    mockPath: '/confirmtkt',
    getLiveUrl: (src, dest, date) =>
      `https://www.confirmtkt.com/rbooking/trains/from/${encodeURIComponent(src)}/to/${encodeURIComponent(dest)}/${date.dd_mm_yyyy}`,
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
    customCssClass: 'vendor-confirmtkt',
    extraBadgeWrapperClass: 'vendor-confirmtkt',
  },
};
