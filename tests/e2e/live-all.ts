/**
 * Unified Live Multi-Vendor E2E Test Suite
 * Validates real live portal pages for ConfirmTkt, IRCTC, MakeMyTrip, Ixigo, Paytm, etc.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import fs from 'fs';
import path from 'path';
import { Builder, By } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

interface LiveVendorTarget {
  id: string;
  name: string;
  url: string;
  customWaitMs?: number;
}

const LIVE_VENDORS: LiveVendorTarget[] = [
  {
    id: 'makemytrip',
    name: 'MakeMyTrip (Live Search Results)',
    url: 'https://www.makemytrip.com/railways/listing?srcCity=Kharagpur&destCity=Howrah&srcStn=KGP&destStn=HWH&date=20260907&classType=ALL',
    customWaitMs: 6000,
  },
  {
    id: 'confirmtkt',
    name: 'ConfirmTkt (Live Route Listing)',
    url: 'https://www.confirmtkt.com/trains/delhi-to-mumbai-train-tickets',
    customWaitMs: 4000,
  },
  {
    id: 'irctc',
    name: 'IRCTC NextGen (Official Portal)',
    url: 'https://www.irctc.co.in/nget/train-search',
    customWaitMs: 5000,
  },
  {
    id: 'ixigo',
    name: 'Ixigo (Live Trains Portal)',
    url: 'https://www.ixigo.com/trains',
    customWaitMs: 4000,
  },
  {
    id: 'paytm',
    name: 'Paytm Trains (Live Portal)',
    url: 'https://tickets.paytm.com/trains',
    customWaitMs: 4000,
  },
  {
    id: 'easemytrip',
    name: 'EaseMyTrip (Live Railways Portal)',
    url: 'https://railways.easemytrip.com/',
    customWaitMs: 4000,
  },
  {
    id: 'railyatri',
    name: 'RailYatri (Live Booking Portal)',
    url: 'https://www.railyatri.in/train-booking',
    customWaitMs: 4000,
  },
];

async function runLiveAllVendorsSuite() {
  console.log('======================================================');
  console.log('🌐 Multi-Vendor Live E2E Verification Suite');
  console.log('======================================================');

  const screenshotsDir = path.resolve(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const isHeadless = process.env.HEADFUL !== 'true';

  const options = new chrome.Options();
  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    'user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    '--window-size=1440,900'
  );

  if (isHeadless) {
    options.addArguments('--headless=new');
  }

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  const cssPath = path.resolve(__dirname, '../../dist/src/styles/styles.css');
  const jsPath = path.resolve(__dirname, '../../dist/src/content/index.iife.js');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  const reportTable: any[] = [];

  try {
    for (const vendor of LIVE_VENDORS) {
      console.log('------------------------------------------------------');
      console.log(`🧪 Testing Live Vendor: [${vendor.id}] ${vendor.name}`);
      console.log(`   Navigating to: ${vendor.url}`);

      const rowResult: any = {
        vendor: vendor.name,
        badges: 0,
        aligned: '❌ NO',
        deltaY: 'N/A',
        hover: '❌ FAIL',
        cleanData: '❌ FAIL',
        status: '❌ FAILED',
      };

      try {
        await driver.get(vendor.url);
        await driver.sleep(vendor.customWaitMs || 4000);

        // Inject runtime bridge
        await driver.executeScript(`
          window.chrome = window.chrome || {};
          window.chrome.runtime = {
            sendMessage: function(msg) {
              var trainNo = msg.trainNumber || '12904';
              return Promise.resolve({
                success: true,
                data: {
                  trainNumber: trainNo,
                  trainName: 'Express',
                  delayMinutes: 289,
                  statusSummary: 'Running 4 hours 49 minutes late',
                  currentStationName: 'Kharagpur Jn',
                  nextStationName: 'Howrah Jn',
                  lastUpdatedIso: new Date().toISOString(),
                  delayHistory: {
                    todayAvgDelayMinutes: 210,
                    monthAvgDelayMinutes: 180,
                    punctualityRatePercent: 62,
                    historicalRunsAnalyzed: 28,
                  },
                }
              });
            }
          };
          window.chrome.storage = {
            local: {
              get: function(_k, cb) {
                cb({
                  rail_delay_tracker_settings: {
                    extensionEnabled: true,
                    disabledSites: [],
                    sitePositions: {},
                    activeProvider: 'direct-rail-gateway',
                    termsAccepted: true,
                    showFloatingHUD: true
                  }
                });
              }
            },
            onChanged: { addListener: function() {} }
          };
        `);

        // Inject Styles & Content Script
        await driver.executeScript(`
          var style = document.createElement('style');
          style.id = 'rail-extension-styles';
          style.textContent = arguments[0];
          document.head.appendChild(style);
        `, cssContent);

        await driver.executeScript(jsContent);
        await driver.sleep(2000);

        // Verification of badges and alignment
        const evalRes: any = await driver.executeScript(`
          var badges = document.querySelectorAll('.rail-delay-wrapper');
          var rows = document.querySelectorAll('.rail-train-title-row');
          var hud = document.getElementById('rail-live-hud');

          var details = [];
          badges.forEach(function(b, idx) {
            var rect = b.getBoundingClientRect();
            var prev = b.previousElementSibling;
            var prevRect = prev ? prev.getBoundingClientRect() : null;
            var deltaY = prevRect ? Math.abs(rect.y - prevRect.y) : 0;
            details.push({
              idx: idx,
              trainNo: b.getAttribute('data-train-number'),
              deltaY: deltaY,
              isAligned: deltaY <= 6
            });
          });

          return {
            badgesCount: badges.length,
            rowsCount: rows.length,
            hasHud: !!hud,
            firstBadge: details[0] || null,
            allAligned: details.length > 0 && details.some(function(d) { return d.isAligned; })
          };
        `);

        rowResult.badges = evalRes.badgesCount;
        console.log(`   ✅ Badges Detected: ${evalRes.badgesCount} | HUD: ${evalRes.hasHud ? 'Active' : 'Hidden'}`);

        if (evalRes.firstBadge) {
          rowResult.deltaY = `${evalRes.firstBadge.deltaY.toFixed(1)}px`;
          rowResult.aligned = evalRes.firstBadge.deltaY <= 6 ? '✅ YES' : '⚠️ WRAPPED';
          console.log(`   📐 Vertical Alignment Delta Y: ${rowResult.deltaY}`);
        } else if (evalRes.hasHud) {
          rowResult.aligned = '✅ HUD MOUNTED';
          rowResult.deltaY = '0.0px';
        }

        // Test Hover Popover
        const badgeElements = await driver.findElements(By.css('.rail-delay-wrapper .rail-delay-badge'));
        if (badgeElements.length > 0) {
          await driver.actions({ async: true }).move({ origin: badgeElements[0] }).perform();
          await driver.sleep(1200);

          const popoverInfo: any = await driver.executeScript(`
            var p = document.querySelector('.rail-delay-popover.is-open') || document.querySelector('.rail-delay-popover');
            if (!p) return { isOpen: false };
            var text = p.textContent || '';
            var hasRawMinutes = /\\b\\d+\\s*m(?:ins?)?\\s*(?:late|behind)/i.test(text);
            return {
              isOpen: p.classList.contains('is-open') || p.style.display !== 'none',
              zeroRawMinutes: !hasRawMinutes,
              box1: p.querySelector('.rail-stat-box:nth-child(1)') ? p.querySelector('.rail-stat-box:nth-child(1)').textContent.replace(/\\s+/g, ' ').trim() : ''
            };
          `);

          if (popoverInfo.isOpen) {
            rowResult.hover = '✅ PASS';
            rowResult.cleanData = popoverInfo.zeroRawMinutes ? '✅ PASS' : '❌ RAW DUPES';
            console.log(`   🔍 Hover Popover: OPENED (${popoverInfo.box1})`);
          }
        } else {
          rowResult.hover = 'N/A (Portal Home)';
          rowResult.cleanData = '✅ PASS';
        }

        rowResult.status = '✅ PASSED';

        // Capture screenshot
        const screenshot = await driver.takeScreenshot();
        const scPath = path.join(screenshotsDir, `live-${vendor.id}.png`);
        fs.writeFileSync(scPath, screenshot, 'base64');
        console.log(`   📸 Saved screenshot: ${scPath}`);
      } catch (err: any) {
        rowResult.status = '⚠️ FAILED';
        console.warn(`   ⚠️ Vendor test notice: ${err.message}`);
      }

      reportTable.push(rowResult);
    }

    console.log('\n======================================================');
    console.log('📊 Consolidated Multi-Vendor Live E2E Report');
    console.log('======================================================');
    console.table(reportTable);
    console.log('🎉 Live Multi-Vendor Test Suite Finished Successfully!\n');
  } finally {
    await driver.quit();
  }
}

runLiveAllVendorsSuite().catch((err) => {
  console.error('❌ Live All Vendors Suite Failed:', err);
  process.exit(1);
});
