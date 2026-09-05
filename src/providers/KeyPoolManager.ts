/**
 * Multi-Token Key Pool & Rate Limit Manager
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { ApiKeyItem, ProviderConfig } from '../core/types';
import { getIso8601Timestamp } from '../core/utils';

export function normalizeProviderConfig(config?: Partial<ProviderConfig>): ProviderConfig {
  const cfg: ProviderConfig = {
    enabled: config?.enabled ?? true,
    keys: Array.isArray(config?.keys) ? config!.keys : [],
    apiKey: config?.apiKey,
    apiHost: config?.apiHost,
    apiEndpoint: config?.apiEndpoint,
  };

  if (cfg.apiKey && cfg.apiKey.trim() && cfg.keys.length === 0) {
    const key = cfg.apiKey.trim();
    cfg.keys.push({
      id: `legacy-${Date.now()}`,
      key,
      label: 'Default Key',
      status: 'active',
      requestCount: 0,
    });
  }

  return cfg;
}

export function getUsableKeys(config: ProviderConfig): ApiKeyItem[] {
  const now = Date.now();
  return config.keys.filter((item) => {
    if (item.status === 'invalid') return false;
    if (item.status === 'rate-limited') {
      if (item.rateLimitedUntil && now > item.rateLimitedUntil) {
        item.status = 'active';
        item.rateLimitedUntil = undefined;
        item.rateLimitedUntilIso = undefined;
        return true;
      }
      return false;
    }
    return true;
  });
}

export function markKeySuccess(config: ProviderConfig, apiKey: string): void {
  const item = config.keys.find((k) => k.key.trim() === apiKey.trim());
  if (item) {
    item.requestCount = (item.requestCount || 0) + 1;
    item.lastUsed = Date.now();
    item.lastUsedIso = getIso8601Timestamp(new Date(item.lastUsed));
    item.lastError = undefined;
    if (item.status === 'rate-limited') {
      item.status = 'active';
    }
  }
}

export function markKeyRateLimited(config: ProviderConfig, apiKey: string, cooldownHours = 24): void {
  const item = config.keys.find((k) => k.key.trim() === apiKey.trim());
  if (item) {
    const now = Date.now();
    const until = now + cooldownHours * 60 * 60 * 1000;
    item.status = 'rate-limited';
    item.rateLimitedUntil = until;
    item.rateLimitedUntilIso = getIso8601Timestamp(new Date(until));
    item.lastError = 'Rate limit quota reached';
  }
}

export function markKeyInvalid(config: ProviderConfig, apiKey: string, errorMsg = 'Invalid Key'): void {
  const item = config.keys.find((k) => k.key.trim() === apiKey.trim());
  if (item) {
    item.status = 'invalid';
    item.lastError = errorMsg;
  }
}
