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
      '[data-testid="listing-card"]',
      'div[class*="ListingCard_ListingCard"]',
      'div[class*="SecondarySupplyListingCard_secondarySupplyListingCard"]',
      'div.train-list-item',
      '[class*="trainCard"]',
      '.single-train-detail',
      '[class*="railway-card"]',
    ],
    titleSelectors: [
      '[data-testid="train-name"]',
      '[class*="ListingCard_listName"]',
      '[class*="listName"]',
      '[data-testid="listing-train-number"]',
      '[class*="trainNumText"]',
      '.train-name',
      '[class*="train-name"]',
      '[class*="trainName"]',
      '[data-testid*="train-name"]',
      '.train-name-wrap',
      '.train-heading',
      'h3',
      'h4',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno', 'data-testid'],
    dateSelectors: ['[data-date]', '.journey-date', '[class*="travelDate"]'],
    badgeAnchorSelectors: [
      '[data-testid="train-name"]',
      '[class*="ListingCard_listName"]',
      '[class*="listName"]',
      '.train-name',
      '[class*="train-name"]',
      '[class*="trainName"]',
      '[data-testid*="train-name"]',
      '.train-name-wrap',
      '.train-heading',
    ],
    insertStrategy: 'after',
  },
  styling: {
    customCssClass: 'vendor-makemytrip',
    extraBadgeWrapperClass: 'vendor-makemytrip',
  },
};
