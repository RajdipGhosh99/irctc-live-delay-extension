/**
 * Background Service Worker for Live Train Delay Tracker
 * Handles caching, API dispatching, key rotation, and options tab routing
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { clearAllCache, getCachedTrainData, loadSettings, saveSettings, setCachedTrainData } from '../core/storage';
import { ExtensionMessage, MultiProviderSettings, ProviderId, TrainDelayData } from '../core/types';
import { dispatchTrainDelayQuery } from '../providers/ProviderCoordinator';

// Runtime message listener
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then((response) => sendResponse(response))
    .catch((err) => sendResponse({ success: false, error: err.message }));

  return true; // Keep message channel open for async response
});

async function handleMessage(message: ExtensionMessage): Promise<any> {
  switch (message.type) {
    case 'FETCH_DELAY': {
      const { trainNumber, providerId, forceRefresh, travelDate } = message;
      if (!trainNumber) {
        throw new Error('Missing trainNumber in FETCH_DELAY message');
      }

      const settings = await loadSettings();

      // 1. Check local cache (unless forceRefresh is true)
      if (!forceRefresh) {
        const cached = await getCachedTrainData(trainNumber, settings.cacheTtlMinutes || 15);
        if (cached) {
          return { success: true, data: cached, fromCache: true };
        }
      }

      // 2. Fetch live data via Provider Coordinator
      const liveData = await dispatchTrainDelayQuery(
        trainNumber,
        settings,
        providerId as ProviderId | undefined,
        travelDate
      );

      // 3. Save to local cache
      await setCachedTrainData(liveData, settings.cacheTtlMinutes || 15);

      return { success: true, data: liveData, fromCache: false };
    }

    case 'GET_SETTINGS': {
      const settings = await loadSettings();
      return { success: true, settings };
    }

    case 'SAVE_SETTINGS': {
      await saveSettings(message.settings as MultiProviderSettings);
      return { success: true };
    }

    case 'CLEAR_CACHE': {
      await clearAllCache();
      return { success: true };
    }

    case 'OPEN_OPTIONS': {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      }
      return { success: true };
    }

    case 'TEST_KEY': {
      const { providerId, apiKey, apiHost } = message;
      const testSettings = await loadSettings();
      const tempConfig = {
        enabled: true,
        keys: [{ id: 'test', key: apiKey, status: 'active' as const, requestCount: 0 }],
        apiKey,
        apiHost,
      };
      testSettings.providers[providerId] = tempConfig;

      // Test with Rajdhani Express (#12952)
      const testResult = await dispatchTrainDelayQuery('12952', testSettings, providerId);
      return { success: true, data: testResult };
    }

    default:
      throw new Error(`Unhandled message type: ${(message as any)?.type}`);
  }
}

// Extension installation & update handler
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[TrainDelayTracker] Extension installed / updated: ${details.reason}`);
  const settings = await loadSettings();
  await saveSettings(settings);
});
