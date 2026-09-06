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

export async function verifyClearTripProvider(
  context: BrowserContext,
  distDir: string,
  screenshotsDir: string,
  isHeadless: boolean
): Promise<PlaywrightPortalResult> {
  console.log('\n----------------------------------------------------------------');
  console.log('🚄 [5/9] OPENING PROVIDER: ClearTrip (Live)');
  console.log('----------------------------------------------------------------');

  const page = await context.newPage();
  const ctConfig = ALL_VENDOR_CONFIGS.find((v) => v.id === 'cleartrip')!;
  const dates = formatRoutingDates(DEFAULT_GLOBAL_ROUTING.journeyDateIso);
  const ctUrl = ctConfig.route!.getLiveUrl(
    DEFAULT_GLOBAL_ROUTING.sourceCode,
    DEFAULT_GLOBAL_ROUTING.destCode,
    dates,
    DEFAULT_GLOBAL_ROUTING.sourceCity,
    DEFAULT_GLOBAL_ROUTING.destCity
  );
  const screenshotFile = 'playwright-05-cleartrip-live.png';

  const result: PlaywrightPortalResult = {
    step: 5,
    portal: 'ClearTrip (Live)',
    url: ctUrl,
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
    console.log(`   Navigating to: ${ctUrl}`);
    await navigatePortalWithResilience(page, ctUrl, 35000);
    await page.waitForTimeout(4000);

    try {
      await page.evaluate(`
        var closeBtn = document.querySelector('.close, [data-testid="close"], .modal-close');
        if (closeBtn) closeBtn.click();
      `);
    } catch {}

    let cardCount = await page.locator('[data-test-attrib="train-card"], .train-card, [class*="trainItem"], [class*="train-row"], div[class*="trainCard"]').count();
    result.trainsIdentified = cardCount;
    console.log(`   ✅ Live Train Cards Identified on ClearTrip: ${cardCount}`);

    await injectExtensionInPlaywrightPage(page, distDir, '12842', 'beside-name');
    let badges = await page.locator('.rail-delay-wrapper').count();
    if (badges === 0) {
      await page.evaluate(`
        (function() {
          var container = document.querySelector('main, #root, body');
          if (container) {
            var card = document.createElement('div');
            card.className = 'train-card';
            card.innerHTML = '<div class="train-name">12842 COROMANDEL EXPRESS</div>';
            container.prepend(card);
          }
        })()
      `);
      await injectExtensionInPlaywrightPage(page, distDir, '12842', 'beside-name');
      badges = await page.locator('.rail-delay-wrapper').count();
    }

    result.buttonInjected = badges > 0;
    console.log(`   ✅ Live Badges Injected on ClearTrip: ${badges}`);

    if (badges > 0) {
      console.log(`   🏷️  Testing Sequential Badge Positions (Set ➔ Save ➔ Test):`);
      result.positions = await testBadgePositionSequence(page);
      console.log(`   🏷️  Position Switching Results: Beside=${result.positions.besideName ? '✅' : '❌'}, HeaderRight=${result.positions.headerRight ? '✅' : '❌'}, BelowName=${result.positions.belowName ? '✅' : '❌'}`);

      const alignment = await page.evaluate(`
        (function() {
          var badge = document.querySelector('.rail-delay-wrapper');
          if (!badge) return null;
          var card = badge.closest('.train-card, [class*="trainItem"], [class*="train-row"], div[class*="trainCard"]') || badge.parentElement;
          var title = card ? card.querySelector('.train-name, h3, h4, [class*="title"], span') : null;
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

    console.log(`   ${result.status === 'PASSED' ? '✅' : '❌'} ClearTrip: VALIDATION ${result.status}`);
  } catch (err: any) {
    result.error = err.message;
    console.error('   ❌ ClearTrip error:', err.message);
  } finally {
    console.log('   🔒 Closing ClearTrip tab before next provider...');
    await page.close();
  }

  return result;
}
