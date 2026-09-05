/**
 * Selenium E2E Test Suite Configuration
 * Configurable parameters for automated cross-portal testing
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import path from 'path';

export interface ProviderRouteConfig {
  id: string;
  name: string;
  domain: string;
  mockPath: string;
  getLiveUrl: (src: string, dest: string, dateIso: string) => string;
}

export interface E2ETestConfig {
  sourceStation: string;
  destinationStation: string;
  journeyDate: string; // ISO format: YYYY-MM-DD
  isHeadless: boolean;
  viewportWidth: number;
  viewportHeight: number;
  mockPort: number;
  maxVerticalOffsetDeltaPx: number;
  screenshotsDir: string;
  distDir: string;
  providers: ProviderRouteConfig[];
}

function getTomorrowDateIso(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateFormats(dateIso: string) {
  const [yyyy, mm, dd] = dateIso.split('-');
  return {
    iso: dateIso,
    yyyymmdd: `${yyyy}${mm}${dd}`,
    ddMmYyyy: `${dd}-${mm}-${yyyy}`,
    slashDdMmYyyy: `${dd}/${mm}/${yyyy}`,
  };
}

const defaultDateIso = getTomorrowDateIso();

export const DEFAULT_E2E_CONFIG: E2ETestConfig = {
  sourceStation: process.env.TEST_SRC || 'KGP', // Kharagpur Junction
  destinationStation: process.env.TEST_DEST || 'HWH', // Howrah Junction
  journeyDate: process.env.TEST_DATE || defaultDateIso,
  isHeadless: process.env.HEADFUL !== 'true',
  viewportWidth: 1440,
  viewportHeight: 900,
  mockPort: 3456,
  maxVerticalOffsetDeltaPx: 6, // Badge must be horizontally beside title within <= 6px Y delta
  screenshotsDir: path.resolve(__dirname, 'screenshots'),
  distDir: path.resolve(__dirname, '../../dist'),
  providers: [
    {
      id: 'confirmtkt',
      name: 'ConfirmTkt',
      domain: 'confirmtkt.com',
      mockPath: '/confirmtkt',
      getLiveUrl: (src, dest, dateIso) => {
        const { ddMmYyyy } = formatDateFormats(dateIso);
        return `https://www.confirmtkt.com/rts/trains?from=${src}&to=${dest}&date=${ddMmYyyy}`;
      },
    },
    {
      id: 'makemytrip',
      name: 'MakeMyTrip',
      domain: 'makemytrip.com',
      mockPath: '/makemytrip',
      getLiveUrl: (src, dest, dateIso) => {
        const { yyyymmdd } = formatDateFormats(dateIso);
        return `https://www.makemytrip.com/railways/listing?srcStn=${src}&destStn=${dest}&date=${yyyymmdd}`;
      },
    },
    {
      id: 'ixigo',
      name: 'Ixigo',
      domain: 'ixigo.com',
      mockPath: '/ixigo',
      getLiveUrl: (src, dest, dateIso) => {
        const { yyyymmdd } = formatDateFormats(dateIso);
        return `https://www.ixigo.com/trains/search/${src}/${dest}/${yyyymmdd}`;
      },
    },
    {
      id: 'paytm',
      name: 'Paytm Trains',
      domain: 'paytm.com',
      mockPath: '/paytm',
      getLiveUrl: (src, dest, dateIso) => {
        const { yyyymmdd } = formatDateFormats(dateIso);
        return `https://tickets.paytm.com/trains/search/${src}/${dest}/${yyyymmdd}/1`;
      },
    },
    {
      id: 'cleartrip',
      name: 'ClearTrip',
      domain: 'cleartrip.com',
      mockPath: '/cleartrip',
      getLiveUrl: (src, dest, dateIso) => {
        const { ddMmYyyy } = formatDateFormats(dateIso);
        return `https://www.cleartrip.com/trains/results?from_station=${src}&to_station=${dest}&date=${ddMmYyyy}`;
      },
    },
    {
      id: 'goibibo',
      name: 'Goibibo',
      domain: 'goibibo.com',
      mockPath: '/goibibo',
      getLiveUrl: (src, dest, dateIso) => {
        const { yyyymmdd } = formatDateFormats(dateIso);
        return `https://www.goibibo.com/trains/search?src=${src}&dest=${dest}&date=${yyyymmdd}`;
      },
    },
    {
      id: 'easemytrip',
      name: 'EaseMyTrip',
      domain: 'easemytrip.com',
      mockPath: '/easemytrip',
      getLiveUrl: (src, dest, dateIso) => {
        const { ddMmYyyy } = formatDateFormats(dateIso);
        return `https://railways.easemytrip.com/train-list/${src}-to-${dest}?travelDate=${ddMmYyyy}`;
      },
    },
    {
      id: 'railyatri',
      name: 'RailYatri',
      domain: 'railyatri.in',
      mockPath: '/railyatri',
      getLiveUrl: (src, dest) => {
        return `https://www.railyatri.in/train-booking/${src}-to-${dest}`;
      },
    },
    {
      id: 'irctc',
      name: 'IRCTC NextGen',
      domain: 'irctc.co.in',
      mockPath: '/irctc',
      getLiveUrl: () => {
        return `https://www.irctc.co.in/nget/train-search`;
      },
    },
  ],
};
