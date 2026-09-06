import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { ProviderVerificationFn } from './types';

export async function runStandaloneProvider(verifyFn: ProviderVerificationFn, portalName: string) {
  const args = process.argv.slice(2);
  const isHeadless = args.includes('--headless') || process.env.HEADLESS === 'true';
  const distDir = path.resolve(__dirname, '../../../dist');
  const screenshotsDir = path.resolve(__dirname, '../screenshots');
  const userDataDir = path.resolve(__dirname, '../.playwright-session');

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

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

  try {
    const result = await verifyFn(context, distDir, screenshotsDir, isHeadless);
    console.log(`\n🎉 Standalone ${portalName} Result: ${result.status}`);
    if (result.status !== 'PASSED') process.exitCode = 1;
  } finally {
    await context.close();
  }
}
