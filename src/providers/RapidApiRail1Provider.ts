/**
 * RapidAPI Rail Provider 1
 * High-speed secondary live running gateway hosted on RapidAPI
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { PROVIDER_METADATA_MAP } from '../core/constants';
import { ProviderConfig, TrainDelayData } from '../core/types';
import { normalizeUnifiedTrainResponse } from './unified-adapter';

export const RAPIDAPI_RAIL1_METADATA = PROVIDER_METADATA_MAP['rapidapi-rail-v1'];

export async function fetchRapidApiRail1Status(
  trainNumber: string,
  config: ProviderConfig,
  apiKey: string,
  travelDate?: string
): Promise<TrainDelayData> {
  const endpoint = config.apiEndpoint || RAPIDAPI_RAIL1_METADATA.defaultEndpoint!;
  const host = config.apiHost || RAPIDAPI_RAIL1_METADATA.defaultHost!;
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');

  if (!cleanKey) {
    throw new Error('RapidAPI Rail Engine 1: Missing API Key.');
  }

  const url = new URL(endpoint);
  url.searchParams.set('trainNo', trainNumber);
  url.searchParams.set('startDay', '1');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-key': cleanKey,
        'x-rapidapi-host': host.trim(),
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('RapidAPI Rail Engine 1: Request timed out (8s).');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_ERROR: Invalid or expired RapidAPI Key.');
  }

  if (response.status === 429) {
    throw new Error('RATE_LIMIT: RapidAPI Rail Engine 1 quota limit reached for this token.');
  }

  if (!response.ok) {
    throw new Error(`RapidAPI Rail Engine 1 HTTP error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.message) {
    const msg = String(json.message).toLowerCase();
    if (msg.includes('exceeded') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('blocked')) {
      throw new Error('RATE_LIMIT: RapidAPI quota limit reached for this token.');
    }
    if (msg.includes('invalid key') || msg.includes('unauthorized') || msg.includes('forbidden')) {
      throw new Error('AUTH_ERROR: RapidAPI authorization failed.');
    }
  }

  return normalizeUnifiedTrainResponse(
    json,
    'rapidapi-rail-v1',
    RAPIDAPI_RAIL1_METADATA.name,
    trainNumber,
    travelDate
  );
}
