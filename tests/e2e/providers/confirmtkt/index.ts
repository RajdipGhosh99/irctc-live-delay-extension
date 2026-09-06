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

export async function verifyConfirmTktProvider(
  context: BrowserContext,
  distDir: string,
  screenshotsDir: string,
  isHeadless: boolean
): Promise<PlaywrightPortalResult> {
  console.log('\n----------------------------------------------------------------');
  console.log('🚄 [2/9] OPENING PROVIDER: ConfirmTkt (Live)');
  console.log('----------------------------------------------------------------');

  const page = await context.newPage();
  const ctConfig = ALL_VENDOR_CONFIGS.find((v) => v.id === 'confirmtkt')!;
  const dates = formatRoutingDates(DEFAULT_GLOBAL_ROUTING.journeyDateIso);
  const ctUrl = ctConfig.route!.getLiveUrl(
    DEFAULT_GLOBAL_ROUTING.sourceCode,
    DEFAULT_GLOBAL_ROUTING.destCode,
    dates
  );
  const screenshotFile = 'playwright-02-confirmtkt-live.png';

  const result: PlaywrightPortalResult = {
    step: 2,
    portal: 'ConfirmTkt (Live)',
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

    // Dismiss overlay if present
    try {
      await page.evaluate(`
        var portalRoot = document.getElementById('portal-root');
        if (portalRoot) {
          var closeBtn = portalRoot.querySelector('button, .close');
          if (closeBtn) closeBtn.click();
          else portalRoot.remove();
        }
      `);
    } catch {}

    const ctCardCount = await page.locator('div.border-b.border-tertiary, div[class*="rounded-10"], div.pt-15.px-15.pb-0').count();
    result.trainsIdentified = ctCardCount;
    console.log(`   ✅ Live Train Cards Identified on ConfirmTkt: ${ctCardCount}`);

    await injectExtensionInPlaywrightPage(page, distDir, '12101', 'beside-name');
    const ctBadgesCount = await page.locator('.rail-delay-wrapper').count();
    result.buttonInjected = ctBadgesCount > 0;
    console.log(`   ✅ Live Badges Injected on ConfirmTkt: ${ctBadgesCount}`);

    if (ctBadgesCount > 0) {
      // 1. Sequential Position Change -> Save -> Test -> Next Position
      console.log(`   🏷️  Testing Sequential Badge Positions (Set ➔ Save ➔ Test):`);
      result.positions = await testBadgePositionSequence(page);
      console.log(`   🏷️  Position Switching Results: Beside=${result.positions.besideName ? '✅' : '❌'}, HeaderRight=${result.positions.headerRight ? '✅' : '❌'}, BelowName=${result.positions.belowName ? '✅' : '❌'}`);

      // 2. Alignment
      const alignment = await page.evaluate(`
        (function() {
          var badge = document.querySelector('.rail-delay-wrapper');
          if (!badge) return null;
          var card = badge.closest('div.border-b, div[class*="rounded-10"], div.pt-15') || badge.parentElement;
          var title = card ? card.querySelector('.truncate, .body-sm, [class*="train-name"], h3, strong') : null;
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
        console.log(`   📐 Pixel Alignment Beside Title: Delta Y = ${alignment.deltaY.toFixed(1)}px (Max allowed: ${ctConfig.badge?.maxDeltaYPx || 6}px)`);
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

    console.log(`   ${result.status === 'PASSED' ? '✅' : '❌'} ConfirmTkt: VALIDATION ${result.status}`);
  } catch (err: any) {
    result.error = err.message;
    console.error('   ❌ ConfirmTkt error:', err.message);
  } finally {
    console.log('   🔒 Closing ConfirmTkt tab before next provider...');
    await page.close();
  }

  return result;
}

import { runStandaloneProvider } from '../../helpers/runner';

if (require.main === module) {
  runStandaloneProvider(verifyConfirmTktProvider, 'ConfirmTkt').catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
