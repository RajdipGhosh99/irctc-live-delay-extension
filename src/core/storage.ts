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
    termsAccepted: raw.termsAccepted ?? DEFAULT_SETTINGS.termsAccepted,
    termsAcceptedAt: raw.termsAcceptedAt,
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

export async function getCachedTrainData(trainNumber: string, ttlMinutes = 0): Promise<TrainDelayData | null> {
  // If caching is disabled (0 minutes), bypass cache lookups
  if (ttlMinutes <= 0) {
    return null;
  }

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

export async function setCachedTrainData(
  data: TrainDelayData,
  ttlMinutes = 0,
  maxCacheSizeMb = 50
): Promise<void> {
  // If caching is disabled (0 minutes) or no valid train number, skip storing
  if (ttlMinutes <= 0 || !data?.trainNumber) {
    return;
  }

  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
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

    chrome.storage.local.get(null, (allItems) => {
      if (chrome.runtime?.lastError || !allItems) {
        chrome.storage.local.set({ [key]: entry }, () => resolve());
        return;
      }

      const cacheKeys = Object.keys(allItems).filter(
        (k) => k.startsWith(STORAGE_KEYS.CACHE_PREFIX) || k.startsWith(STORAGE_KEYS.LEGACY_CACHE_PREFIX)
      );

      // Estimate total cache size in bytes
      let totalBytes = 0;
      const cacheEntries: { key: string; entry: CacheEntry; size: number }[] = [];

      for (const k of cacheKeys) {
        const item = allItems[k];
        const jsonStr = JSON.stringify(item);
        const itemSize = jsonStr.length * 2; // UTF-16 approx byte size
        totalBytes += itemSize;
        cacheEntries.push({ key: k, entry: item, size: itemSize });
      }

      const maxBytes = maxCacheSizeMb * 1024 * 1024;
      const keysToEvict: string[] = [];

      // Evict expired entries first
      for (const item of cacheEntries) {
        if (item.entry?.expiresAt && now > item.entry.expiresAt) {
          keysToEvict.push(item.key);
          totalBytes -= item.size;
        }
      }

      // If still exceeding 50 MB, evict oldest entries (LRU / oldest cachedAt)
      if (totalBytes > maxBytes) {
        const remainingEntries = cacheEntries
          .filter((i) => !keysToEvict.includes(i.key))
          .sort((a, b) => (a.entry.cachedAt || 0) - (b.entry.cachedAt || 0));

        for (const item of remainingEntries) {
          if (totalBytes <= maxBytes * 0.85) break; // Evict down to 85% of limit
          keysToEvict.push(item.key);
          totalBytes -= item.size;
        }
      }

      if (keysToEvict.length > 0) {
        chrome.storage.local.remove(keysToEvict, () => {
          chrome.storage.local.set({ [key]: entry }, () => resolve());
        });
      } else {
        chrome.storage.local.set({ [key]: entry }, () => resolve());
      }
    });
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
      } else {
        const keysToRemove = Object.keys(items).filter(
          (k) => k.startsWith(STORAGE_KEYS.CACHE_PREFIX) || k.startsWith(STORAGE_KEYS.LEGACY_CACHE_PREFIX)
        );

        if (keysToRemove.length > 0) {
          chrome.storage.local.remove(keysToRemove, () => resolve());
        } else {
          resolve();
        }
      }
    });
  });
}

export async function getCacheStorageInfo(maxCacheSizeMb = 50): Promise<{ count: number; bytes: number; maxBytes: number; formattedSize: string }> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve({ count: 0, bytes: 0, maxBytes: maxCacheSizeMb * 1024 * 1024, formattedSize: '0 KB' });
      return;
    }

    chrome.storage.local.get(null, (items) => {
      if (chrome.runtime?.lastError || !items) {
        resolve({ count: 0, bytes: 0, maxBytes: maxCacheSizeMb * 1024 * 1024, formattedSize: '0 KB' });
        return;
      }

      const cacheKeys = Object.keys(items).filter(
        (k) => k.startsWith(STORAGE_KEYS.CACHE_PREFIX) || k.startsWith(STORAGE_KEYS.LEGACY_CACHE_PREFIX)
      );

      let totalBytes = 0;
      for (const k of cacheKeys) {
        totalBytes += JSON.stringify(items[k]).length * 2;
      }

      let formattedSize = `${(totalBytes / 1024).toFixed(1)} KB`;
      if (totalBytes > 1024 * 1024) {
        formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
      }

      resolve({
        count: cacheKeys.length,
        bytes: totalBytes,
        maxBytes: maxCacheSizeMb * 1024 * 1024,
        formattedSize,
      });
    });
  });
}
