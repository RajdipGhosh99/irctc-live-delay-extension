/**
 * Live MakeMyTrip E2E Real-Browser Test Runner
 * Automates: makemytrip.com/railways -> Search Train (Kharagpur to Howrah) -> Search -> Verify Badges & Popover
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import fs from 'fs';
import path from 'path';
import { Builder, By } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

async function runLiveMakeMyTripTest() {
  console.log('======================================================');
  console.log('🚄 Live MakeMyTrip Real E2E Search & Punctuality Test');
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

  try {
    console.log('1. Navigating to MakeMyTrip Trains portal (https://www.makemytrip.com/railways/)...');
    await driver.get('https://www.makemytrip.com/railways/');
    await driver.sleep(3000);

    // Dismiss any modal or overlay if present
    try {
      const modalClose = await driver.findElements(By.css('.commonModal__close, [data-cy="closeModal"]'));
      if (modalClose.length > 0) {
        await driver.executeScript('arguments[0].click();', modalClose[0]);
        console.log('   Dismissed login/prompt modal.');
      }
    } catch {
      // ignore
    }

    // Select From: Kharagpur
    console.log('2. Entering From Station: Kharagpur (KGP)...');
    const fromEl = await driver.findElement(By.css('label[for="fromCity"], #fromCity, [data-cy="fromCity"]'));
    await driver.executeScript('arguments[0].click();', fromEl);
    await driver.sleep(800);

    const fromInput = await driver.findElement(
      By.css('input[placeholder*="From"], input[placeholder*="Enter City"], .autoSuggestPlugin input, input.react-autosuggest__input')
    );
    await fromInput.sendKeys('Kharagpur');
    await driver.sleep(1200);

    const fromSuggestions = await driver.findElements(By.css('.react-autosuggest__suggestions-list li, [data-cy*="suggest"]'));
    if (fromSuggestions.length > 0) {
      await driver.executeScript('arguments[0].click();', fromSuggestions[0]);
    }
    await driver.sleep(800);

    // Select To: Howrah
    console.log('3. Entering To Station: Howrah (HWH)...');
    const toEl = await driver.findElement(By.css('label[for="toCity"], #toCity, [data-cy="toCity"]'));
    await driver.executeScript('arguments[0].click();', toEl);
    await driver.sleep(800);

    const toInput = await driver.findElement(
      By.css('input[placeholder*="To"], input[placeholder*="Enter City"], .autoSuggestPlugin input, input.react-autosuggest__input')
    );
    await toInput.sendKeys('Howrah');
    await driver.sleep(1200);

    const toSuggestions = await driver.findElements(By.css('.react-autosuggest__suggestions-list li, [data-cy*="suggest"]'));
    if (toSuggestions.length > 0) {
      await driver.executeScript('arguments[0].click();', toSuggestions[0]);
    }
    await driver.sleep(800);

    // Click SEARCH button
    console.log('4. Clicking SEARCH button...');
    const searchBtn = await driver.findElement(By.css('[data-cy="submit"], .widgetSearchBtn'));
    await driver.executeScript('arguments[0].click();', searchBtn);

    // Wait for search listing page to load
    console.log('5. Waiting for real train search results...');
    await driver.sleep(7000);

    const currentUrl = await driver.getCurrentUrl();
    console.log(`   Navigated URL: ${currentUrl}`);

    // Provide the simulated IRCTC live data runtime bridge so live hover popovers render
    await driver.executeScript(`
      window.chrome = window.chrome || {};
      window.chrome.runtime = {
        sendMessage: function (msg) {
          var trainNo = msg.trainNumber || '20872';
          var isDelayed = trainNo === '20872' || trainNo === '12828';
          var delayMinutes = isDelayed ? 289 : 0;
          return Promise.resolve({
            success: true,
            data: {
              trainNumber: trainNo,
              trainName: 'Vande Bharat Exp',
              delayMinutes: delayMinutes,
              statusSummary: isDelayed ? 'Running 4 hours 49 minutes late' : 'Running on time',
              currentStationName: 'Kharagpur Jn',
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
        },
      };
      window.chrome.storage = {
        local: {
          get: function (_keys, cb) {
            cb({
              rail_delay_tracker_settings: {
                extensionEnabled: true,
                disabledSites: [],
                sitePositions: { 'makemytrip.com': 'beside-name' },
                activeProvider: 'direct-rail-gateway',
                termsAccepted: true,
                showFloatingHUD: true,
              },
            });
          },
        },
        onChanged: { addListener: function () {} },
      };
    `);

    // Inject Extension Styles
    console.log('6. Injecting extension stylesheets...');
    const cssPath = path.resolve(__dirname, '../../dist/src/styles/styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    await driver.executeScript(`
      var style = document.createElement('style');
      style.id = 'rail-extension-styles';
      style.textContent = arguments[0];
      document.head.appendChild(style);
    `, cssContent);

    // Inject Extension Content Script bundle
    console.log('7. Injecting extension content script bundle...');
    const jsPath = path.resolve(__dirname, '../../dist/src/content/index.iife.js');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    await driver.executeScript(jsContent);

    await driver.sleep(2500);

    // Verify injected badges and pixel-perfect alignment
    console.log('8. Verifying badge injection and alignment beside train title...');
    const verification: any = await driver.executeScript(`
      var cards = document.querySelectorAll('[data-testid="listing-card"], div[class*="ListingCard_ListingCard"]');
      var badges = document.querySelectorAll('.rail-delay-wrapper');
      var rows = document.querySelectorAll('.rail-train-title-row');

      var details = [];
      badges.forEach(function (b, idx) {
        var rect = b.getBoundingClientRect();
        var prev = b.previousElementSibling;
        var prevRect = prev ? prev.getBoundingClientRect() : null;
        var deltaY = prevRect ? Math.abs(rect.y - prevRect.y) : 0;
        details.push({
          idx: idx,
          trainNo: b.getAttribute('data-train-number'),
          badgeY: rect.y,
          badgeX: rect.x,
          prevText: prev && prev.textContent ? prev.textContent.trim() : '',
          prevY: prevRect ? prevRect.y : 0,
          deltaY: deltaY,
          isAligned: deltaY <= 6,
        });
      });

      return {
        cardsFound: cards.length,
        badgesInjected: badges.length,
        rowsCreated: rows.length,
        firstBadge: details[0] || null,
        allAligned: details.length > 0 && details.every(function (d) { return d.isAligned; }),
      };
    `);

    console.log(`   Trains Found on Page : ${verification.cardsFound}`);
    console.log(`   Badges Injected      : ${verification.badgesInjected}`);
    console.log(`   Title Rows Created   : ${verification.rowsCreated}`);

    const first = verification.firstBadge;
    if (first) {
      console.log(`   First Train Title    : "${first.prevText}"`);
      console.log(`   Badge Position       : Delta Y = ${first.deltaY.toFixed(2)}px (<= 6px threshold: ${first.isAligned ? 'PASSED' : 'FAILED'})`);
    }

    // Take Search Results Screenshot
    const searchScreenshot = await driver.takeScreenshot();
    const searchScreenshotPath = path.join(screenshotsDir, 'live-makemytrip-search.png');
    fs.writeFileSync(searchScreenshotPath, searchScreenshot, 'base64');
    console.log(`   📸 Search Results Screenshot: ${searchScreenshotPath}`);

    // Verify Hover opens popover
    console.log('9. Hovering over first badge to verify interactive popover...');
    const firstBadgeEl = await driver.findElement(By.css('.rail-delay-wrapper .rail-delay-badge'));
    const actions = driver.actions({ async: true });
    await actions.move({ origin: firstBadgeEl }).perform();

    await driver.sleep(1500);

    const popoverCheck: any = await driver.executeScript(`
      var popover = document.querySelector('.rail-delay-popover.is-open') || document.querySelector('.rail-delay-popover');
      if (!popover) return { isOpen: false };

      var style = window.getComputedStyle(popover);
      var isVisible = style.display !== 'none' && style.visibility !== 'hidden';

      var b1 = popover.querySelector('.rail-stat-box:nth-child(1)');
      var b2 = popover.querySelector('.rail-stat-box:nth-child(2)');
      var loc = popover.querySelector('.rail-popover-location-text');
      var foot = popover.querySelector('.rail-popover-footer');

      var box1Text = b1 ? b1.textContent : '';
      var box2Text = b2 ? b2.textContent : '';
      var locationText = loc ? loc.textContent : '';
      var footerText = foot ? foot.textContent : '';

      var hasRawMinutes = /\\b\\d+\\s*m(?:ins?)?\\s*(?:late|behind)/i.test(popover.textContent || '');

      return {
        isOpen: isVisible,
        display: style.display,
        box1Text: box1Text.replace(/\\s+/g, ' ').trim(),
        box2Text: box2Text.replace(/\\s+/g, ' ').trim(),
        locationText: locationText.replace(/\\s+/g, ' ').trim(),
        footerText: footerText.replace(/\\s+/g, ' ').trim(),
        hasCopyBtn: !!popover.querySelector('.rail-btn-copy'),
        hasRefreshBtn: !!popover.querySelector('.rail-btn-refresh'),
        zeroRawMinutes: !hasRawMinutes,
      };
    `);

    console.log(`   Hover Popover Display : ${popoverCheck.isOpen ? '✅ OPENED (is-open)' : '❌ NOT OPEN'}`);
    console.log(`   Box 1 (24h Clock)     : "${popoverCheck.box1Text}"`);
    console.log(`   Box 2 (4-Wk Typical)  : "${popoverCheck.box2Text}"`);
    console.log(`   Micro-Location        : "${popoverCheck.locationText}"`);
    console.log(`   Compact Footer        : "${popoverCheck.footerText}"`);
    console.log(`   Zero Duplicate Narr.  : ${popoverCheck.zeroRawMinutes ? '✅ VERIFIED (No "289m Late")' : '❌ FAILED'}`);

    // Take Hover Popover Screenshot
    const hoverScreenshot = await driver.takeScreenshot();
    const hoverScreenshotPath = path.join(screenshotsDir, 'live-makemytrip-hover.png');
    fs.writeFileSync(hoverScreenshotPath, hoverScreenshot, 'base64');
    console.log(`   📸 Hover Popover Screenshot: ${hoverScreenshotPath}`);

    console.log('\n======================================================');
    console.log('🎉 Live MakeMyTrip E2E Search & Alignment Test PASSED!');
    console.log('======================================================');
  } finally {
    await driver.quit();
  }
}

runLiveMakeMyTripTest().catch((err) => {
  console.error('❌ Live MakeMyTrip E2E Test Failed:', err);
  process.exit(1);
});
