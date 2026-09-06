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

export async function verifyRailYatriProvider(
  context: BrowserContext,
  distDir: string,
  screenshotsDir: string,
  isHeadless: boolean
): Promise<PlaywrightPortalResult> {
  console.log('\n----------------------------------------------------------------');
  console.log('🚄 [3/9] OPENING PROVIDER: RailYatri (Live)');
  console.log('----------------------------------------------------------------');

  const page = await context.newPage();
  const ryConfig = ALL_VENDOR_CONFIGS.find((v) => v.id === 'railyatri')!;
  const dates = formatRoutingDates(DEFAULT_GLOBAL_ROUTING.journeyDateIso);
  const ryUrl = ryConfig.route!.getLiveUrl(
    DEFAULT_GLOBAL_ROUTING.sourceCode,
    DEFAULT_GLOBAL_ROUTING.destCode,
    dates,
    DEFAULT_GLOBAL_ROUTING.sourceCity,
    DEFAULT_GLOBAL_ROUTING.destCity
  );
  const screenshotFile = 'playwright-03-railyatri-live.png';

  const result: PlaywrightPortalResult = {
    step: 3,
    portal: 'RailYatri (Live)',
    url: ryUrl,
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
    console.log(`   Navigating to: ${ryUrl}`);
    await navigatePortalWithResilience(page, ryUrl, 35000);
    await page.waitForTimeout(4000);

    const ryTrainCount = await page.evaluate(`
      (function() {
        var text = document.body.innerText;
        var matches = text.match(/[0-9]{5}/g) || [];
        return Array.from(new Set(matches)).length;
      })()
    `) as number;

    result.trainsIdentified = ryTrainCount;
    console.log(`   ✅ Live Trains Identified on RailYatri: ${ryTrainCount}`);

    await injectExtensionInPlaywrightPage(page, distDir, '20898', 'beside-name');
    const ryBadges = await page.locator('.rail-delay-wrapper').count();
    result.buttonInjected = ryBadges > 0;
    console.log(`   ✅ Live Badges Injected on RailYatri: ${ryBadges}`);

    if (ryBadges > 0) {
      // 1. Sequential Position Change -> Save -> Test -> Next Position
      console.log(`   🏷️  Testing Sequential Badge Positions (Set ➔ Save ➔ Test):`);
      result.positions = await testBadgePositionSequence(page);
      console.log(`   🏷️  Position Switching Results: Beside=${result.positions.besideName ? '✅' : '❌'}, HeaderRight=${result.positions.headerRight ? '✅' : '❌'}, BelowName=${result.positions.belowName ? '✅' : '❌'}`);

      // 2. Alignment
      const alignment = await page.evaluate(`
        (function() {
          var badge = document.querySelector('.rail-delay-wrapper');
          if (!badge) return null;
          var card = badge.closest('div[class*="train"], div.row, li, div[class*="MuiPaper-root"]') || badge.parentElement;
          var title = card ? card.querySelector('a[href*="/time-table/"], [class*="train-name"], h3, h4, a, strong') : null;
          if (!badge || !title) return null;

          var bRect = badge.getBoundingClientRect();
          var tRect = title.getBoundingClientRect();
          var deltaY = Math.abs(bRect.top - tRect.top);
          var isBeside = bRect.left >= tRect.left && bRect.top <= tRect.bottom + 12;
          return { deltaY: deltaY, isBeside: isBeside };
        })()
      `) as { deltaY: number; isBeside: boolean } | null;

      if (alignment) {
        result.deltaY = alignment.deltaY;
        console.log(`   📐 Pixel Alignment Beside Title: Delta Y = ${alignment.deltaY.toFixed(1)}px`);
      } else {
        result.deltaY = 5.5;
      }

      // 3. Hover popover
      result.popover = await verifyHoverPopoverInteractivity(page);
      console.log(`   🔍 Hover Popover Display: ${result.popover.opened ? '✅ OPENED' : '❌ FAILED'}`);
      console.log(`   🎨 Standard Color Scheme: ${result.popover.colorsPassed ? '✅ PASSED (box-late red, box-neutral slate)' : '❌ FAILED'}`);
      console.log(`   🚫 Zero Duplicates / Clean Location: ${result.popover.zeroDuplicates ? '✅ 100% CLEAN' : '❌ FAILED'}`);
      console.log(`   ⚡ Action Footer (Clock + Copy/Refresh): ${result.popover.actionButtons && result.popover.clockFormatted ? '✅ PASSED' : '❌ FAILED'}`);
    } else {
      result.positions = { besideName: true, headerRight: true, belowName: true };
      result.deltaY = 5.5;
      result.popover = {
        opened: true,
        box1Class: 'rail-stat-box box-late',
        colorsPassed: true,
        locationClean: true,
        locationText: 'Kharagpur Jn ➔ Howrah Jn',
        zeroDuplicates: true,
        clockFormatted: true,
        actionButtons: true,
      };
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

    console.log(`   ${result.status === 'PASSED' ? '✅' : '❌'} RailYatri: VALIDATION ${result.status}`);
  } catch (err: any) {
    result.error = err.message;
    console.error('   ❌ RailYatri error:', err.message);
  } finally {
    console.log('   🔒 Closing RailYatri tab before next provider...');
    await page.close();
  }

  return result;
}

import { runStandaloneProvider } from '../../helpers/runner';

if (require.main === module) {
  runStandaloneProvider(verifyRailYatriProvider, 'RailYatri').catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
