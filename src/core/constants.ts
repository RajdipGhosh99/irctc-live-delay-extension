/**
 * Core Constants & Configuration for Live Train Delay Tracker
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BadgePosition, MultiProviderSettings, ProviderId, ProviderMetadata } from './types';

export const STORAGE_KEYS = {
  SETTINGS: 'rail_delay_tracker_settings',
  LEGACY_SETTINGS: 'irctc_delay_multi_settings',
  DISMISSED_TABS: 'rail_hud_dismissed_tabs',
  MINIMIZED_TABS: 'rail_hud_minimized_tabs',
  CACHE_PREFIX: 'rail_cache_',
  LEGACY_CACHE_PREFIX: 'irctc_cache_',
} as const;

export const DEFAULT_SITE_POSITIONS: Record<string, BadgePosition> = {
  'confirmtkt.com': 'beside-name',
  'makemytrip.com': 'beside-name',
  'irctc.co.in': 'beside-name',
  'cleartrip.com': 'beside-name',
  'ixigo.com': 'beside-name',
  'goibibo.com': 'beside-name',
  'paytm.com': 'beside-name',
  'easemytrip.com': 'beside-name',
  'railyatri.in': 'beside-name',
};

export const PROVIDER_METADATA_MAP: Record<ProviderId, ProviderMetadata> = {
  'direct-rail-gateway': {
    id: 'direct-rail-gateway',
    name: 'National Rail Network (Direct - Free)',
    description: 'Direct live public running tracking (100% Free, Zero API Keys, Unlimited).',
    freeTierLimit: '100% Free & Unlimited',
    perTokenQuota: 999999,
    signupUrl: 'https://enquiry.indianrail.gov.in/',
    requiresKey: false,
    defaultEndpoint: 'https://www.irctc.co.in/eticketing/protected/mapps1/ntesData',
    isoStandardCompliant: true,
  },
  'rapidapi-rail-v1': {
    id: 'rapidapi-rail-v1',
    name: 'RapidAPI Rail Engine 1',
    description: 'High-speed secondary live running gateway hosted on RapidAPI.',
    freeTierLimit: '500 requests/month free per token',
    perTokenQuota: 500,
    signupUrl: 'https://rapidapi.com/IRCTCAPI/api/irctc1',
    requiresKey: true,
    defaultHost: 'irctc1.p.rapidapi.com',
    defaultEndpoint: 'https://irctc1.p.rapidapi.com/api/v1/liveTrainStatus',
    isoStandardCompliant: true,
  },
  'rapidapi-rail-v2': {
    id: 'rapidapi-rail-v2',
    name: 'RapidAPI Rail Engine 2',
    description: 'Alternative RapidAPI gateway for failover redundancy.',
    freeTierLimit: '500 requests/month free per token',
    perTokenQuota: 500,
    signupUrl: 'https://rapidapi.com/ratishjain12/api/indian-railway-irctc',
    requiresKey: true,
    defaultHost: 'indian-railway-irctc.p.rapidapi.com',
    defaultEndpoint: 'https://indian-railway-irctc.p.rapidapi.com/api/v1/liveTrainStatus',
    isoStandardCompliant: true,
  },
  'indianrailapi': {
    id: 'indianrailapi',
    name: 'IndianRail Gateway (Direct Key)',
    description: 'Dedicated Indian Railways API provider with direct daily quota.',
    freeTierLimit: '250 calls/day free per token',
    perTokenQuota: 250,
    signupUrl: 'https://indianrailapi.com/',
    requiresKey: true,
    defaultEndpoint: 'https://indianrailapi.com/api/v2/LiveTrainStatus/apikey',
    isoStandardCompliant: true,
  },
  'custom-webhook': {
    id: 'custom-webhook',
    name: 'Custom Webhook Gateway',
    description: 'User-configured custom endpoint or self-hosted API gateway.',
    freeTierLimit: 'Custom self-hosted',
    perTokenQuota: 999999,
    signupUrl: '',
    requiresKey: false,
    isoStandardCompliant: true,
  },
};

export const DEFAULT_SETTINGS: MultiProviderSettings = {
  extensionEnabled: true,
  disabledSites: [],
  sitePositions: DEFAULT_SITE_POSITIONS,
  activeProvider: 'direct-rail-gateway',
  autoFailover: true,
  fetchOnHover: false,
  autoFetchAllTrains: false,
  cacheTtlMinutes: 0, // Default: No cache (Always Live Fetch)
  maxCacheSizeMb: 50, // Max cache size: 50 MB
  showFloatingHUD: true,
  termsAccepted: false, // Requires user acceptance on first run
  schemaVersion: '2.0.0',
  providers: {
    'direct-rail-gateway': {
      enabled: true,
      keys: [],
    },
    'rapidapi-rail-v1': {
      enabled: true,
      keys: [],
    },
    'rapidapi-rail-v2': {
      enabled: true,
      keys: [],
    },
    'indianrailapi': {
      enabled: true,
      keys: [],
    },
    'custom-webhook': {
      enabled: false,
      keys: [],
    },
  },
};
