/**
 * High-Performance Mock Server for Deterministic Offline E2E Testing
 * Serves authentic DOM structures for Kharagpur (KGP) to Howrah (HWH) searches
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import fs from 'fs';
import http from 'http';
import path from 'path';

export function createMockServer(port = 3456): Promise<{ server: http.Server; url: string; stop: () => Promise<void> }> {
  const distDir = path.resolve(__dirname, '../../dist');

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const pathname = req.url?.split('?')[0] || '/';

      if (pathname === '/styles.css') {
        const cssPath = path.join(distDir, 'src/styles/styles.css');
        if (fs.existsSync(cssPath)) {
          res.setHeader('Content-Type', 'text/css');
          res.end(fs.readFileSync(cssPath, 'utf8'));
          return;
        }
      }

      if (pathname === '/content-script.js') {
        const jsPath = path.join(distDir, 'src/content/index.iife.js');
        if (fs.existsSync(jsPath)) {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(fs.readFileSync(jsPath, 'utf8'));
          return;
        }
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');

      let html = '';

      switch (pathname) {
        case '/confirmtkt':
          html = wrapWithAssets(getConfirmTktMockHtml(), 'confirmtkt');
          break;
        case '/makemytrip':
          html = wrapWithAssets(getMakeMyTripMockHtml(), 'makemytrip');
          break;
        case '/ixigo':
          html = wrapWithAssets(getIxigoMockHtml(), 'ixigo');
          break;
        case '/paytm':
          html = wrapWithAssets(getPaytmMockHtml(), 'paytm');
          break;
        case '/cleartrip':
          html = wrapWithAssets(getClearTripMockHtml(), 'cleartrip');
          break;
        case '/goibibo':
          html = wrapWithAssets(getGoibiboMockHtml(), 'goibibo');
          break;
        case '/easemytrip':
          html = wrapWithAssets(getEaseMyTripMockHtml(), 'easemytrip');
          break;
        case '/railyatri':
          html = wrapWithAssets(getRailYatriMockHtml(), 'railyatri');
          break;
        case '/irctc':
          html = wrapWithAssets(getIrctcMockHtml(), 'irctc');
          break;
        default:
          res.statusCode = 404;
          res.end('<h1>404 Not Found</h1>');
          return;
      }

      res.statusCode = 200;
      res.end(html);
    });

    server.listen(port, () => {
      const url = `http://127.0.0.1:${port}`;
      resolve({
        server,
        url,
        stop: () =>
          new Promise((resStop) => {
            server.close(() => resStop());
          }),
      });
    });

    server.on('error', (err) => reject(err));
  });
}

function wrapWithAssets(bodyHtml: string, vendorId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>E2E Mock: ${vendorId.toUpperCase()} (Kharagpur to Howrah)</title>
  <link rel="stylesheet" href="/styles.css">
  <script>
    // Universal E2E runtime mock for mock server pages
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      window.chrome = window.chrome || {};
      window.chrome.runtime = {
        sendMessage: function(msg, cb) {
          const trainNo = msg.trainNumber || '12864';
          const isDelayed = trainNo === '12842' || trainNo === '18044';
          const delayMinutes = isDelayed ? 289 : 0;

          const resp = {
            success: true,
            data: {
              trainNumber: trainNo,
              trainName: trainNo === '18044' ? 'HOWRAH SPECIAL EXP' : 'HOWRAH SF EXPRESS',
              delayMinutes: delayMinutes,
              isOnTime: !isDelayed,
              statusSummary: 'Departed from KANPUR CENTRAL (CNB) at 18:20',
              currentStationName: 'KANPUR CENTRAL (CNB)',
              nextStationName: 'HOWRAH JN (HWH)',
              lastUpdatedIso: new Date().toISOString(),
              delayHistory: {
                todayAvgDelayMinutes: Math.round(delayMinutes * 0.75),
                monthAvgDelayMinutes: Math.round(delayMinutes * 0.6),
                punctualityRatePercent: isDelayed ? 62 : 94,
                historicalRunsAnalyzed: 28
              }
            }
          };
          if (cb) cb(resp);
          return Promise.resolve(resp);
        }
      };
    }
  </script>
</head>
<body>
  ${bodyHtml}
  <script src="/content-script.js"></script>
</body>
</html>`;
}

function getMakeMyTripMockHtml(): string {
  return `
  <div id="react-root" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: sans-serif;">
    <div class="train-listing">
      <!-- Train 1: Standard Name -->
      <div class="single-train-detail trainCard" id="train-12864" style="background: #fff; border: 1px solid #ddd; padding: 16px; margin-bottom: 16px; border-radius: 8px;">
        <div class="makeFlex row" style="display: flex; justify-content: space-between; align-items: center;">
          <div class="makeFlex column" style="display: flex; flex-direction: column;">
            <div class="makeFlex row" style="display: flex; align-items: center;">
              <span class="train-name font16 fontBold blackText" style="font-weight: 700; font-size: 16px;">HOWRAH EXPRESS</span>
              <span class="train-num font12 grayText" style="color: #666; margin-left: 4px;"> (12864)</span>
            </div>
            <span style="font-size: 13px; color: #888; margin-top: 4px;">Departs KGP 06:15 &bull; Arrives HWH 08:30 &bull; Daily</span>
          </div>
          <div style="font-weight: bold;">₹140</div>
        </div>
      </div>

      <!-- Train 2: Longer Train Name to verify nowrap title row -->
      <div class="single-train-detail trainCard" id="train-18044" style="background: #fff; border: 1px solid #ddd; padding: 16px; margin-bottom: 16px; border-radius: 8px;">
        <div class="makeFlex row" style="display: flex; justify-content: space-between; align-items: center;">
          <div class="makeFlex column" style="display: flex; flex-direction: column;">
            <div class="makeFlex row" style="display: flex; align-items: center;">
              <span class="train-name font16 fontBold blackText" style="font-weight: 700; font-size: 16px;">HOWRAH BAGHBATIA ANAND VIHAR SUPERFAST EXPRESS SPECIAL</span>
              <span class="train-num font12 grayText" style="color: #666; margin-left: 4px;"> (18044)</span>
            </div>
            <span style="font-size: 13px; color: #888; margin-top: 4px;">Departs KGP 14:20 &bull; Arrives HWH 16:45 &bull; Mon, Wed, Fri</span>
          </div>
          <div style="font-weight: bold;">₹185</div>
        </div>
      </div>
    </div>
  </div>`;
}

function getConfirmTktMockHtml(): string {
  return `
  <div id="app" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: sans-serif;">
    <div id="train-12842" class="border-b border-tertiary rounded-10" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
      <div class="flex items-center" style="display: flex; align-items: center;">
        <div class="truncate max-w-[280px] body-sm" style="font-weight: 700; font-size: 15px; color: #1e293b;">12842 COROMANDEL EXPRESS</div>
      </div>
      <div style="font-size: 13px; color: #64748b; margin-top: 6px;">KGP 10:10 &rarr; HWH 12:20 | Runs Daily</div>
    </div>

    <div id="train-12864" class="border-b border-tertiary rounded-10" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
      <div class="flex items-center" style="display: flex; align-items: center;">
        <div class="truncate max-w-[280px] body-sm" style="font-weight: 700; font-size: 15px; color: #1e293b;">12864 HOWRAH SF EXPRESS</div>
      </div>
      <div style="font-size: 13px; color: #64748b; margin-top: 6px;">KGP 06:15 &rarr; HWH 08:30 | Runs Daily</div>
    </div>
  </div>`;
}

function getIxigoMockHtml(): string {
  return `
  <div class="train-listing-wrapper" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: sans-serif;">
    <div class="c-train-list-item" style="background: #fff; border: 1px solid #ddd; padding: 16px; margin-bottom: 14px; border-radius: 6px;">
      <div style="display: flex; align-items: center;">
        <span class="train-name" style="font-weight: bold; font-size: 15px;">12864 HWH SMVB EXP</span>
      </div>
      <div style="font-size: 13px; color: #666; margin-top: 6px;">KGP 06:15 &rarr; HWH 08:30</div>
    </div>
  </div>`;
}

function getPaytmMockHtml(): string {
  return `
  <div id="app" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: sans-serif;">
    <div class="_2q7r" style="background: #fff; border: 1px solid #ccc; padding: 16px; margin-bottom: 14px; border-radius: 6px;">
      <div style="display: flex; align-items: center;">
        <div class="_1Xv1" style="font-weight: bold; font-size: 15px;">12842 COROMANDEL EXP</div>
      </div>
      <div style="font-size: 13px; color: #666; margin-top: 6px;">KGP 10:10 &rarr; HWH 12:20</div>
    </div>
  </div>`;
}

function getClearTripMockHtml(): string {
  return `
  <div class="train-results" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: sans-serif;">
    <div class="train-card" style="background: #fff; border: 1px solid #eee; padding: 16px; margin-bottom: 14px; border-radius: 6px;">
      <div style="display: flex; align-items: center;">
        <div class="train-title" style="font-weight: bold; font-size: 15px;">12864 HOWRAH EXP</div>
      </div>
    </div>
  </div>`;
}

function getGoibiboMockHtml(): string {
  return `
  <div class="train-list-wrapper" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: sans-serif;">
    <div class="train-list-item" style="background: #fff; border: 1px solid #eee; padding: 16px; margin-bottom: 14px; border-radius: 6px;">
      <div style="display: flex; align-items: center;">
        <span class="train-name" style="font-weight: bold; font-size: 15px;">12842 COROMANDEL EXP</span>
      </div>
    </div>
  </div>`;
}

function getEaseMyTripMockHtml(): string {
  return `
  <div class="train-list" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: sans-serif;">
    <div class="train-box" style="background: #fff; border: 1px solid #eee; padding: 16px; margin-bottom: 14px; border-radius: 6px;">
      <div style="display: flex; align-items: center;">
        <div class="train-name" style="font-weight: bold; font-size: 15px;">12864 HWH SF EXP</div>
      </div>
    </div>
  </div>`;
}

function getRailYatriMockHtml(): string {
  return `
  <div class="search-results" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: sans-serif;">
    <div class="train-item" style="background: #fff; border: 1px solid #eee; padding: 16px; margin-bottom: 14px; border-radius: 6px;">
      <div style="display: flex; align-items: center;">
        <h3 class="train-title" style="font-weight: bold; font-size: 15px; margin: 0;">12842 COROMANDEL EXP</h3>
      </div>
    </div>
  </div>`;
}

function getIrctcMockHtml(): string {
  return `
  <div id="main-layout" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: sans-serif;">
    <app-train-item class="train-details" style="display: block; background: #fff; border: 1px solid #ddd; padding: 16px; margin-bottom: 14px; border-radius: 6px;">
      <div class="train-heading" style="display: flex; align-items: center;">
        <strong style="font-size: 15px;">22436 VANDE BHARAT EXP</strong>
      </div>
    </app-train-item>
  </div>`;
}
