/**
 * Master Multi-Provider Failover Coordinator & In-Flight Coalescer
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { PROVIDER_METADATA_MAP } from '../core/constants';
import { MultiProviderSettings, ProviderId, TrainDelayData } from '../core/types';
import { CircuitBreaker } from './CircuitBreaker';
import { fetchCustomProviderStatus } from './CustomProvider';
import { fetchDirectRailStatus } from './DirectRailProvider';
import { fetchIndianRailApiStatus } from './IndianRailApiProvider';
import { getUsableKeys, markKeyInvalid, markKeyRateLimited, markKeySuccess, normalizeProviderConfig } from './KeyPoolManager';
import { fetchRapidApiRail1Status } from './RapidApiRail1Provider';
import { fetchRapidApiRail2Status } from './RapidApiRail2Provider';

const circuitBreakers: Record<ProviderId, CircuitBreaker> = {
  'direct-rail-gateway': new CircuitBreaker(3, 120000), // 2 min cooldown
  'rapidapi-rail-v1': new CircuitBreaker(4, 180000),
  'rapidapi-rail-v2': new CircuitBreaker(4, 180000),
  'indianrailapi': new CircuitBreaker(3, 180000),
  'custom-webhook': new CircuitBreaker(3, 180000),
};

const inFlightRequests = new Map<string, Promise<TrainDelayData>>();

export async function dispatchTrainDelayQuery(
  trainNumber: string,
  settings: MultiProviderSettings,
  forcedProviderId?: ProviderId,
  travelDate?: string
): Promise<TrainDelayData> {
  const cacheKey = `${trainNumber}_${travelDate || 'today'}_${forcedProviderId || 'auto'}`;
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = executeDispatch(trainNumber, settings, forcedProviderId, travelDate).finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

async function executeDispatch(
  trainNumber: string,
  settings: MultiProviderSettings,
  forcedProviderId?: ProviderId,
  travelDate?: string
): Promise<TrainDelayData> {
  const defaultList: ProviderId[] = [
    settings.activeProvider,
    'direct-rail-gateway',
    'rapidapi-rail-v1',
    'rapidapi-rail-v2',
    'indianrailapi',
    'custom-webhook',
  ];
  const providerOrder: ProviderId[] = forcedProviderId
    ? [forcedProviderId]
    : defaultList.filter((id, idx, arr) => arr.indexOf(id) === idx);

  const errors: string[] = [];

  for (const providerId of providerOrder) {
    const meta = PROVIDER_METADATA_MAP[providerId];
    if (!meta) continue;

    const rawConfig = settings.providers[providerId];
    const config = normalizeProviderConfig(rawConfig);

    if (!config.enabled && !forcedProviderId) {
      continue;
    }

    const breaker = circuitBreakers[providerId];
    if (breaker && breaker.isOpen() && !forcedProviderId) {
      errors.push(`${meta.name}: Circuit breaker OPEN (cooldown active)`);
      continue;
    }

    // Direct gateway requires no keys
    if (!meta.requiresKey) {
      try {
        let result: TrainDelayData;
        if (providerId === 'direct-rail-gateway') {
          result = await fetchDirectRailStatus(trainNumber, config, undefined, travelDate);
        } else {
          result = await fetchCustomProviderStatus(trainNumber, config, undefined, travelDate);
        }

        breaker.recordSuccess();
        return result;
      } catch (err: any) {
        breaker.recordFailure();
        errors.push(`${meta.name}: ${err.message}`);
        if (!settings.autoFailover && forcedProviderId) throw err;
        continue;
      }
    }

    // Key-pool providers
    const usableKeys = getUsableKeys(config);
    if (usableKeys.length === 0) {
      errors.push(`${meta.name}: No active API keys available`);
      continue;
    }

    let providerSuccess = false;
    for (const keyItem of usableKeys) {
      try {
        let result: TrainDelayData;
        if (providerId === 'rapidapi-rail-v1') {
          result = await fetchRapidApiRail1Status(trainNumber, config, keyItem.key, travelDate);
        } else if (providerId === 'rapidapi-rail-v2') {
          result = await fetchRapidApiRail2Status(trainNumber, config, keyItem.key, travelDate);
        } else if (providerId === 'indianrailapi') {
          result = await fetchIndianRailApiStatus(trainNumber, config, keyItem.key, travelDate);
        } else {
          result = await fetchCustomProviderStatus(trainNumber, config, keyItem.key, travelDate);
        }

        markKeySuccess(config, keyItem.key);
        breaker.recordSuccess();
        providerSuccess = true;
        return result;
      } catch (err: any) {
        const msg = String(err.message || '');
        if (msg.includes('AUTH_ERROR') || msg.includes('Invalid') || msg.includes('unauthorized')) {
          markKeyInvalid(config, keyItem.key, msg);
        } else if (msg.includes('RATE_LIMIT') || msg.includes('quota') || msg.includes('exceeded')) {
          markKeyRateLimited(config, keyItem.key, 24);
        }
        errors.push(`${meta.name} [key ...${keyItem.key.slice(-4)}]: ${err.message}`);
      }
    }

    if (!providerSuccess) {
      breaker.recordFailure();
    }
  }

  throw new Error(`All providers failed for train #${trainNumber}.\nDetails:\n${errors.join('\n')}`);
}
