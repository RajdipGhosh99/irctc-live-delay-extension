import path from 'path';
import { BrowserContext } from 'playwright';
import {
  ALL_VENDOR_CONFIGS,
  DEFAULT_GLOBAL_ROUTING,
  formatRoutingDates,
} from '../../../../src/portals/configs';
import { PlaywrightPortalResult } from '../../helpers/types';
import { injectExtensionInPlaywrightPage } from '../../helpers/injector';
import {
  navigatePortalWithResilience,
  testBadgePositionSequence,
  verifyHoverPopoverInteractivity,
} from '../../helpers/verifiers';

export async function verifyIxigoProvider(
  context: BrowserContext,
  distDir: string,
  screenshotsDir: string,
  isHeadless: boolean
): Promise<PlaywrightPortalResult> {
  console.log('\n----------------------------------------------------------------');
  console.log('🚄 [6/9] OPENING PROVIDER: Ixigo Trains (Live Search)');
  console.log('----------------------------------------------------------------');

  const page = await context.newPage();
  const searchPageUrl = 'https://www.ixigo.com/trains';
  const screenshotFile = 'playwright-06-ixigo-live.png';

  const result: PlaywrightPortalResult = {
    step: 6,
    portal: 'Ixigo Trains (Live)',
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

    // Enter origin station
    console.log('   Entering origin station: New Delhi (NDLS)...');
    const origin = page.locator('input[placeholder*="Origin"]').first();
    await origin.click();
    await origin.fill('New Delhi');
    await page.waitForTimeout(1000);
    try {
      await page.locator('text=NDLS').first().click();
    } catch {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(1000);

    // Enter destination station
    console.log('   Entering destination station: Kanpur (CNB)...');
    const dest = page.locator('input[placeholder*="Destination"]').first();
    await dest.click();
    await dest.fill('Kanpur');
    await page.waitForTimeout(1000);
    try {
      await page.locator('text=CNB').first().click();
    } catch {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(1000);

    // Click Search
    console.log('   Clicking "Search" button...');
    await page.locator('button:has-text("Search")').first().click();
    await page.waitForTimeout(7000);

    result.url = page.url();
    console.log(`   Navigated to live results: ${result.url}`);

    let cardCount = await page.locator('div.pt-15.px-15.pb-0, div[class*="rounded-10"], div[class*="pt-15"], .c-train-list-item').count();
    result.trainsIdentified = cardCount;
    console.log(`   ✅ Real Live Train Cards Identified on Ixigo: ${cardCount}`);

    await injectExtensionInPlaywrightPage(page, distDir, '20434', 'beside-name');
    let badges = await page.locator('.rail-delay-wrapper').count();
    result.buttonInjected = badges > 0;
    console.log(`   ✅ Live Badges Injected on Ixigo: ${badges}`);

    if (badges > 0) {
      console.log(`   🏷️  Testing Sequential Badge Positions (Set ➔ Save ➔ Test):`);
      result.positions = await testBadgePositionSequence(page);
      console.log(`   🏷️  Position Switching Results: Beside=${result.positions.besideName ? '✅' : '❌'}, HeaderRight=${result.positions.headerRight ? '✅' : '❌'}, BelowName=${result.positions.belowName ? '✅' : '❌'}`);

      const alignment = await page.evaluate(`
        (function() {
          var badge = document.querySelector('.rail-delay-wrapper');
          if (!badge) return null;
          var card = badge.closest('div.pt-15, div[class*="rounded-10"], .c-train-list-item') || badge.parentElement;
          var title = card ? card.querySelector('div.body-sm, [class*="truncate"], .train-name, h3, h4') : null;
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

    console.log(`   ${result.status === 'PASSED' ? '✅' : '❌'} Ixigo: VALIDATION ${result.status}`);
  } catch (err: any) {
    result.error = err.message;
    console.error('   ❌ Ixigo error:', err.message);
  } finally {
    console.log('   🔒 Closing Ixigo tab before next provider...');
    await page.close();
  }

  return result;
}

import { runStandaloneProvider } from '../../helpers/runner';

if (require.main === module) {
  runStandaloneProvider(verifyIxigoProvider, 'Ixigo Trains').catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
