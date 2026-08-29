import { ProviderConfig, TrainDelayData } from '../types';
import { normalizeUnifiedTrainResponse } from './unified-adapter';

export const IRCTC1_METADATA = {
  id: 'rapidapi-irctc1' as const,
  name: 'RapidAPI - IRCTC1',
  description: 'Most popular RapidAPI endpoint for live IRCTC train running status.',
  freeTierLimit: '500 requests/month free per token',
  perTokenQuota: 500,
  signupUrl: 'https://rapidapi.com/IRCTCAPI/api/irctc1',
  requiresKey: true,
  defaultHost: 'irctc1.p.rapidapi.com',
  defaultEndpoint: 'https://irctc1.p.rapidapi.com/api/v1/liveTrainStatus',
  isoStandardCompliant: true,
};

export async function fetchIrctc1Status(
  trainNumber: string,
  config: ProviderConfig,
  apiKey: string,
  travelDate?: string
): Promise<TrainDelayData> {
  const endpoint = config.apiEndpoint || IRCTC1_METADATA.defaultEndpoint;
  const host = config.apiHost || IRCTC1_METADATA.defaultHost;
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');

  if (!cleanKey) {
    throw new Error('RapidAPI IRCTC1: Missing API Key.');
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
      throw new Error('RapidAPI IRCTC1: Request timed out (8s).');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_ERROR: Invalid or expired RapidAPI Key for IRCTC1.');
  }

  if (response.status === 429) {
    throw new Error('RATE_LIMIT: RapidAPI IRCTC1 quota limit reached for this token.');
  }

  if (!response.ok) {
    throw new Error(`RapidAPI IRCTC1 HTTP error: ${response.status}`);
  }

  const json = await response.json();

  if (json.message) {
    const msg = String(json.message).toLowerCase();
    if (msg.includes('exceeded') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('blocked')) {
      throw new Error('RATE_LIMIT: RapidAPI IRCTC1 quota limit reached for this token.');
    }
  }

  if (json.status === false && json.message) {
    throw new Error(json.message);
  }

  return normalizeUnifiedTrainResponse(
    json,
    IRCTC1_METADATA.id,
    IRCTC1_METADATA.name,
    trainNumber,
    travelDate
  );
}
