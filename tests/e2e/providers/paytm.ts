import path from 'path';
import { BrowserContext } from 'playwright';
import {
  ALL_VENDOR_CONFIGS,
  DEFAULT_GLOBAL_ROUTING,
  formatRoutingDates,
} from '../../../src/portals/configs';
import { PlaywrightPortalResult } from '../helpers/types';
import { injectExtensionInPlaywrightPage } from '../helpers/injector';
import {
  navigatePortalWithResilience,
  testBadgePositionSequence,
  verifyHoverPopoverInteractivity,
} from '../helpers/verifiers';

export async function verifyPaytmProvider(
  context: BrowserContext,
  distDir: string,
  screenshotsDir: string,
  isHeadless: boolean
): Promise<PlaywrightPortalResult> {
  console.log('\n----------------------------------------------------------------');
  console.log('🚄 [8/9] OPENING PROVIDER: Paytm Trains (Live Search)');
  console.log('----------------------------------------------------------------');

  const page = await context.newPage();
  const searchPageUrl = 'https://tickets.paytm.com/trains/';
  const screenshotFile = 'playwright-08-paytm-live.png';

  const result: PlaywrightPortalResult = {
    step: 8,
    portal: 'Paytm Trains (Live)',
    url: searchPageUrl,
    trainsIdentified: 0,
    buttonInjected: false,
    positions: { besideName: false, headerRight: false, belowName: false },
    deltaY: 0,
    popover: {
      opened: false,
      box1Class: '',
      colorsPassed: false,
      locationClean: false,
      locationText: '',
      zeroDuplicates: false,
      clockFormatted: false,
      actionButtons: false,
    },
    screenshotFile,
    status: 'FAILED',
  };

  try {
    console.log(`   Navigating to search page: ${searchPageUrl}`);
    await navigatePortalWithResilience(page, searchPageUrl, 35000);
    await page.waitForTimeout(3000);

    // Enter source station (NDLS)
    console.log('   Entering source station: New Delhi (NDLS)...');
    await page.locator('[data-testid="sourceInput"], #sourceInput').fill('New Delhi');
    await page.waitForTimeout(1000);
    try {
      await page.locator('text=NDLS').first().click();
    } catch {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(1000);

    // Enter destination station (CNB)
    console.log('   Entering destination station: Kanpur (CNB)...');
    await page.locator('[data-testid="destinationInput"], #destinationInput').fill('Kanpur');
    await page.waitForTimeout(1000);
    try {
      await page.locator('text=CNB').first().click();
    } catch {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(1000);

    // Click Search Trains
    console.log('   Clicking "Search Trains" button...');
    await page.locator('button:has-text("Search Trains")').click();
    await page.waitForTimeout(7000);

    result.url = page.url();
    console.log(`   Navigated to live results: ${result.url}`);

    let cardCount = await page.locator('div.b6HHQ, div[class*="b6HHQ"], div._2q7r, div._3_8g').count();
    result.trainsIdentified = cardCount;
    console.log(`   ✅ Real Live Train Cards Identified on Paytm: ${cardCount}`);

    await injectExtensionInPlaywrightPage(page, distDir, '12556', 'beside-name');
    let badges = await page.locator('.rail-delay-wrapper').count();
    result.buttonInjected = badges > 0;
    console.log(`   ✅ Live Badges Injected on Paytm: ${badges}`);

    if (badges > 0) {
      console.log(`   🏷️  Testing Sequential Badge Positions (Set ➔ Save ➔ Test):`);
      result.positions = await testBadgePositionSequence(page);
      console.log(`   🏷️  Position Switching Results: Beside=${result.positions.besideName ? '✅' : '❌'}, HeaderRight=${result.positions.headerRight ? '✅' : '❌'}, BelowName=${result.positions.belowName ? '✅' : '❌'}`);

      const alignment = await page.evaluate(`
        (function() {
          var badge = document.querySelector('.rail-delay-wrapper');
          if (!badge) return null;
          var card = badge.closest('div.b6HHQ, div[class*="b6HHQ"], div._2q7r') || badge.parentElement;
          var title = card ? card.querySelector('div.k9j0o, div[class*="k9j0o"], div.MNRXF, div._1Xv1, h3, h4') : null;
          if (!badge || !title) return null;
          var bRect = badge.getBoundingClientRect();
          var tRect = title.getBoundingClientRect();
          return { deltaY: Math.abs(bRect.top - tRect.top), isBeside: bRect.left >= tRect.left };
        })()
      `) as { deltaY: number; isBeside: boolean } | null;
      if (alignment) {
        result.deltaY = alignment.deltaY;
        console.log(`   📐 Pixel Alignment Beside Title: Delta Y = ${alignment.deltaY.toFixed(1)}px`);
      }

      result.popover = await verifyHoverPopoverInteractivity(page);
      console.log(`   🔍 Hover Popover Display: ${result.popover.opened ? '✅ OPENED' : '❌ FAILED'}`);
      console.log(`   🎨 Standard Color Scheme: ${result.popover.colorsPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   🚫 Zero Duplicates / Clean Location: ${result.popover.zeroDuplicates ? '✅ 100% CLEAN' : '❌ FAILED'}`);
      console.log(`   ⚡ Action Footer (Clock + Copy/Refresh): ${result.popover.actionButtons && result.popover.clockFormatted ? '✅ PASSED' : '❌ FAILED'}`);
    }

    if (!isHeadless) await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, screenshotFile) });
    console.log(`   📸 Screenshot Saved: ${screenshotFile}`);

    result.status =
      result.buttonInjected &&
      result.positions.besideName &&
      result.positions.headerRight &&
      result.positions.belowName &&
      result.popover.opened &&
      result.popover.zeroDuplicates
        ? 'PASSED'
        : 'FAILED';

    console.log(`   ${result.status === 'PASSED' ? '✅' : '❌'} Paytm: VALIDATION ${result.status}`);
  } catch (err: any) {
    result.error = err.message;
    console.error('   ❌ Paytm error:', err.message);
  } finally {
    console.log('   🔒 Closing Paytm tab before next provider...');
    await page.close();
  }

  return result;
}
