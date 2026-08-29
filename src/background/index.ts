/**
 * Background Service Worker (Manifest V3) - ISO Enterprise Edition
 * Orchestrates multi-provider live queries, token pool rotations, and ISO 8601 cache TTLs.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import {
  ProviderId,
  MultiProviderSettings,
  TrainDelayData,
  DelayResponse,
  CacheRecord,
  ExtensionMessage,
  ProviderConfig,
  IsoErrorCode,
  IsoStandardError,
} from '../types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SITE_POSITIONS,
  PROVIDER_CATALOG,
  normalizeProviderConfig,
  executeMultiProviderFetch,
  fetchWithProvider,
  addKeyToPool,
  removeKeyFromPool,
} from '../providers';
import { getIso8601Timestamp, getIso8601Date, maskIsoCredential } from '../utils/iso-utils';

const STORAGE_KEY_SETTINGS = 'irctc_delay_multi_settings';
const STORAGE_KEY_CACHE_PREFIX = 'train_delay_cache_';

console.log('[Live Train Delay Tracker Background] Service Worker initialized. Ready for requests.');

// In-flight request coalescing map: cacheKey -> Promise<DelayResponse>
const inFlightRequests = new Map<string, Promise<DelayResponse>>();

/**
 * Retrieves multi-provider settings from storage
 */
async function getStoredSettings(): Promise<MultiProviderSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
    const saved = result[STORAGE_KEY_SETTINGS] as MultiProviderSettings | undefined;
    if (!saved) {
      return DEFAULT_SETTINGS;
    }

    const mergedProviders: Record<ProviderId, ProviderConfig> = {} as any;
    const providerIds: ProviderId[] = ['irctc-official', 'rapidapi-irctc1', 'rapidapi-indianrail', 'indianrailapi', 'custom'];

    providerIds.forEach((pid) => {
      const defaultConf = DEFAULT_SETTINGS.providers[pid];
      const savedConf = saved.providers ? saved.providers[pid] : undefined;
      mergedProviders[pid] = normalizeProviderConfig({
        ...defaultConf,
        ...(savedConf || {}),
        ...(pid === 'irctc-official' ? { enabled: true } : {}),
      });
    });

    return {
      extensionEnabled: saved.extensionEnabled !== undefined ? saved.extensionEnabled : DEFAULT_SETTINGS.extensionEnabled,
      disabledSites: saved.disabledSites || DEFAULT_SETTINGS.disabledSites,
      sitePositions: {
        ...DEFAULT_SITE_POSITIONS,
        ...(saved.sitePositions || {}),
      },
      activeProvider: saved.activeProvider || DEFAULT_SETTINGS.activeProvider,
      autoFailover: saved.autoFailover !== undefined ? saved.autoFailover : DEFAULT_SETTINGS.autoFailover,
      fetchOnHover: false,
      autoFetchAllTrains: saved.autoFetchAllTrains !== undefined ? saved.autoFetchAllTrains : DEFAULT_SETTINGS.autoFetchAllTrains,
      cacheTtlMinutes: saved.cacheTtlMinutes || DEFAULT_SETTINGS.cacheTtlMinutes,
      showFloatingHUD: saved.showFloatingHUD !== undefined ? saved.showFloatingHUD : DEFAULT_SETTINGS.showFloatingHUD,
      schemaVersion: '1.5.0-iso',
      providers: mergedProviders,
    };
  } catch (err) {
    console.error('[Background] Failed to read settings from storage:', err);
    return DEFAULT_SETTINGS;
  }
}

function getCacheKey(trainNumber: string, travelDate?: string): string {
  const dateKey = travelDate || getIso8601Date();
  return `${STORAGE_KEY_CACHE_PREFIX}${trainNumber}_${dateKey}`;
}

async function getFromCache(trainNumber: string, travelDate?: string): Promise<TrainDelayData | null> {
  try {
    const key = getCacheKey(trainNumber, travelDate);
    const result = await chrome.storage.local.get(key);
    const record: CacheRecord | undefined = result[key];

    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      await chrome.storage.local.remove(key);
      return null;
    }

    return {
      ...record.data,
      fetchedTimestamp: record.timestamp || record.data.fetchedTimestamp || Date.now(),
      isoTimestamp: record.isoTimestamp || record.data.isoTimestamp || getIso8601Timestamp(),
      isoDate: record.data.isoDate || travelDate || getIso8601Date(),
      source: 'cache',
    };
  } catch {
    return null;
  }
}

async function saveToCache(data: TrainDelayData, travelDate?: string, ttlMinutes = 15): Promise<void> {
  try {
    const key = getCacheKey(data.trainNumber, travelDate);
    const ttlMs = (ttlMinutes || 15) * 60 * 1000;
    const now = Date.now();
    const nowIso = getIso8601Timestamp();
    const expiresAt = now + ttlMs;
    const expiresAtIso = new Date(expiresAt).toISOString();

    const record: CacheRecord = {
      data: {
        ...data,
        fetchedTimestamp: now,
        isoTimestamp: nowIso,
        isoDate: travelDate || getIso8601Date(),
      },
      timestamp: now,
      isoTimestamp: nowIso,
      expiresAt,
      expiresAtIso,
    };
    await chrome.storage.local.set({ [key]: record });
  } catch (err) {
    console.warn('[Background] Failed to save cache:', err);
  }
}

/**
 * Periodically cleans up expired cache records to keep local storage lightweight
 */
async function pruneExpiredCache(): Promise<void> {
  try {
    const all = await chrome.storage.local.get(null);
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, val] of Object.entries(all)) {
      if (key.startsWith(STORAGE_KEY_CACHE_PREFIX)) {
        const record = val as CacheRecord | undefined;
        if (record && record.expiresAt && now > record.expiresAt) {
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`[Background] Pruned ${keysToRemove.length} expired cache records.`);
    }
  } catch (err) {
    console.warn('[Background] Cache prune skipped:', err);
  }
}

// Initial prune on startup
pruneExpiredCache();

/**
 * Handles incoming messages from content scripts and UI popups
 */
async function handleMessage(message: ExtensionMessage, sendResponse: (res: any) => void): Promise<void> {
  if (message.type === 'FETCH_TRAIN_DELAY') {
    const { trainNumber, forceRefresh, travelDate, providerOverride } = message.payload;
    const cacheKey = getCacheKey(trainNumber, travelDate);

    console.log(`[Background] 📨 Received FETCH_TRAIN_DELAY for train #${trainNumber} (forceRefresh=${Boolean(forceRefresh)})`);

    // 1. Check in-flight promise coalescing
    if (inFlightRequests.has(cacheKey) && !forceRefresh) {
      console.log(`[Background] Coalescing request for train #${trainNumber}`);
      const response = await inFlightRequests.get(cacheKey)!;
      sendResponse(response);
      return;
    }

    if (forceRefresh) {
      inFlightRequests.delete(cacheKey);
      await chrome.storage.local.remove(cacheKey);
    }

    const settings = await getStoredSettings();

    // 2. Local Cache Check
    if (!forceRefresh) {
      const cached = await getFromCache(trainNumber, travelDate);
      if (cached) {
        console.log(`[Background] Returning cached status for train #${trainNumber}`);
        sendResponse({
          success: true,
          data: cached,
          providerUsed: 'Local Cache (⚡ Instant - 0 API Calls)',
          isoTimestamp: cached.isoTimestamp,
        });
        return;
      }
    }

    // 3. In-flight fetch execution (starts with Official NTES, then Configured Providers 1, 2, 3...)
    const fetchPromise = (async (): Promise<DelayResponse> => {
      try {
        console.log(`[Background] Executing multi-provider fetch for train #${trainNumber}...`);
        const result = await executeMultiProviderFetch(trainNumber, settings, travelDate, providerOverride, Boolean(forceRefresh));
        await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: settings });
        await saveToCache(result.data, travelDate, settings.cacheTtlMinutes);

        return {
          success: true,
          data: {
            ...result.data,
            fetchedTimestamp: Date.now(),
            isoTimestamp: getIso8601Timestamp(),
            isoDate: travelDate || getIso8601Date(),
          },
          providerUsed: result.providerUsed,
          isoTimestamp: getIso8601Timestamp(),
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch status';
        console.error(`[Background] Multi-provider fetch failed for train #${trainNumber}:`, errorMsg);
        const isAuth = errorMsg.includes('Invalid') || errorMsg.includes('Missing API Key') || errorMsg.includes('AUTH_ERROR') || errorMsg.includes('No working providers available');
        const isQuota = errorMsg.includes('RATE_LIMIT') || errorMsg.includes('quota') || errorMsg.includes('429');

        const isoErr: IsoStandardError = {
          errorCode: isQuota ? IsoErrorCode.RATE_LIMIT_EXCEEDED : isAuth ? IsoErrorCode.AUTH_REQUIRED : IsoErrorCode.INTERNAL_FAULT,
          statusCode: isQuota ? 429 : isAuth ? 401 : 500,
          message: errorMsg,
          isoTimestamp: getIso8601Timestamp(),
        };

        return {
          success: false,
          error: errorMsg,
          isoError: isoErr,
          requiresApiKey: isAuth,
        };
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    const finalResponse = await fetchPromise;
    sendResponse(finalResponse);
    return;
  } else if (message.type === 'GET_SETTINGS') {
    try {
      const settings = await getStoredSettings();
      const maskedProviders: Record<string, any> = {};
      for (const [pid, conf] of Object.entries(settings.providers)) {
        const typedPid = pid as ProviderId;
        maskedProviders[typedPid] = {
          ...conf,
          keys: (conf.keys || []).map((k) => ({
            ...k,
            maskedKey: maskIsoCredential(k.key),
            rawKey: undefined,
          })),
          hasKey: (conf.keys || []).length > 0 || !PROVIDER_CATALOG[typedPid]?.requiresKey,
        };
      }

      sendResponse({
        success: true,
        data: {
          ...settings,
          providers: maskedProviders,
          catalog: PROVIDER_CATALOG,
          isoTimestamp: getIso8601Timestamp(),
        },
      });
    } catch (err) {
      sendResponse({ success: false, error: 'Failed to read settings.' });
    }
  } else if (message.type === 'ADD_PROVIDER_KEY') {
    try {
      const { providerId, key, label, status } = message.payload;
      const settings = await getStoredSettings();
      const conf = settings.providers[providerId] || normalizeProviderConfig();
      addKeyToPool(conf, key, label, status);
      settings.providers[providerId] = conf;

      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: settings });
      console.log(`[Background] Added new key to ${providerId} pool.`);

      sendResponse({ success: true, isoTimestamp: getIso8601Timestamp() });
    } catch (err) {
      sendResponse({ success: false, error: 'Failed to add API key.' });
    }
  } else if (message.type === 'REMOVE_PROVIDER_KEY') {
    try {
      const { providerId, keyId } = message.payload;
      const settings = await getStoredSettings();
      const conf = settings.providers[providerId];
      if (conf) {
        removeKeyFromPool(conf, keyId);
        settings.providers[providerId] = conf;
        await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: settings });
      }
      sendResponse({ success: true, isoTimestamp: getIso8601Timestamp() });
    } catch (err) {
      sendResponse({ success: false, error: 'Failed to delete key.' });
    }
  } else if (message.type === 'SAVE_SETTINGS') {
    try {
      const incoming = message.payload;
      const current = await getStoredSettings();

      const mergedProviders = { ...current.providers };
      if (incoming.providers) {
        for (const [pid, conf] of Object.entries(incoming.providers)) {
          const typedPid = pid as ProviderId;
          const existing = current.providers[typedPid] || normalizeProviderConfig();
          const inc = conf as ProviderConfig;

          mergedProviders[typedPid] = {
            ...existing,
            ...inc,
            keys: inc.keys !== undefined ? inc.keys : existing.keys,
          };
        }
      }

      const newSettings: MultiProviderSettings = {
        ...current,
        ...incoming,
        providers: mergedProviders,
        schemaVersion: '1.5.0-iso',
      };

      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: newSettings });
      console.log('[Background] Updated multi-provider settings saved.');
      sendResponse({ success: true, isoTimestamp: getIso8601Timestamp() });
    } catch (err) {
      sendResponse({ success: false, error: 'Failed to save settings' });
    }
  } else if (message.type === 'TEST_PROVIDER') {
    try {
      const { providerId, keyToTest } = message.payload;
      const currentSettings = await getStoredSettings();
      const meta = PROVIDER_CATALOG[providerId];

      if (!meta) {
        sendResponse({ success: false, error: 'Unknown provider' });
        return;
      }

      const tempSettings: MultiProviderSettings = {
        ...currentSettings,
        activeProvider: providerId,
        providers: {
          ...currentSettings.providers,
          [providerId]: {
            ...currentSettings.providers[providerId],
            enabled: true,
            keys: keyToTest ? [{ id: 'test_token', key: keyToTest, status: 'active', requestCount: 0 }] : [],
          },
        },
      };

      const startTime = Date.now();
      const testResult = await fetchWithProvider(providerId, '12002', tempSettings);
      const latencyMs = Date.now() - startTime;

      sendResponse({
        success: true,
        message: `Connected to ${PROVIDER_CATALOG[providerId]?.name}! (Latency: ${latencyMs}ms • Train #${testResult.data.trainNumber}: ${testResult.data.statusSummary})`,
        latencyMs,
        isoTimestamp: getIso8601Timestamp(),
      });
    } catch (err) {
      sendResponse({ success: false, error: err instanceof Error ? err.message : 'Test failed' });
    }
  } else if (message.type === 'CLEAR_CACHE') {
    try {
      const all = await chrome.storage.local.get(null);
      const keys = Object.keys(all).filter((k) => k.startsWith(STORAGE_KEY_CACHE_PREFIX));
      await chrome.storage.local.remove(keys);
      sendResponse({ success: true, count: keys.length, isoTimestamp: getIso8601Timestamp() });
    } catch (err) {
      sendResponse({ success: false, error: 'Failed to clear cache' });
    }
  } else if (message.type === 'OPEN_OPTIONS_PAGE') {
    try {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
    } catch {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      sendResponse({ success: true });
    }
  } else if (message.type === 'TOGGLE_EXTENSION') {
    try {
      const settings = await getStoredSettings();
      settings.extensionEnabled = message.payload.enabled;
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: settings });
      sendResponse({ success: true });
    } catch {
      sendResponse({ success: false });
    }
  } else if (message.type === 'TOGGLE_SITE') {
    try {
      const { hostname, enabled } = message.payload;
      const settings = await getStoredSettings();
      if (enabled) {
        settings.disabledSites = settings.disabledSites.filter((h) => h !== hostname);
      } else if (!settings.disabledSites.includes(hostname)) {
        settings.disabledSites.push(hostname);
      }
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: settings });
      sendResponse({ success: true });
    } catch {
      sendResponse({ success: false });
    }
  } else if (message.type === 'UPDATE_SITE_POSITION') {
    try {
      const { hostname, position } = message.payload;
      const settings = await getStoredSettings();
      settings.sitePositions = settings.sitePositions || {};
      settings.sitePositions[hostname] = position;
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: settings });
      sendResponse({ success: true });
    } catch {
      sendResponse({ success: false });
    }
  }
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true;
});
