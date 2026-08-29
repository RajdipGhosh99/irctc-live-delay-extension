import { ProviderConfig, TrainDelayData } from '../types';
import { normalizeUnifiedTrainResponse } from './unified-adapter';

export const INDIAN_RAIL_METADATA = {
  id: 'rapidapi-indianrail' as const,
  name: 'RapidAPI - Indian Rail API',
  description: 'Secondary RapidAPI provider for Indian Railways live train status.',
  freeTierLimit: '500 requests/month free per token',
  perTokenQuota: 500,
  signupUrl: 'https://rapidapi.com/ratishjain12/api/indian-railway-irctc',
  requiresKey: true,
  defaultHost: 'indian-railway-irctc.p.rapidapi.com',
  defaultEndpoint: 'https://indian-railway-irctc.p.rapidapi.com/api/v1/liveTrainStatus',
  isoStandardCompliant: true,
};

export async function fetchIndianRailStatus(
  trainNumber: string,
  config: ProviderConfig,
  apiKey: string,
  travelDate?: string
): Promise<TrainDelayData> {
  const endpoint = config.apiEndpoint || INDIAN_RAIL_METADATA.defaultEndpoint;
  const host = config.apiHost || INDIAN_RAIL_METADATA.defaultHost;
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');

  if (!cleanKey) {
    throw new Error('RapidAPI Indian Rail: Missing API Key.');
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
    throw new Error('AUTH_ERROR: Invalid or expired RapidAPI Key for Indian Rail.');
  }

  if (response.status === 429) {
    throw new Error('RATE_LIMIT: RapidAPI Indian Rail quota limit reached for this token.');
  }

  if (!response.ok) {
    throw new Error(`RapidAPI Indian Rail HTTP error: ${response.status}`);
  }

  const json = await response.json();

  if (json.message) {
    const msg = String(json.message).toLowerCase();
    if (msg.includes('exceeded') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('blocked')) {
      throw new Error('RATE_LIMIT: RapidAPI Indian Rail quota limit reached for this token.');
    }
  }

  return normalizeUnifiedTrainResponse(
    json,
    INDIAN_RAIL_METADATA.id,
    INDIAN_RAIL_METADATA.name,
    trainNumber,
    travelDate
  );
}
