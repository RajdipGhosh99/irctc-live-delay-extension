import { ProviderConfig, TrainDelayData } from '../types';
import { getIso8601Date } from '../iso-utils';
import { normalizeUnifiedTrainResponse } from './unified-adapter';

export const INDIAN_RAIL_API_METADATA = {
  id: 'indianrailapi' as const,
  name: 'IndianRailAPI.com',
  description: 'Direct Indian Railways API service provider (Non-RapidAPI direct key).',
  freeTierLimit: '250 calls/day free per token',
  perTokenQuota: 250,
  signupUrl: 'https://indianrailapi.com/',
  requiresKey: true,
  defaultEndpoint: 'https://indianrailapi.com/api/v2/LiveTrainStatus/apikey',
  isoStandardCompliant: true,
};

export async function fetchIndianRailApiStatus(
  trainNumber: string,
  config: ProviderConfig,
  apiKey: string,
  travelDate?: string
): Promise<TrainDelayData> {
  const now = new Date();
  const dateStr = travelDate ? travelDate.replace(/-/g, '') : getIso8601Date(now).replace(/-/g, '');
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
  const endpoint = config.apiEndpoint || INDIAN_RAIL_API_METADATA.defaultEndpoint;

  if (!cleanKey) {
    throw new Error('IndianRailAPI: Missing API Key.');
  }

  const url = `${endpoint.replace(/\/$/, '')}/${cleanKey}/TrainNumber/${trainNumber}/date/${dateStr}/`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_ERROR: Invalid or expired IndianRailAPI key.');
  }

  if (response.status === 429) {
    throw new Error('RATE_LIMIT: Daily quota exceeded for this IndianRailAPI token.');
  }

  if (!response.ok) {
    throw new Error(`IndianRailAPI HTTP error: ${response.status}`);
  }

  const json = await response.json();

  if (json.ResponseCode !== '200' && json.Message) {
    if (json.Message.includes('Limit') || json.Message.includes('Quota')) {
      throw new Error(`RATE_LIMIT: ${json.Message}`);
    }
    throw new Error(`IndianRailAPI: ${json.Message}`);
  }

  return normalizeUnifiedTrainResponse(
    json,
    INDIAN_RAIL_API_METADATA.id,
    INDIAN_RAIL_API_METADATA.name,
    trainNumber,
    travelDate
  );
}
