/**
 * Custom Webhook Provider
 * Connects to user-configured private endpoints or proxies
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { PROVIDER_METADATA_MAP } from '../core/constants';
import { ProviderConfig, TrainDelayData } from '../core/types';
import { normalizeUnifiedTrainResponse } from './unified-adapter';

export const CUSTOM_PROVIDER_METADATA = PROVIDER_METADATA_MAP['custom-webhook'];

export async function fetchCustomProviderStatus(
  trainNumber: string,
  config: ProviderConfig,
  apiKey?: string,
  travelDate?: string
): Promise<TrainDelayData> {
  const endpoint = config.apiEndpoint;
  if (!endpoint) {
    throw new Error('Custom Webhook: No API endpoint configured.');
  }

  const cleanEndpoint = endpoint
    .replace(/\{trainNumber\}|\{trainNo\}|\{train\}/gi, trainNumber)
    .replace(/\{date\}|\{journeyDate\}/gi, travelDate || '');

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    headers['x-api-key'] = apiKey.trim();
  }

  if (config.apiHost) {
    headers['Host'] = config.apiHost.trim();
  }

  const response = await fetch(cleanEndpoint, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Custom Webhook HTTP error: ${response.status}`);
  }

  const json = await response.json();
  return normalizeUnifiedTrainResponse(
    json,
    'custom-webhook',
    CUSTOM_PROVIDER_METADATA.name,
    trainNumber,
    travelDate
  );
}
