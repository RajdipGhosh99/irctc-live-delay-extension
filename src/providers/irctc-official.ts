/**
 * Official Direct IRCTC (NTES) Live Train Tracking Provider
 * Priority #1 Direct Endpoint from www.irctc.co.in (Zero API Key required, 100% Free & Unlimited).
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { ProviderConfig, TrainDelayData } from '../types';
import { normalizeUnifiedTrainResponse } from './unified-adapter';
import { normalizeDateToIsoDate } from '../utils/iso-utils';

export const IRCTC_OFFICIAL_METADATA = {
  id: 'irctc-official' as const,
  name: 'Official IRCTC (NTES Direct)',
  description: 'Official Indian Railways NTES live tracking directly from irctc.co.in.',
  freeTierLimit: '100% Free & Unlimited (Official NTES)',
  perTokenQuota: 999999,
  signupUrl: 'https://www.irctc.co.in/eticket/booking/live-train',
  requiresKey: false,
  defaultEndpoint: 'https://www.irctc.co.in/eticketing/protected/mapps1/ntesData',
  isoStandardCompliant: true,
};

function generateGreqId(): string {
  const timestamp = Date.now();
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${timestamp}:${crypto.randomUUID()}`;
  }
  const randomHex = Math.random().toString(36).substring(2, 10);
  return `${timestamp}:b2367872-8356-4b4d-bd71-${randomHex}`;
}

export async function fetchIrctcOfficialStatus(
  trainNumber: string,
  config: ProviderConfig,
  _apiKey?: string,
  travelDate?: string
): Promise<TrainDelayData> {
  const endpoint = config.apiEndpoint || IRCTC_OFFICIAL_METADATA.defaultEndpoint;
  const greq = generateGreqId();

  // Resolve active journey date: If searching for a future date, query today's active run so NTES tracks live status
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

  console.log(`[Official NTES] 🚀 Querying ${endpoint} for Train #${trainNumber} (activeDate: ${formattedJourneyDate})...`);

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
      throw new Error('Official NTES: Connection timed out (6.5s). Falling over to next provider...');
    }
    throw new Error(`Official NTES: Network error (${err.message}). Falling over to next provider...`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Official NTES: Active session or Bot Shield handshake required.');
  }

  if (response.status === 429) {
    throw new Error('Official NTES: Rate limit exceeded.');
  }

  if (!response.ok) {
    throw new Error(`Official NTES HTTP error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  if (!text || text.trim().length === 0 || text.trim().startsWith('<')) {
    throw new Error('Official NTES: Bot challenge received. Falling over to next configured provider...');
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Official NTES: Invalid JSON response from server.');
  }

  if (json.error || json.errorMessage || (json.status === false && json.message)) {
    throw new Error(json.error || json.errorMessage || json.message || 'Official NTES returned error response');
  }

  console.log(`[Official NTES] ✅ Success for Train #${trainNumber}!`);

  return normalizeUnifiedTrainResponse(
    json,
    IRCTC_OFFICIAL_METADATA.id,
    IRCTC_OFFICIAL_METADATA.name,
    trainNumber,
    travelDate
  );
}
