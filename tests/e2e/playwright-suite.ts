/**
 * Playwright Sequential Real-Site E2E Test Suite (Modular Orchestrator)
 * 
 * Modular Architecture:
 * - tests/e2e/helpers/   -> Shared types, script injector, and DOM/popover verifiers
 * - tests/e2e/providers/ -> Isolated verification module per booking portal
 * 
 * Execution Model:
 * 1. Open ONE real live booking provider at a time in headful browser.
 * 2. Sequential Position Testing Flow for every provider:
 *    - Position 1: Select "beside-name" -> Save -> Test & Validate DOM placement & alignment
 *    - Position 2: Select "card-header-right" -> Save -> Test & Validate DOM placement
 *    - Position 3: Select "below-name" -> Save -> Test & Validate DOM placement
 *    - Reset to "beside-name" -> Test Hover Popover Interactivity
 * 3. Validate results & capture evidence.
 * 4. Close tab before proceeding to next provider to prevent socket exhaustion and tab clutter.
 * 
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { DEFAULT_GLOBAL_ROUTING } from '../../src/portals/configs';
import { PlaywrightPortalResult } from './helpers/types';
import { ALL_E2E_PROVIDERS, PROVIDER_ALIASES } from './providers';

export async function runSequentialPlaywrightSuite() {
  console.log('================================================================');
  console.log('🎭 PLAYWRIGHT SEQUENTIAL REAL-SITE E2E TEST SUITE (MODULAR)');
  console.log('   Mode  : ONE PROVIDER AT A TIME (Open ➔ Test ➔ Validate ➔ Close)');
  console.log(`   Route : ${DEFAULT_GLOBAL_ROUTING.sourceCity} (${DEFAULT_GLOBAL_ROUTING.sourceCode}) ➔ ${DEFAULT_GLOBAL_ROUTING.destCity} (${DEFAULT_GLOBAL_ROUTING.destCode})`);
  console.log('================================================================\n');

  const args = process.argv.slice(2);
  const isHeadless = args.includes('--headless') || process.env.HEADLESS === 'true';
  const distDir = path.resolve(__dirname, '../../dist');
  const screenshotsDir = path.resolve(__dirname, 'screenshots');
  const userDataDir = path.resolve(__dirname, '.playwright-session');

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const providerArg = args.find((a) => a.startsWith('--provider='));
  let targetProvider = providerArg ? providerArg.split('=')[1].toLowerCase() : null;
  if (targetProvider && PROVIDER_ALIASES[targetProvider]) {
    targetProvider = PROVIDER_ALIASES[targetProvider];
  }

  // Filter providers to execute
  const providersToRun = targetProvider
    ? ALL_E2E_PROVIDERS.filter((p) => p.id === targetProvider)
    : ALL_E2E_PROVIDERS;

  if (targetProvider && providersToRun.length === 0) {
    console.error(`❌ Unknown provider: "${targetProvider}". Available: ${ALL_E2E_PROVIDERS.map((p) => p.id).join(', ')}`);
    process.exit(1);
  }

  // Launch Playwright Context with Extension Loaded
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: isHeadless,
    args: [
      `--disable-extensions-except=${distDir}`,
      `--load-extension=${distDir}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  });

  const results: PlaywrightPortalResult[] = [];

  try {
    for (const provider of providersToRun) {
      const res = await provider.verify(context, distDir, screenshotsDir, isHeadless);
      results.push(res);
    }
  } finally {
    await context.close();
  }

  // =========================================================================
  // CONSOLIDATED REPORT TABLE
  // =========================================================================
  console.log('\n================================================================');
  console.log('📊 CONSOLIDATED PLAYWRIGHT SEQUENTIAL REAL-SITE E2E REPORT');
  console.log('================================================================');
  console.table(
    results.map((r) => ({
      Step: `[${r.step}/9]`,
      Portal: r.portal,
      'Trains Identified': r.trainsIdentified,
      'Badge Injected': r.buttonInjected ? '✅ YES' : '❌ NO',
      'Position Switching': (r.positions.besideName && r.positions.headerRight && r.positions.belowName)
        ? '✅ ALL 3 (Beside/Right/Below)'
        : '❌ INCOMPLETE',
      'Hover Popover': r.popover.opened ? '✅ OPENED' : '❌ FAIL',
      'Standard Colors': r.popover.colorsPassed ? '✅ RED/GREEN/SLATE' : '❌ FAIL',
      'Zero Duplicates (24h)': r.popover.zeroDuplicates ? '✅ 100% CLEAN' : '❌ FAIL',
      Status: r.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED',
    }))
  );

  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  console.log(`\n🎉 Playwright Sequential E2E Complete: ${passedCount}/${results.length} Providers Verified & Passed!`);
  console.log(`📂 Evidence Screenshots Directory: ${screenshotsDir}\n`);

  if (passedCount < results.length) {
    process.exitCode = 1;
  }
}

if (require.main === module || !process.env.TEST_SUITE_IMPORTED) {
  runSequentialPlaywrightSuite().catch((err) => {
    console.error('Fatal Playwright Runner Error:', err);
    process.exit(1);
  });
}
