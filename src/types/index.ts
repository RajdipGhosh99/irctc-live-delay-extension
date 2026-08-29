/**
 * Type definitions for Multi-Provider Universal Train Delay Tracker
 * Compliant with ISO 8601 (Dates & Times), ISO/IEC 25010 (Software Quality),
 * ISO/IEC 27001 (Security & Privacy), and ISO 9241-171 (Accessibility).
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { IsoStandardError, IsoErrorCode } from '../utils/iso-utils';

export type { IsoStandardError };
export { IsoErrorCode };

export type ProviderId = 'irctc-official' | 'rapidapi-irctc1' | 'rapidapi-indianrail' | 'indianrailapi' | 'custom';

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
  cacheTtlMinutes: number;
  showFloatingHUD: boolean;
  providers: Record<ProviderId, ProviderConfig>;
  schemaVersion: '1.5.0-iso';
}

export interface TrainDelayData {
  trainNumber: string;
  trainName?: string;
  delayMinutes: number;
  delayHhMm?: string;               // e.g. "+01:21"
  todayDelayMinutes?: number;       // Today's live delay minutes
  todayDelayHhMm?: string;          // Today's live delay in HH:MM (e.g. "+01:21")
  avgDelayTodayMinutes?: number;    // Average delay across today's halts
  avgDelayTodayHhMm?: string;       // Average delay today in HH:MM (e.g. "+00:45")
  avgDelayMonthMinutes?: number;    // Average delay over past 30 days / this month
  avgDelayMonthHhMm?: string;       // Average monthly delay in HH:MM (e.g. "+01:10")
  monthlyPunctualityPct?: number;   // On-time percentage this month (e.g. 84%)
  isOnTime: boolean;
  currentStationName?: string;
  currentStationCode?: string;
  nextStationName?: string;
  lastUpdated: string;
  fetchedTimestamp?: number;
  isoTimestamp: string;
  isoDate: string;
  statusSummary: string;
  source: 'cache' | 'network';
  providerName?: string;
  keyLabel?: string;
}

export interface FetchTrainDelayPayload {
  trainNumber: string;
  forceRefresh?: boolean;
  travelDate?: string;
  providerOverride?: ProviderId;
}

export type ExtensionMessage =
  | { type: 'FETCH_TRAIN_DELAY'; payload: FetchTrainDelayPayload }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; payload: Partial<MultiProviderSettings> }
  | { type: 'ADD_PROVIDER_KEY'; payload: { providerId: ProviderId; key: string; label?: string; status?: 'active' | 'invalid' } }
  | { type: 'REMOVE_PROVIDER_KEY'; payload: { providerId: ProviderId; keyId: string } }
  | { type: 'TOGGLE_EXTENSION'; payload: { enabled: boolean } }
  | { type: 'TOGGLE_SITE'; payload: { hostname: string; enabled: boolean } }
  | { type: 'UPDATE_SITE_POSITION'; payload: { hostname: string; position: BadgePosition } }
  | { type: 'TEST_PROVIDER'; payload: { providerId: ProviderId; keyToTest?: string } }
  | { type: 'CLEAR_CACHE' }
  | { type: 'GET_CACHE_STATS' }
  | { type: 'OPEN_OPTIONS_PAGE' };

export interface DelayResponseSuccess {
  success: true;
  data: TrainDelayData;
  providerUsed: string;
  isoTimestamp: string;
}

export interface DelayResponseError {
  success: false;
  error: string;
  isoError?: IsoStandardError;
  requiresApiKey?: boolean;
  attemptedProviders?: string[];
}

export type DelayResponse = DelayResponseSuccess | DelayResponseError;

export interface CacheRecord {
  data: TrainDelayData;
  timestamp: number;
  isoTimestamp: string;
  expiresAt: number;
  expiresAtIso: string;
}
