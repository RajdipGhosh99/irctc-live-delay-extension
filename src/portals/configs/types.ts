/**
 * Vendor Portal Configuration Types
 * Defines the contract for vendor-specific DOM selectors, script checks, container rules, and styling.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

export type BadgeInsertStrategy = 'after' | 'before' | 'append' | 'prepend' | 'custom';

export interface FormattedDateValues {
  iso: string; // YYYY-MM-DD
  yyyymmdd: string; // YYYYMMDD
  dd_mm_yyyy: string; // DD-MM-YYYY
  ddMmYyyySlash: string; // DD/MM/YYYY
}

export interface VendorRouteConfig {
  /** Mock server route path (e.g. '/makemytrip') */
  mockPath: string;
  /** Live portal URL generator given source, destination, and formatted date */
  getLiveUrl: (
    src: string,
    dest: string,
    date: FormattedDateValues,
    srcCity?: string,
    destCity?: string
  ) => string;
}

export interface VendorBadgeConfig {
  /** Preferred badge positioning beside title */
  preferredPosition: 'beside-name' | 'after-card' | 'inline';
  /** Max allowable vertical offset delta in pixels for strict alignment */
  maxDeltaYPx: number;
}

export interface VendorPopupConfig {
  /** Popover layout variant */
  styleVariant?: 'standard' | 'compact';
  /** Whether mouse hover automatically triggers the popover */
  hoverEnabled: boolean;
  /** Whether click toggles the popover */
  clickEnabled: boolean;
  /** Whether double-click forces a cache-busting live refresh */
  doubleClickRefresh: boolean;
}

export interface GlobalStationRouteConfig {
  sourceCode: string;
  sourceCity: string;
  destCode: string;
  destCity: string;
  journeyDateIso: string;
}

export interface VendorPortalConfig {
  /** Unique vendor identifier (e.g., 'confirmtkt', 'irctc') */
  id: string;

  /** Human-readable vendor name */
  name: string;

  /** List of domains/hostnames to match */
  domains: string[];

  /** Live and mock route generation rules (single source of truth) */
  route?: VendorRouteConfig;

  /** Provider-specific badge placement expectations */
  badge?: VendorBadgeConfig;

  /** Provider-specific popover interaction rules */
  popup?: VendorPopupConfig;

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
