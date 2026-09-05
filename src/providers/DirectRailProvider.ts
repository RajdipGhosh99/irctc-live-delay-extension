/**
 * Direct Public Rail Network Live Train Tracking Provider
 * High-priority direct public gateway (Zero API Key required, 100% Free & Unlimited).
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { PROVIDER_METADATA_MAP } from '../core/constants';
import { ProviderConfig, TrainDelayData } from '../core/types';
import { normalizeDateToIsoDate } from '../core/utils';
import { normalizeUnifiedTrainResponse } from './unified-adapter';

export const DIRECT_RAIL_METADATA = PROVIDER_METADATA_MAP['direct-rail-gateway'];

function generateGreqId(): string {
  const timestamp = Date.now();
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${timestamp}:${crypto.randomUUID()}`;
  }
  const randomHex = Math.random().toString(36).substring(2, 10);
  return `${timestamp}:b2367872-8356-4b4d-bd71-${randomHex}`;
}

export async function fetchDirectRailStatus(
  trainNumber: string,
  config: ProviderConfig,
  _apiKey?: string,
  travelDate?: string
): Promise<TrainDelayData> {
  const endpoint = config.apiEndpoint || DIRECT_RAIL_METADATA.defaultEndpoint!;
  const greq = generateGreqId();

  // Resolve active journey date: For future travel dates, query today's active run to track the live train on track
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayYmd = `${year}${month}${day}`;

  let formattedJourneyDate = todayYmd;
  if (travelDate) {
    const iso = normalizeDateToIsoDate(travelDate);
    const candidateDate = iso ? iso.replace(/-/g, '') : travelDate.replace(/-/g, '');
    if (candidateDate && candidateDate <= todayYmd) {
      formattedJourneyDate = candidateDate;
    }
  }

  const payload = {
    trainNumber: trainNumber.trim(),
    journeyDate: formattedJourneyDate,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500); // 6.5s timeout

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'bmirak': 'webmb',
        'Content-Language': 'en',
        'Content-Type': 'application/json; charset=UTF-8',
        'greq': greq,
        'Origin': 'https://www.irctc.co.in',
        'Referer': 'https://www.irctc.co.in/eticket/booking/live-train',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Direct Rail Gateway: Connection timed out (6.5s). Failover triggered.');
    }
    throw new Error(`Direct Rail Gateway: Network error (${err.message}). Failover triggered.`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Direct Rail Gateway: Handshake refreshed. Failover triggered.');
  }

  if (response.status === 429) {
    throw new Error('Direct Rail Gateway: Rate limit reached.');
  }

  if (!response.ok) {
    throw new Error(`Direct Rail Gateway HTTP error: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('Direct Rail Gateway: Challenge received. Failover triggered.');
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new Error('Direct Rail Gateway: Invalid JSON response from server.');
  }

  if (json.error || json.errorMessage || json.message) {
    throw new Error(json.error || json.errorMessage || json.message || 'Direct Rail Gateway returned error response');
  }

  return normalizeUnifiedTrainResponse(
    json,
    'direct-rail-gateway',
    DIRECT_RAIL_METADATA.name,
    trainNumber,
    formattedJourneyDate
  );
}
