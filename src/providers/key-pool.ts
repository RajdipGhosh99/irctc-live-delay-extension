/**
 * Key Pool Manager - ISO/IEC 25010 & ISO 8601 Compliant
 * Handles multi-token rotation, quota aggregation, rate-limit backoff, and health tracking.
 */

import { ApiKeyItem, ProviderConfig } from '../types';
import { getIso8601Timestamp } from '../iso-utils';

/**
 * Normalizes provider config ensuring keys array exists
 */
export function normalizeProviderConfig(config?: Partial<ProviderConfig>): ProviderConfig {
  const keys: ApiKeyItem[] = [];

  // Migrate legacy single apiKey if present
  if (config?.apiKey && config.apiKey.trim()) {
    const clean = config.apiKey.trim().replace(/^["']|["']$/g, '');
    if (clean.length > 5) {
      keys.push({
        id: 'legacy_key_1',
        key: clean,
        label: 'Primary Key',
        status: 'active',
        requestCount: 0,
        lastUsedIso: getIso8601Timestamp(),
      });
    }
  }

  // Add existing keys if available
  if (Array.isArray(config?.keys)) {
    config.keys.forEach((k, idx) => {
      const clean = (k.key || '').trim().replace(/^["']|["']$/g, '');
      if (clean.length > 5 && !keys.some((existing) => existing.key === clean)) {
        keys.push({
          id: k.id || `key_${Date.now()}_${idx}`,
          key: clean,
          label: k.label || `Token #${keys.length + 1}`,
          status: k.status || 'active',
          requestCount: k.requestCount || 0,
          lastUsed: k.lastUsed,
          lastUsedIso: k.lastUsedIso || (k.lastUsed ? new Date(k.lastUsed).toISOString() : undefined),
          lastError: k.lastError,
          rateLimitedUntil: k.rateLimitedUntil,
          rateLimitedUntilIso: k.rateLimitedUntilIso,
        });
      }
    });
  }

  return {
    enabled: config?.enabled !== undefined ? config.enabled : true,
    keys,
    apiHost: config?.apiHost,
    apiEndpoint: config?.apiEndpoint,
  };
}

/**
 * Returns all currently usable keys from the provider pool
 */
export function getUsableKeys(config: ProviderConfig): ApiKeyItem[] {
  const now = Date.now();
  return config.keys.filter((k) => {
    if (k.status === 'invalid') return false;
    if (k.status === 'rate-limited' && k.rateLimitedUntil && now < k.rateLimitedUntil) {
      return false;
    }
    return k.key && k.key.trim().length > 5;
  });
}

/**
 * Adds a new token to the provider's key pool
 */
export function addKeyToPool(
  config: ProviderConfig,
  rawKey: string,
  label?: string,
  status: 'active' | 'invalid' = 'active'
): boolean {
  const clean = rawKey.trim().replace(/^["']|["']$/g, '');
  if (clean.length <= 5) return false;

  // Check if duplicate
  if (config.keys.some((k) => k.key === clean)) {
    return false;
  }

  config.keys.push({
    id: `token_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    key: clean,
    label: label || `Token #${config.keys.length + 1}`,
    status: status || 'active',
    requestCount: 0,
    lastUsedIso: getIso8601Timestamp(),
  });

  return true;
}

/**
 * Removes a token from the pool
 */
export function removeKeyFromPool(config: ProviderConfig, keyId: string): boolean {
  const initialLen = config.keys.length;
  config.keys = config.keys.filter((k) => k.id !== keyId);
  return config.keys.length < initialLen;
}

/**
 * Updates a key's health status on successful request
 */
export function markKeySuccess(config: ProviderConfig, keyId: string): void {
  const key = config.keys.find((k) => k.id === keyId);
  if (key) {
    key.status = 'active';
    key.requestCount = (key.requestCount || 0) + 1;
    key.lastUsed = Date.now();
    key.lastUsedIso = getIso8601Timestamp();
    key.lastError = undefined;
    key.rateLimitedUntil = undefined;
    key.rateLimitedUntilIso = undefined;
  }
}

/**
 * Marks a key as rate-limited (quota reached) with a 2-hour cooldown
 */
export function markKeyRateLimited(config: ProviderConfig, keyId: string, errorMsg: string): void {
  const key = config.keys.find((k) => k.id === keyId);
  if (key) {
    key.status = 'rate-limited';
    key.lastError = errorMsg;
    const cooldownMs = 2 * 60 * 60 * 1000;
    key.rateLimitedUntil = Date.now() + cooldownMs; // 2 hours
    key.rateLimitedUntilIso = new Date(key.rateLimitedUntil).toISOString();
  }
}

/**
 * Marks a key as invalid (401/403 credentials rejected)
 */
export function markKeyInvalid(config: ProviderConfig, keyId: string, errorMsg: string): void {
  const key = config.keys.find((k) => k.id === keyId);
  if (key) {
    key.status = 'invalid';
    key.lastError = errorMsg;
  }
}
