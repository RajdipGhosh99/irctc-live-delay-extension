/**
 * IRCTC Vendor Configuration
 * Selectors, script checks, container rules, and styling for official IRCTC portal.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { VendorPortalConfig } from './types';

export const irctcConfig: VendorPortalConfig = {
  id: 'irctc',
  name: 'IRCTC NextGen',
  domains: ['irctc.co.in'],
  detection: {
    scriptSignatures: ['irctc', 'ng-version', 'angular'],
    containerSelectors: ['app-train-list', '.train-list', '.form-group', 'app-root', 'body'],
    cssSignatures: ['irctc', 'bull-back'],
  },
  selectors: {
    cardSelectors: [
      'app-train-item',
      '.train-heading',
      '.bull-back',
      'div.form-group.no-pad.col-xs-12',
      'div[class*="train-card"]',
      'div.train-details',
    ],
    titleSelectors: [
      '.train-heading strong',
      '.train-heading',
      'h4',
      'span.pull-left',
      'span',
    ],
    trainNumberAttributes: ['id', 'data-train-number', 'data-trainno'],
    dateSelectors: ['[data-date]', '.journey-date', 'input[placeholder*="Date"]', '.ui-calendar'],
    badgeAnchorSelectors: [
      '.train-heading strong',
      '.train-heading',
      'h4',
      'span.pull-left',
    ],
    insertStrategy: 'after',
  },
  styling: {
    customCssClass: 'vendor-irctc',
    extraBadgeWrapperClass: 'vendor-irctc',
  },
};
