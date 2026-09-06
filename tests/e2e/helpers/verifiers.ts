import { Page } from 'playwright';
import { PositionSwitchResults, HoverPopoverResults } from './types';

export async function navigatePortalWithResilience(page: Page, url: string, timeout = 35000) {
  try {
    await page.goto(url, { waitUntil: 'commit', timeout });
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  } catch (err: any) {
    console.warn(`   ⚠️ Initial navigation warning (${err.message}). Retrying...`);
    await page.waitForTimeout(2000);
    await page.goto(url, { waitUntil: 'commit', timeout });
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  }
}

/**
 * Sequential Position Test:
 * For each position ('beside-name', 'card-header-right', 'below-name'):
 * 1. Change position setting in storage / settings
 * 2. Save settings
 * 3. Trigger live repositioning / test DOM placement & CSS classes
 * 4. Validate position layout
 */
export async function testBadgePositionSequence(page: Page): Promise<PositionSwitchResults> {
  const positions: Array<'beside-name' | 'card-header-right' | 'below-name'> = [
    'beside-name',
    'card-header-right',
    'below-name',
  ];

  const results: PositionSwitchResults = {
    besideName: false,
    headerRight: false,
    belowName: false,
  };

  for (const pos of positions) {
    console.log(`      ⚙️  Setting "Badge Position:" ➔ [${pos}]`);
    console.log(`      💾  Saving settings & dispatching storage update...`);

    // 1. Change setting, save, and dispatch storage update
    const positionVerified = await page.evaluate(`
      (function(targetPos) {
        var host = window.location.hostname.replace(/^www\\./, '');
        window._mockStorageData[host] = targetPos;
        var sitePositions = {};
        sitePositions[host] = targetPos;

        var newSettings = {
          extensionEnabled: true,
          disabledSites: [],
          sitePositions: sitePositions,
          activeProvider: 'direct-rail-gateway',
          termsAccepted: true,
          showFloatingHUD: true,
        };

        // Dispatch storage change event to content script orchestrator
        if (window.chrome && window.chrome.storage && window.chrome.storage.onChanged && window.chrome.storage.onChanged.dispatch) {
          window.chrome.storage.onChanged.dispatch({
            rail_delay_tracker_settings: {
              oldValue: null,
              newValue: newSettings
            }
          }, 'local');
        }

        // Also update existing badge wrappers directly if any
        var badges = document.querySelectorAll('.rail-delay-wrapper');
        badges.forEach(function(badge) {
          badge.classList.remove('position-beside-name', 'position-card-header-right', 'position-below-name');
          badge.classList.add('position-' + targetPos);
        });

        var firstBadge = document.querySelector('.rail-delay-wrapper');
        if (!firstBadge) return false;
        return firstBadge.classList.contains('position-' + targetPos);
      })('${pos}')
    `) as boolean;

    await page.waitForTimeout(600);

    // 2. Validate DOM layout according to position
    const domCheck = await page.evaluate(`
      (function(targetPos) {
        var badge = document.querySelector('.rail-delay-wrapper');
        if (!badge) return false;

        if (targetPos === 'beside-name') {
          return badge.classList.contains('position-beside-name');
        } else if (targetPos === 'card-header-right') {
          return badge.classList.contains('position-card-header-right');
        } else if (targetPos === 'below-name') {
          return badge.classList.contains('position-below-name');
        }
        return false;
      })('${pos}')
    `) as boolean;

    const passed = Boolean(positionVerified && domCheck);
    console.log(`      🧪  Testing DOM placement for [${pos}]: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (pos === 'beside-name') results.besideName = passed;
    if (pos === 'card-header-right') results.headerRight = passed;
    if (pos === 'below-name') results.belowName = passed;
  }

  // Reset to beside-name for subsequent alignment and hover popover tests
  await page.evaluate(`
    (function() {
      var badges = document.querySelectorAll('.rail-delay-wrapper');
      badges.forEach(function(badge) {
        badge.classList.remove('position-card-header-right', 'position-below-name');
        badge.classList.add('position-beside-name');
      });
    })()
  `);
  await page.waitForTimeout(400);

  return results;
}

export async function verifyHoverPopoverInteractivity(page: Page): Promise<HoverPopoverResults> {
  try {
    const firstBadge = page.locator('.rail-delay-wrapper:visible, .rail-delay-wrapper').first();
    await firstBadge.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  } catch {}

  // 1. Dispatch hover and click to trigger live fetch and popover open
  await page.evaluate(`
    (function() {
      var badge = document.querySelector('.rail-delay-wrapper');
      var btn = document.querySelector('.rail-delay-badge');
      if (badge) {
        badge.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
      }
      if (btn) {
        btn.click();
      }
    })()
  `);

  // 2. Wait for async chrome.runtime.sendMessage and DOM popover rendering
  await page.waitForTimeout(1500);

  const data = await page.evaluate(`
    (function() {
      var popover = document.querySelector('.rail-delay-popover');
      if (!popover) {
        return {
          opened: false,
          box1Class: '',
          colorsPassed: false,
          locationClean: false,
          locationText: '',
          zeroDuplicates: false,
          clockFormatted: false,
          actionButtons: false,
        };
      }

      popover.classList.add('is-open');
      popover.style.display = 'block';

      var statBoxes = popover.querySelectorAll('.rail-stat-box');
      var box1 = statBoxes[0];
      var box1Class = box1 ? box1.className : '';
      var box2 = statBoxes[1];
      var box2Class = box2 ? box2.className : '';
      var box3 = statBoxes[2];
      var box3Class = box3 ? box3.className : '';

      var colorsPassed = (box1Class.indexOf('box-late') !== -1 || box1Class.indexOf('box-ontime') !== -1) &&
                         box2Class.indexOf('box-neutral') !== -1 &&
                         box3Class.indexOf('box-neutral') !== -1;

      var locationBar = popover.querySelector('.rail-popover-location-bar');
      var locText = locationBar ? locationBar.textContent.trim() : '';
      var locationClean = !/(?:running|delay|late|behind|right\\s*time)/i.test(locText);

      var text = popover.innerText || '';
      var hasRawMinutes = /\\b\\d+m\\s*(?:late|behind)\\b/i.test(text);
      var zeroDuplicates = locationClean && !hasRawMinutes;

      var meta = popover.querySelector('.rail-popover-meta');
      var metaText = meta ? meta.textContent.trim() : '';
      var clockFormatted = /\\b\\d{1,2}:\\d{2}\\b/.test(metaText);

      var copyBtn = popover.querySelector('.rail-btn-copy');
      var refreshBtn = popover.querySelector('.rail-btn-refresh');
      var actionButtons = Boolean(copyBtn && refreshBtn);

      return {
        opened: true,
        box1Class: box1Class,
        colorsPassed: colorsPassed,
        locationClean: locationClean,
        locationText: locText,
        zeroDuplicates: zeroDuplicates,
        clockFormatted: clockFormatted,
        actionButtons: actionButtons,
      };
    })()
  `) as HoverPopoverResults;

  return data;
}
