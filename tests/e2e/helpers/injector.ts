import fs from 'fs';
import path from 'path';
import { Page } from 'playwright';

export async function injectExtensionInPlaywrightPage(
  page: Page,
  distDir: string,
  defaultTrainNo = '12842',
  position: 'beside-name' | 'card-header-right' | 'below-name' = 'beside-name'
) {
  const cssPath = path.join(distDir, 'src/styles/styles.css');
  const jsPath = path.join(distDir, 'src/content/index.iife.js');
  const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const jsContent = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : '';

  const payload = JSON.stringify({ css: cssContent, defaultNo: defaultTrainNo, position: position });

  // 1. Clean existing wrappers
  await page.evaluate(`
    (function() {
      document.querySelectorAll('.rail-delay-wrapper').forEach(function(w) { w.remove(); });
      document.querySelectorAll('[data-rail-train]').forEach(function(c) { c.removeAttribute('data-rail-train'); });
    })()
  `);

  const bridgeScript = `(function(args) {
    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || {};
    window.chrome.runtime.sendMessage = function (msg) {
      var trainNo = (msg && msg.trainNumber) || args.defaultNo || '12842';
      var isDelayed = true;
      var delayMinutes = 289;
      return Promise.resolve({
        success: true,
        data: {
          trainNumber: trainNo,
          trainName: (msg && msg.trainName) || 'Superfast Express',
          delayMinutes: delayMinutes,
          statusSummary: isDelayed ? 'Running 4 hours 49 minutes late' : 'Running on time',
          currentStationName: isDelayed ? 'Kharagpur Jn' : 'Santragachi',
          nextStationName: 'Howrah Jn',
          lastUpdatedIso: new Date().toISOString(),
          delayHistory: {
            todayAvgDelayMinutes: isDelayed ? 210 : 0,
            monthAvgDelayMinutes: isDelayed ? 180 : 5,
            punctualityRatePercent: isDelayed ? 62 : 94,
            historicalRunsAnalyzed: 28,
          },
        },
      });
    };
    window.chrome.runtime.onMessage = window.chrome.runtime.onMessage || { addListener: function () {} };

    window.chrome.storage = window.chrome.storage || {};
    window._mockStorageData = window._mockStorageData || {};
    var host = window.location.hostname.replace(/^www\\./, '');
    window._mockStorageData[host] = args.position || 'beside-name';

    window.chrome.storage.local = {
      get: function (_keys, cb) {
        var sitePositions = {};
        sitePositions[host] = window._mockStorageData[host] || 'beside-name';
        var settings = {
          extensionEnabled: true,
          disabledSites: [],
          sitePositions: sitePositions,
          activeProvider: 'direct-rail-gateway',
          termsAccepted: true,
          showFloatingHUD: true,
        };
        cb({ rail_delay_tracker_settings: settings });
      },
      set: function(obj, cb) {
        if (obj && obj.rail_delay_tracker_settings && obj.rail_delay_tracker_settings.sitePositions) {
          var p = obj.rail_delay_tracker_settings.sitePositions[host];
          if (p) window._mockStorageData[host] = p;
        }
        if (cb) cb();
      }
    };
    window.chrome.storage.onChanged = window.chrome.storage.onChanged || {
      _listeners: [],
      addListener: function(fn) { this._listeners.push(fn); },
      dispatch: function(changes, ns) {
        this._listeners.forEach(function(l) { l(changes, ns); });
      }
    };

    if (!document.getElementById('rail-extension-styles') && args.css) {
      var s = document.createElement('style');
      s.id = 'rail-extension-styles';
      s.textContent = args.css;
      document.head.appendChild(s);
    }
  })(${payload});`;

  await page.evaluate(bridgeScript);
  await page.evaluate(jsContent);
  await page.waitForTimeout(1000);
}
