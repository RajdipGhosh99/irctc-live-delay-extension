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

export async function verifyMakeMyTripProvider(
  context: BrowserContext,
  distDir: string,
  screenshotsDir: string,
  isHeadless: boolean
): Promise<PlaywrightPortalResult> {
  console.log('\n----------------------------------------------------------------');
  console.log('🚄 [1/9] OPENING PROVIDER: MakeMyTrip (Live)');
  console.log('----------------------------------------------------------------');

  const page = await context.newPage();
  const mmtConfig = ALL_VENDOR_CONFIGS.find((v) => v.id === 'makemytrip')!;
  const dates = formatRoutingDates(DEFAULT_GLOBAL_ROUTING.journeyDateIso);
  const mmtUrl = mmtConfig.route!.getLiveUrl(
    DEFAULT_GLOBAL_ROUTING.sourceCode,
    DEFAULT_GLOBAL_ROUTING.destCode,
    dates,
    DEFAULT_GLOBAL_ROUTING.sourceCity,
    DEFAULT_GLOBAL_ROUTING.destCity
  );
  const screenshotFile = 'playwright-01-makemytrip-live.png';

  const result: PlaywrightPortalResult = {
    step: 1,
    portal: 'MakeMyTrip (Live)',
    url: mmtUrl,
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
    console.log(`   Navigating to: ${mmtUrl}`);
    await navigatePortalWithResilience(page, mmtUrl, 35000);
    await page.waitForTimeout(4000);

    // Dismiss login modal if visible
    try {
      await page.evaluate(`
        var closeBtn = document.querySelector('.commonModal__close, [data-cy="closeModal"]');
        if (closeBtn) closeBtn.click();
      `);
    } catch {}

    const mmtCardCount = await page.locator('[data-testid="listing-card"], div[class*="ListingCard_ListingCard"], .train-card').count();
    result.trainsIdentified = mmtCardCount;
    console.log(`   ✅ Live Train Cards Identified on MakeMyTrip: ${mmtCardCount}`);

    await injectExtensionInPlaywrightPage(page, distDir, '12864', 'beside-name');
    const badgesCount = await page.locator('.rail-delay-wrapper').count();
    result.buttonInjected = badgesCount > 0;
    console.log(`   ✅ Live Badges Injected on MakeMyTrip: ${badgesCount}`);

    if (badgesCount > 0) {
      // 1. Sequential Position Change -> Save -> Test -> Next Position
      console.log(`   🏷️  Testing Sequential Badge Positions (Set ➔ Save ➔ Test):`);
      result.positions = await testBadgePositionSequence(page);
      console.log(`   🏷️  Position Switching Results: Beside=${result.positions.besideName ? '✅' : '❌'}, HeaderRight=${result.positions.headerRight ? '✅' : '❌'}, BelowName=${result.positions.belowName ? '✅' : '❌'}`);

      // 2. Alignment beside train name
      const alignment = await page.evaluate(`
        (function() {
          var badge = document.querySelector('.rail-delay-wrapper');
          if (!badge) return null;
          var card = badge.closest('[data-testid="listing-card"], div[class*="ListingCard_ListingCard"], .train-card') || badge.parentElement;
          var title = card ? card.querySelector('[data-testid="train-name"], [class*="listName"], .train-name, h3, p') : null;
          if (!badge || !title) return null;

          var bRect = badge.getBoundingClientRect();
          var tRect = title.getBoundingClientRect();
          var deltaY = Math.abs(bRect.top - tRect.top);
          var isBeside = bRect.left >= tRect.left && bRect.top <= tRect.bottom + 8;
          return { deltaY: deltaY, isBeside: isBeside };
        })()
      `) as { deltaY: number; isBeside: boolean } | null;

      if (alignment) {
        result.deltaY = alignment.deltaY;
        console.log(`   📐 Pixel Alignment Beside Title: Delta Y = ${alignment.deltaY.toFixed(1)}px (Max allowed: ${mmtConfig.badge?.maxDeltaYPx || 6}px)`);
      }

      // 3. Hover popover
      result.popover = await verifyHoverPopoverInteractivity(page);
      console.log(`   🔍 Hover Popover Display: ${result.popover.opened ? '✅ OPENED' : '❌ FAILED'}`);
      console.log(`   🎨 Standard Color Scheme: ${result.popover.colorsPassed ? '✅ PASSED (box-late red, box-neutral slate)' : '❌ FAILED'}`);
      console.log(`   🚫 Zero Duplicates / Clean Location: ${result.popover.zeroDuplicates ? '✅ 100% CLEAN' : '❌ FAILED'}`);
      console.log(`   ⚡ Action Footer (Clock + Copy/Refresh): ${result.popover.actionButtons && result.popover.clockFormatted ? '✅ PASSED' : '❌ FAILED'}`);

      if (!isHeadless) await page.waitForTimeout(1500);
    }

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

    console.log(`   ${result.status === 'PASSED' ? '✅' : '❌'} MakeMyTrip: VALIDATION ${result.status}`);
  } catch (err: any) {
    result.error = err.message;
    console.error('   ❌ MakeMyTrip error:', err.message);
  } finally {
    console.log('   🔒 Closing MakeMyTrip tab before next provider...');
    await page.close();
  }

  return result;
}
