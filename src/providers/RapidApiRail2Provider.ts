/**
 * RapidAPI Rail Provider 2
 * Alternative RapidAPI gateway for failover redundancy
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { PROVIDER_METADATA_MAP } from '../core/constants';
import { ProviderConfig, TrainDelayData } from '../core/types';
import { normalizeUnifiedTrainResponse } from './unified-adapter';

export const RAPIDAPI_RAIL2_METADATA = PROVIDER_METADATA_MAP['rapidapi-rail-v2'];

export async function fetchRapidApiRail2Status(
  trainNumber: string,
  config: ProviderConfig,
  apiKey: string,
  travelDate?: string
): Promise<TrainDelayData> {
  const endpoint = config.apiEndpoint || RAPIDAPI_RAIL2_METADATA.defaultEndpoint!;
  const host = config.apiHost || RAPIDAPI_RAIL2_METADATA.defaultHost!;
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');

  if (!cleanKey) {
    throw new Error('RapidAPI Rail Engine 2: Missing API Key.');
  }

  const url = new URL(endpoint);
  url.searchParams.set('trainNo', trainNumber);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-key': cleanKey,
      'x-rapidapi-host': host.trim(),
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_ERROR: Invalid or expired RapidAPI Key.');
  }

  if (response.status === 429) {
    throw new Error('RATE_LIMIT: RapidAPI Rail Engine 2 quota limit reached for this token.');
  }

  if (!response.ok) {
    throw new Error(`RapidAPI Rail Engine 2 HTTP error: ${response.status}`);
  }

  const json = await response.json();

  if (json.message) {
    const msg = String(json.message).toLowerCase();
    if (msg.includes('exceeded') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('blocked')) {
      throw new Error('RATE_LIMIT: RapidAPI quota limit reached for this token.');
    }
  }

  return normalizeUnifiedTrainResponse(
    json,
    'rapidapi-rail-v2',
    RAPIDAPI_RAIL2_METADATA.name,
    trainNumber,
    travelDate
  );
}
