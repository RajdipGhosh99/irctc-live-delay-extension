import { ProviderId, ProviderMetadata, MultiProviderSettings, TrainDelayData, ProviderConfig, ApiKeyItem, BadgePosition } from '../types';
import { IRCTC_OFFICIAL_METADATA, fetchIrctcOfficialStatus } from './irctc-official';
import { IRCTC1_METADATA, fetchIrctc1Status } from './irctc1';
import { INDIAN_RAIL_METADATA, fetchIndianRailStatus } from './indianrail';
import { INDIAN_RAIL_API_METADATA, fetchIndianRailApiStatus } from './indianrailapi';
import { CUSTOM_PROVIDER_METADATA, fetchCustomProviderStatus } from './custom';
import {
  normalizeProviderConfig,
  getUsableKeys,
  markKeySuccess,
  markKeyRateLimited,
  markKeyInvalid,
} from './key-pool';
import { CircuitBreaker } from '../iso-utils';

export {
  normalizeProviderConfig,
  getUsableKeys,
  addKeyToPool,
  removeKeyFromPool,
  markKeySuccess,
  markKeyRateLimited,
  markKeyInvalid,
} from './key-pool';

export const PROVIDER_CATALOG: Record<ProviderId, ProviderMetadata> = {
  'irctc-official': IRCTC_OFFICIAL_METADATA,
  'rapidapi-irctc1': IRCTC1_METADATA,
  'rapidapi-indianrail': INDIAN_RAIL_METADATA,
  'indianrailapi': INDIAN_RAIL_API_METADATA,
  'custom': CUSTOM_PROVIDER_METADATA,
};

export const DEFAULT_SITE_POSITIONS: Record<string, BadgePosition> = {
  'makemytrip.com': 'beside-name',
  'confirmtkt.com': 'beside-name',
  'irctc.co.in': 'beside-name',
  'cleartrip.com': 'beside-name',
  'ixigo.com': 'beside-name',
  'goibibo.com': 'beside-name',
  'paytm.com': 'beside-name',
  'easemytrip.com': 'beside-name',
  'railyatri.in': 'beside-name',
};

export const DEFAULT_SETTINGS: MultiProviderSettings = {
  extensionEnabled: true,
  disabledSites: [],
  sitePositions: DEFAULT_SITE_POSITIONS,
  activeProvider: 'irctc-official',
  autoFailover: true,
  fetchOnHover: false,
  autoFetchAllTrains: false,
  cacheTtlMinutes: 15,
  maxCacheSizeMb: 150,
  showFloatingHUD: true,
  schemaVersion: '1.5.0-iso',
  providers: {
    'irctc-official': {
      enabled: true,
      keys: [],
      apiEndpoint: IRCTC_OFFICIAL_METADATA.defaultEndpoint,
    },
    'rapidapi-irctc1': {
      enabled: true,
      keys: [],
      apiHost: IRCTC1_METADATA.defaultHost,
      apiEndpoint: IRCTC1_METADATA.defaultEndpoint,
    },
    'rapidapi-indianrail': {
      enabled: true,
      keys: [],
      apiHost: INDIAN_RAIL_METADATA.defaultHost,
      apiEndpoint: INDIAN_RAIL_METADATA.defaultEndpoint,
    },
    'indianrailapi': {
      enabled: true,
      keys: [],
      apiEndpoint: INDIAN_RAIL_API_METADATA.defaultEndpoint,
    },
    'custom': {
      enabled: false,
      keys: [],
      apiEndpoint: CUSTOM_PROVIDER_METADATA.defaultEndpoint,
    },
  },
};

// Circuit breakers for graceful degradation across providers
const circuitBreakers: Record<ProviderId, CircuitBreaker> = {
  'irctc-official': new CircuitBreaker(4, 60000), // 1 min cooldown if blocked
  'rapidapi-irctc1': new CircuitBreaker(3, 180000),
  'rapidapi-indianrail': new CircuitBreaker(3, 180000),
  'indianrailapi': new CircuitBreaker(3, 180000),
  'custom': new CircuitBreaker(3, 60000),
};

/**
 * Checks if a given provider has at least one usable key in its pool
 */
export function isProviderConfigured(providerId: ProviderId, settings: MultiProviderSettings): boolean {
  const config = settings.providers[providerId];
  if (!config || !config.enabled) return false;
  if (!PROVIDER_CATALOG[providerId]?.requiresKey) return true;
  if (providerId === 'custom') return Boolean(config.apiEndpoint);
  const usable = getUsableKeys(config);
  return usable.length > 0;
}

/**
 * Executes fetch with a specific provider and handles key rotation / rate-limit failover
 */
export async function fetchWithProvider(
  providerId: ProviderId,
  trainNumber: string,
  settings: MultiProviderSettings,
  travelDate?: string
): Promise<{ data: TrainDelayData; providerUsed: string }> {
  const config = settings.providers[providerId];
  if (!config) {
    throw new Error(`Provider "${providerId}" is not configured.`);
  }

  const meta = PROVIDER_CATALOG[providerId];
  const usableKeys = getUsableKeys(config);

  if (meta.requiresKey && usableKeys.length === 0) {
    throw new Error(`All API tokens for ${meta.name} are rate-limited or invalid. Please add another token.`);
  }

  const keysToTry: (ApiKeyItem | undefined)[] = meta.requiresKey ? usableKeys : [undefined];
  let lastError: Error | null = null;

  for (const keyItem of keysToTry) {
    const keyString = keyItem ? keyItem.key : '';

    try {
      console.log(`[MultiProvider] Dispatching live NTES query for train ${trainNumber} via "${meta.name}"...`);
      let result: TrainDelayData;

      switch (providerId) {
        case 'irctc-official':
          result = await fetchIrctcOfficialStatus(trainNumber, config, keyString, travelDate);
          break;
        case 'rapidapi-irctc1':
          result = await fetchIrctc1Status(trainNumber, config, keyString, travelDate);
          break;
        case 'rapidapi-indianrail':
          result = await fetchIndianRailStatus(trainNumber, config, keyString, travelDate);
          break;
        case 'indianrailapi':
          result = await fetchIndianRailApiStatus(trainNumber, config, keyString, travelDate);
          break;
        case 'custom':
          result = await fetchCustomProviderStatus(trainNumber, config, keyString, travelDate);
          break;
        default:
          throw new Error(`Unknown provider "${providerId}"`);
      }

      circuitBreakers[providerId]?.recordSuccess();

      if (keyItem) {
        markKeySuccess(config, keyItem.id);
        result.keyLabel = keyItem.label;
      }

      console.log(`[MultiProvider] ✅ NTES query succeeded for train ${trainNumber}:`, result.statusSummary);

      return {
        data: result,
        providerUsed: meta.name,
      };
    } catch (err: any) {
      circuitBreakers[providerId]?.recordFailure();
      const errorMsg = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(errorMsg);

      if (keyItem) {
        if (errorMsg.includes('RATE_LIMIT') || errorMsg.includes('quota') || errorMsg.includes('429')) {
          markKeyRateLimited(config, keyItem.id, errorMsg);
          console.warn(`[KeyPool] Token "${keyItem.label || keyItem.id}" hit quota limit. Switching to next key in pool...`);
          continue;
        } else if (errorMsg.includes('AUTH_ERROR') || errorMsg.includes('Invalid') || errorMsg.includes('401') || errorMsg.includes('403')) {
          markKeyInvalid(config, keyItem.id, errorMsg);
          console.warn(`[KeyPool] Token "${keyItem.label || keyItem.id}" rejected as invalid.`);
          continue;
        }
      }

      throw lastError;
    }
  }

  throw lastError || new Error(`All attempts exhausted for ${meta.name}`);
}

/**
 * Multi-Provider Fetch Orchestrator with Strict Priority Order:
 * 1. Official IRCTC (NTES Direct - Zero Keys)
 * 2. Configured Provider #1 (e.g. Primary Active Provider)
 * 3. Configured Provider #2 (e.g. Backup RapidAPI Pool)
 * 4. Configured Provider #3 (e.g. IndianRailAPI.com)
 * 5. Configured Provider #4 (e.g. Custom Proxy)
 */
export async function executeMultiProviderFetch(
  trainNumber: string,
  settings: MultiProviderSettings,
  travelDate?: string,
  providerOverride?: ProviderId,
  forceRefresh = false
): Promise<{ data: TrainDelayData; providerUsed: string }> {
  let targetProviders: ProviderId[];

  if (providerOverride) {
    targetProviders = [providerOverride];
  } else if (!settings.autoFailover) {
    const list: ProviderId[] = ['irctc-official', settings.activeProvider];
    targetProviders = Array.from(new Set(list));
  } else {
    const allProviders: ProviderId[] = ['rapidapi-irctc1', 'rapidapi-indianrail', 'indianrailapi', 'custom'];
    const active = settings.activeProvider;
    const remaining = allProviders.filter((p) => p !== active);

    const list: ProviderId[] = ['irctc-official', active, ...remaining];
    targetProviders = Array.from(new Set(list));
  }

  const errors: string[] = [];

  for (const pid of targetProviders) {
    const config = settings.providers[pid];
    if (!config || !config.enabled) continue;

    if (!forceRefresh && circuitBreakers[pid]?.isOpen()) {
      console.warn(`[MultiProvider] Skipping ${pid} (Circuit breaker open/cooling down)`);
      continue;
    }

    const usableKeys = getUsableKeys(config);
    if (PROVIDER_CATALOG[pid]?.requiresKey && usableKeys.length === 0) {
      continue;
    }

    try {
      return await fetchWithProvider(pid, trainNumber, settings, travelDate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${PROVIDER_CATALOG[pid]?.name || pid}: ${msg}`);
      console.warn(`[MultiProvider] ⚠️ ${PROVIDER_CATALOG[pid]?.name || pid} failed: ${msg}. Attempting next provider in chain...`);
    }
  }

  if (errors.length > 0) {
    const isQuota = errors.some((e) => e.includes('RATE_LIMIT') || e.includes('quota') || e.includes('429'));
    if (isQuota) {
      throw new Error('RapidAPI quota limit reached for your active token. Add another free token in Settings to increase pool capacity.');
    }
    throw new Error(`All configured providers failed:\n• ${errors.join('\n• ')}`);
  } else {
    throw new Error('No working providers available. Please add a free RapidAPI or IndianRailAPI token in Settings.');
  }
}
