/**
 * Brand-Neutral Domain Models and Type Definitions for Live Train Delay Tracker
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

export type ProviderId =
  | 'direct-rail-gateway'
  | 'rapidapi-rail-v1'
  | 'rapidapi-rail-v2'
  | 'indianrailapi'
  | 'custom-webhook';

// Legacy provider ID alias support for seamless migration
export type LegacyProviderId =
  | 'irctc-official'
  | 'rapidapi-irctc1'
  | 'rapidapi-indianrail'
  | 'indianrailapi'
  | 'custom';

export type BadgePosition = 'beside-name' | 'card-header-right' | 'below-name';

export interface ProviderMetadata {
  id: ProviderId;
  name: string;
  description: string;
  freeTierLimit: string;
  perTokenQuota: number;
  signupUrl: string;
  requiresKey: boolean;
  defaultHost?: string;
  defaultEndpoint?: string;
  isoStandardCompliant: boolean;
}

export interface ApiKeyItem {
  id: string;
  key: string;
  label?: string;
  status: 'active' | 'rate-limited' | 'invalid';
  requestCount: number;
  lastUsed?: number;
  lastUsedIso?: string;
  lastError?: string;
  rateLimitedUntil?: number;
  rateLimitedUntilIso?: string;
}

export interface ProviderConfig {
  enabled: boolean;
  keys: ApiKeyItem[];
  apiKey?: string;
  apiHost?: string;
  apiEndpoint?: string;
}

export interface MultiProviderSettings {
  extensionEnabled: boolean;
  disabledSites: string[];
  sitePositions?: Record<string, BadgePosition>;
  activeProvider: ProviderId;
  autoFailover: boolean;
  fetchOnHover: boolean;
  autoFetchAllTrains?: boolean;
  cacheTtlMinutes: number;
  maxCacheSizeMb?: number;
  showFloatingHUD: boolean;
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  schemaVersion: string;
  providers: Record<ProviderId, ProviderConfig>;
}

export interface TrainStationHalt {
  stationCode: string;
  stationName: string;
  distanceKm?: number;
  dayCount?: number;
  scheduleArrival?: string;
  actualArrival?: string;
  scheduleDeparture?: string;
  actualDeparture?: string;
  delayInArrivalMinutes?: number;
  delayInDepartureMinutes?: number;
  hasArrived: boolean;
  hasDeparted: boolean;
  platformNumber?: string;
}

export interface TrainDelayData {
  trainNumber: string;
  trainName?: string;
  delayMinutes: number;
  isOnTime: boolean;
  statusSummary: string;
  currentStationName?: string;
  currentStationCode?: string;
  nextStationName?: string;
  nextStationCode?: string;
  lastUpdated: number;
  lastUpdatedIso?: string;
  provider: ProviderId;
  confidenceScore?: number;
  activeTokenIndex?: number;
  sourceStation?: string;
  destinationStation?: string;
  journeyProgressPercent?: number;
  stationList?: TrainStationHalt[];
  delayHistory?: {
    todayAvgDelayMinutes: number;
    monthAvgDelayMinutes: number;
    punctualityRatePercent: number;
    historicalRunsAnalyzed: number;
  };
}

export interface CacheEntry {
  data: TrainDelayData;
  cachedAt: number;
  cachedAtIso?: string;
  expiresAt: number;
  expiresAtIso?: string;
  trainNumber: string;
  sizeBytes?: number;
}

export type ExtensionMessage =
  | { type: 'FETCH_DELAY'; trainNumber: string; providerId?: ProviderId; forceRefresh?: boolean; travelDate?: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: MultiProviderSettings }
  | { type: 'CLEAR_CACHE' }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'TEST_KEY'; providerId: ProviderId; apiKey: string; apiHost?: string }
  | { type: 'GET_CACHE_STATS' };

export interface InjectedWidget {
  trainNumber: string;
  travelDate?: string;
  wrapper: HTMLElement;
  badge: HTMLElement;
  popover?: HTMLElement;
  state: 'idle' | 'loading' | 'on-time' | 'delayed' | 'error' | 'no-key';
  lastFetched?: number;
}
