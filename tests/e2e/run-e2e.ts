/**
 * Selenium E2E Automated Multi-Provider Test Runner
 * Validates extension injection, pixel-perfect alignment, and hover popover across all vendors
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import fs from 'fs';
import path from 'path';
import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { DEFAULT_E2E_CONFIG } from './config';
import { createMockServer } from './mock-server';
import { PixelVerifier } from './pixel-verifier';

interface ProviderTestResult {
  providerId: string;
  providerName: string;
  url: string;
  badgeCount: number;
  alignmentPassed: boolean;
  deltaY: number;
  popoverHoverPassed: boolean;
  zeroDuplicatesPassed: boolean;
  screenshotFile?: string;
  error?: string;
}

async function runE2ESuite() {
  console.log('======================================================');
  console.log('🚀 Launching Selenium E2E Multi-Provider Test Suite');
  console.log('======================================================');

  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const isHeadful = args.includes('--headful') || process.env.HEADFUL === 'true';
  const targetProviderArg = args.find((a) => a.startsWith('--provider='))?.split('=')[1];

  const config = { ...DEFAULT_E2E_CONFIG };
  if (isHeadful) config.isHeadless = false;

  // Filter providers if specified
  const providersToTest = targetProviderArg
    ? config.providers.filter((p) => p.id.toLowerCase() === targetProviderArg.toLowerCase())
    : config.providers;

  console.log(`📍 Route Configured : ${config.sourceStation} (Kharagpur) ➔ ${config.destinationStation} (Howrah)`);
  console.log(`📅 Journey Date     : ${config.journeyDate}`);
  console.log(`🖥️  Mode             : ${isLive ? 'LIVE REMOTE PORTALS' : 'LOCAL DETERMINISTIC MOCK FIXTURES'}`);
  console.log(`👁️  Headless         : ${config.isHeadless ? '--headless=new' : 'Headful (Visual GUI)'}`);
  console.log(`🏢 Providers to Test: ${providersToTest.map((p) => p.name).join(', ')}`);
  console.log(`📦 Extension Dir    : ${config.distDir}\n`);

  if (!fs.existsSync(config.distDir) || !fs.existsSync(path.join(config.distDir, 'manifest.json'))) {
    console.error('❌ Error: Extension build dist/ directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  // Ensure screenshots directory exists
  if (!fs.existsSync(config.screenshotsDir)) {
    fs.mkdirSync(config.screenshotsDir, { recursive: true });
  }

  let mockServerInfo: { url: string; stop: () => Promise<void> } | null = null;
  if (!isLive) {
    mockServerInfo = await createMockServer(config.mockPort);
    console.log(`🌐 Mock Server running at: ${mockServerInfo.url}\n`);
  }

  // Configure Chrome Options with the Extension Loaded
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments(`--load-extension=${config.distDir}`);
  chromeOptions.addArguments(`--disable-extensions-except=${config.distDir}`);
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments(`--window-size=${config.viewportWidth},${config.viewportHeight}`);

  if (config.isHeadless) {
    chromeOptions.addArguments('--headless=new');
  }

  let driver: WebDriver | null = null;
  const results: ProviderTestResult[] = [];

  try {
    driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
    const verifier = new PixelVerifier(driver, config.maxVerticalOffsetDeltaPx);

    for (const provider of providersToTest) {
      console.log(`------------------------------------------------------`);
      console.log(`🧪 Testing Provider: [${provider.id}] ${provider.name}`);

      const testUrl = isLive
        ? provider.getLiveUrl(config.sourceStation, config.destinationStation, config.journeyDate)
        : `${mockServerInfo!.url}${provider.mockPath}`;

      console.log(`   Navigating to: ${testUrl}`);
      const result: ProviderTestResult = {
        providerId: provider.id,
        providerName: provider.name,
        url: testUrl,
        badgeCount: 0,
        alignmentPassed: false,
        deltaY: 0,
        popoverHoverPassed: false,
        zeroDuplicatesPassed: false,
      };

      try {
        await driver.get(testUrl);

        // Wait for page cards / DOM to mount
        await driver.sleep(1200);

        // Wait for content script to inject .rail-delay-wrapper (up to 6s)
        let badges: any[] = [];
        try {
          await driver.wait(until.elementLocated(By.css('.rail-delay-wrapper')), 6000);
          badges = await driver.findElements(By.css('.rail-delay-wrapper'));
        } catch {
          // If in mock mode, trigger orchestrator injection manually if script wasn't auto-injected by manifest matches
          const injected = await driver.executeScript<boolean>(`
            if (document.querySelectorAll('.rail-delay-wrapper').length > 0) return true;
            // Inject styles if needed
            const style = document.createElement('link');
            style.rel = 'stylesheet';
            style.href = 'http://127.0.0.1:${config.mockPort}/styles.css';
            document.head.appendChild(style);
            return false;
          `);
          badges = await driver.findElements(By.css('.rail-delay-wrapper'));
        }

        result.badgeCount = badges.length;
        console.log(`   ✅ Badges Detected on Page: ${badges.length}`);

        if (badges.length === 0) {
          throw new Error('No .rail-delay-wrapper elements found on the page.');
        }

        // Test 1: Verify Pixel-Perfect Alignment of the first card
        const firstBadge = badges[0];
        let cardParent: any = null;
        try {
          cardParent = await firstBadge.findElement(
            By.xpath('./ancestor::*[contains(@class, "card") or contains(@class, "detail") or contains(@class, "item") or contains(@class, "train") or self::app-train-item or contains(@id, "train")][1]')
          );
        } catch {
          cardParent = await firstBadge.findElement(By.xpath('./..'));
        }

        const alignment = await verifier.verifyBadgeAlignment(cardParent);
        result.alignmentPassed = alignment.isAlignedBesideTitle;
        result.deltaY = alignment.deltaY;

        console.log(`   📐 Alignment Beside Title : ${alignment.isAlignedBesideTitle ? '✅ PASSED' : '❌ FAILED'} (Vertical Delta Y: ${alignment.deltaY.toFixed(1)}px <= ${config.maxVerticalOffsetDeltaPx}px)`);
        console.log(`   🏷️  Train Title Text       : "${alignment.trainTitleText}"`);

        // Test 2: Verify Hover opens Popover
        const badgeButton = await firstBadge.findElement(By.css('.rail-delay-badge'));
        const actions = driver.actions({ async: true });
        await actions.move({ origin: badgeButton }).perform();

        // Wait for popover to open on hover
        await driver.sleep(600);

        const popoverStatus = await verifier.verifyPopoverContents(cardParent);
        result.popoverHoverPassed = popoverStatus.isDisplayed;
        result.zeroDuplicatesPassed = popoverStatus.zeroRawMinutesFound && popoverStatus.locationClean;

        console.log(`   🔍 Hover Popover Display   : ${popoverStatus.isDisplayed ? '✅ OPENED ON HOVER' : '❌ FAILED TO OPEN'}`);
        console.log(`   🎨 Color Classification    : ${popoverStatus.hasLateOrOntimeColor ? '✅ PASSED (' + popoverStatus.box1Class + ')' : '❌ FAILED'}`);
        console.log(`   🚫 Zero Redundant Data     : ${result.zeroDuplicatesPassed ? '✅ 100% CLEAN (No raw minutes / narratives)' : '❌ FAILED (' + popoverStatus.details.join(', ') + ')'}`);
        console.log(`   📏 Single-Line Footer      : ${popoverStatus.footerIsSingleLine ? '✅ PASSED' : '❌ FAILED'}`);

        // Capture Screenshot
        const screenshotFileName = `${provider.id}-kharagpur-to-howrah.png`;
        const screenshotFilePath = path.join(config.screenshotsDir, screenshotFileName);
        const screenshotBase64 = await driver.takeScreenshot();
        fs.writeFileSync(screenshotFilePath, screenshotBase64, 'base64');
        result.screenshotFile = screenshotFilePath;
        console.log(`   📸 Screenshot Saved        : ${screenshotFileName}`);
      } catch (err: any) {
        result.error = err.message || String(err);
        console.error(`   ❌ Provider Test Error: ${result.error}`);
      }

      results.push(result);
    }
  } finally {
    if (driver) {
      await driver.quit();
    }
    if (mockServerInfo) {
      await mockServerInfo.stop();
    }
  }

  // Print Consolidated Test Summary Table
  console.log('\n======================================================');
  console.log('📊 Consolidated Selenium E2E Test Report');
  console.log('======================================================');
  console.table(
    results.map((r) => ({
      Provider: r.providerName,
      Badges: r.badgeCount,
      'Aligned Beside': r.alignmentPassed ? '✅ YES' : '❌ NO',
      'Delta Y': `${r.deltaY.toFixed(1)}px`,
      'Hover Popover': r.popoverHoverPassed ? '✅ PASS' : '❌ FAIL',
      'Zero Duplicates': r.zeroDuplicatesPassed ? '✅ PASS' : '❌ FAIL',
      Status: !r.error && r.alignmentPassed && r.popoverHoverPassed && r.zeroDuplicatesPassed ? '✅ PASSED' : '❌ FAILED',
    }))
  );

  const passedCount = results.filter((r) => !r.error && r.alignmentPassed && r.popoverHoverPassed && r.zeroDuplicatesPassed).length;
  console.log(`\n🎉 Test Suite Completed: ${passedCount}/${results.length} Providers Verified Pixel-Perfect!`);
  console.log(`📂 Screenshots Directory: ${config.screenshotsDir}\n`);

  if (passedCount < results.length) {
    process.exitCode = 1;
  }
}

// Execute runner
runE2ESuite().catch((err) => {
  console.error('Fatal E2E Runner Error:', err);
  process.exit(1);
});
