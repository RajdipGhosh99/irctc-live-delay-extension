/**
 * Vendor Portal Configuration Types
 * Defines the contract for vendor-specific DOM selectors, script checks, container rules, and styling.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

export type BadgeInsertStrategy = 'after' | 'before' | 'append' | 'prepend' | 'custom';

export interface VendorPortalConfig {
  /** Unique vendor identifier (e.g., 'confirmtkt', 'irctc') */
  id: string;

  /** Human-readable vendor name */
  name: string;

  /** List of domains/hostnames to match */
  domains: string[];

  /** Vendor detection strategies (scripts, global markers, container elements) */
  detection: {
    /** Script sources, global variable names, or inline script snippets to identify the vendor/framework */
    scriptSignatures?: string[];
    /** Top-level application containers to search within or observe for mutations */
    containerSelectors: string[];
    /** Top-level CSS classes or body attributes confirming the portal */
    cssSignatures?: string[];
  };

  /** Specific DOM selectors for locating cards, titles, dates, and badge anchors */
  selectors: {
    /** Selectors to find train card container elements */
    cardSelectors: string[];
    /** Selectors within a card to find the train number/name */
    titleSelectors: string[];
    /** Card attributes that may store train numbers directly */
    trainNumberAttributes?: string[];
    /** Selectors within a card or page to locate travel dates */
    dateSelectors?: string[];
    /** Element inside the card beside which the badge should be placed */
    badgeAnchorSelectors: string[];
    /** Placement strategy relative to the badge anchor */
    insertStrategy: BadgeInsertStrategy;
  };

  /** Vendor-specific styling and layout tweaks */
  styling: {
    /** Vendor CSS class added to the badge wrapper and floating HUD */
    customCssClass: string;
    /** Extra wrapper classes */
    extraBadgeWrapperClass?: string;
  };
}
