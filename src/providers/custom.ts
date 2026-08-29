import { ProviderConfig, TrainDelayData } from '../types';
import { normalizeUnifiedTrainResponse } from './unified-adapter';

export const CUSTOM_PROVIDER_METADATA = {
  id: 'custom' as const,
  name: 'Custom Reverse Proxy / Self-Hosted',
  description: 'Self-hosted backend or proxy that standardizes live train running status.',
  freeTierLimit: 'Unlimited (Depends on your server)',
  perTokenQuota: 10000,
  signupUrl: '',
  requiresKey: false,
  defaultEndpoint: 'http://localhost:3000/api/train-delay',
  isoStandardCompliant: true,
};

export async function fetchCustomProviderStatus(
  trainNumber: string,
  config: ProviderConfig,
  apiKey?: string,
  travelDate?: string
): Promise<TrainDelayData> {
  const endpoint = config.apiEndpoint || CUSTOM_PROVIDER_METADATA.defaultEndpoint;
  const url = new URL(endpoint);
  url.searchParams.set('trainNumber', trainNumber);
  if (travelDate) url.searchParams.set('date', travelDate);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Custom Proxy HTTP Error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  return normalizeUnifiedTrainResponse(
    json,
    CUSTOM_PROVIDER_METADATA.id,
    CUSTOM_PROVIDER_METADATA.name,
    trainNumber,
    travelDate
  );
}
