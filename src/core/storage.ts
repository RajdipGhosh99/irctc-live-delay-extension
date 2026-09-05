/**
 * Core Storage Manager with Backward-Compatible Migration
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';
import { CacheEntry, MultiProviderSettings, ProviderId, TrainDelayData } from './types';
import { getIso8601Timestamp } from './utils';

const PROVIDER_MIGRATION_MAP: Record<string, ProviderId> = {
  'irctc-official': 'direct-rail-gateway',
  'rapidapi-irctc1': 'rapidapi-rail-v1',
  'rapidapi-indianrail': 'rapidapi-rail-v2',
  'indianrailapi': 'indianrailapi',
  'custom': 'custom-webhook',
};

function migrateLegacySettings(raw: any): MultiProviderSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const migrated: MultiProviderSettings = {
    extensionEnabled: raw.extensionEnabled ?? DEFAULT_SETTINGS.extensionEnabled,
    disabledSites: Array.isArray(raw.disabledSites) ? raw.disabledSites : [...DEFAULT_SETTINGS.disabledSites],
    sitePositions: raw.sitePositions ? { ...DEFAULT_SETTINGS.sitePositions, ...raw.sitePositions } : { ...DEFAULT_SETTINGS.sitePositions },
    activeProvider: PROVIDER_MIGRATION_MAP[raw.activeProvider] || (raw.activeProvider as ProviderId) || DEFAULT_SETTINGS.activeProvider,
    autoFailover: raw.autoFailover ?? DEFAULT_SETTINGS.autoFailover,
    fetchOnHover: raw.fetchOnHover ?? DEFAULT_SETTINGS.fetchOnHover,
    autoFetchAllTrains: raw.autoFetchAllTrains ?? DEFAULT_SETTINGS.autoFetchAllTrains,
    cacheTtlMinutes: raw.cacheTtlMinutes ?? DEFAULT_SETTINGS.cacheTtlMinutes,
    maxCacheSizeMb: raw.maxCacheSizeMb ?? DEFAULT_SETTINGS.maxCacheSizeMb,
    showFloatingHUD: raw.showFloatingHUD ?? DEFAULT_SETTINGS.showFloatingHUD,
    schemaVersion: '2.0.0',
    providers: { ...DEFAULT_SETTINGS.providers },
  };

  // Migrate provider configurations
  if (raw.providers && typeof raw.providers === 'object') {
    for (const [oldKey, config] of Object.entries(raw.providers)) {
      const newKey = PROVIDER_MIGRATION_MAP[oldKey] || (oldKey as ProviderId);
      if (newKey && typeof config === 'object' && config !== null) {
        migrated.providers[newKey] = {
          enabled: (config as any).enabled ?? true,
          keys: Array.isArray((config as any).keys) ? (config as any).keys : [],
          apiKey: (config as any).apiKey,
          apiHost: (config as any).apiHost,
          apiEndpoint: (config as any).apiEndpoint,
        };
      }
    }
  }

  return migrated;
}

export async function loadSettings(): Promise<MultiProviderSettings> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve({ ...DEFAULT_SETTINGS });
      return;
    }

    chrome.storage.local.get([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.LEGACY_SETTINGS], (res) => {
      if (chrome.runtime?.lastError) {
        console.warn('[Storage] Error loading settings:', chrome.runtime.lastError.message);
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }

      if (res[STORAGE_KEYS.SETTINGS]) {
        const settings = res[STORAGE_KEYS.SETTINGS] as MultiProviderSettings;
        resolve({
          ...DEFAULT_SETTINGS,
          ...settings,
          providers: { ...DEFAULT_SETTINGS.providers, ...settings.providers },
        });
        return;
      }

      if (res[STORAGE_KEYS.LEGACY_SETTINGS]) {
        console.log('[Storage] Performing automated migration from legacy settings...');
        const migrated = migrateLegacySettings(res[STORAGE_KEYS.LEGACY_SETTINGS]);
        saveSettings(migrated).catch(console.error);
        resolve(migrated);
        return;
      }

      resolve({ ...DEFAULT_SETTINGS });
    });
  });
}

export async function saveSettings(settings: MultiProviderSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve();
      return;
    }

    chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
      if (chrome.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

export async function getCachedTrainData(trainNumber: string, ttlMinutes = 15): Promise<TrainDelayData | null> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve(null);
      return;
    }

    const key = `${STORAGE_KEYS.CACHE_PREFIX}${trainNumber.trim()}`;
    const legacyKey = `${STORAGE_KEYS.LEGACY_CACHE_PREFIX}${trainNumber.trim()}`;

    chrome.storage.local.get([key, legacyKey], (res) => {
      if (chrome.runtime?.lastError) {
        resolve(null);
        return;
      }

      const rawEntry = res[key] || res[legacyKey];
      if (!rawEntry) {
        resolve(null);
        return;
      }

      const now = Date.now();
      if (rawEntry.expiresAt && now > rawEntry.expiresAt) {
        chrome.storage.local.remove([key, legacyKey]);
        resolve(null);
        return;
      }

      const data: TrainDelayData = rawEntry.data || rawEntry;
      if (data && data.delayMinutes !== undefined) {
        if (data.provider) {
          data.provider = PROVIDER_MIGRATION_MAP[data.provider] || data.provider;
        }
        resolve(data);
      } else {
        resolve(null);
      }
    });
  });
}

export async function setCachedTrainData(data: TrainDelayData, ttlMinutes = 15): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local || !data?.trainNumber) {
      resolve();
      return;
    }

    const now = Date.now();
    const expiresAt = now + ttlMinutes * 60 * 1000;
    const key = `${STORAGE_KEYS.CACHE_PREFIX}${data.trainNumber.trim()}`;

    const entry: CacheEntry = {
      trainNumber: data.trainNumber.trim(),
      data,
      cachedAt: now,
      cachedAtIso: getIso8601Timestamp(new Date(now)),
      expiresAt,
      expiresAtIso: getIso8601Timestamp(new Date(expiresAt)),
    };

    chrome.storage.local.set({ [key]: entry }, () => resolve());
  });
}

export async function clearAllCache(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve();
      return;
    }

    chrome.storage.local.get(null, (items) => {
      if (chrome.runtime?.lastError || !items) {
        resolve();
        return;
      }

      const keysToRemove = Object.keys(items).filter(
        (k) => k.startsWith(STORAGE_KEYS.CACHE_PREFIX) || k.startsWith(STORAGE_KEYS.LEGACY_CACHE_PREFIX)
      );

      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove, () => resolve());
      } else {
        resolve();
      }
    });
  });
}
