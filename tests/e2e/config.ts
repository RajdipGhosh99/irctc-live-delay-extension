/**
 * Selenium E2E Test Suite Configuration
 * Configurable parameters for automated cross-portal testing
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import path from 'path';
import {
  ALL_VENDOR_CONFIGS,
  DEFAULT_GLOBAL_ROUTING,
  formatRoutingDates,
  VendorPortalConfig,
} from '../../src/portals/configs';

export interface ProviderRouteConfig {
  id: string;
  name: string;
  domain: string;
  mockPath: string;
  config: VendorPortalConfig;
  getLiveUrl: (src: string, dest: string, dateIso: string) => string;
}

export interface E2ETestConfig {
  sourceStation: string;
  sourceCity: string;
  destinationStation: string;
  destCity: string;
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

export function formatDateFormats(dateIso: string) {
  const dates = formatRoutingDates(dateIso);
  return {
    iso: dates.iso,
    yyyymmdd: dates.yyyymmdd,
    ddMmYyyy: dates.dd_mm_yyyy,
    slashDdMmYyyy: dates.ddMmYyyySlash,
  };
}

export const DEFAULT_E2E_CONFIG: E2ETestConfig = {
  sourceStation: DEFAULT_GLOBAL_ROUTING.sourceCode,
  sourceCity: DEFAULT_GLOBAL_ROUTING.sourceCity,
  destinationStation: DEFAULT_GLOBAL_ROUTING.destCode,
  destCity: DEFAULT_GLOBAL_ROUTING.destCity,
  journeyDate: DEFAULT_GLOBAL_ROUTING.journeyDateIso,
  isHeadless: process.env.HEADLESS === 'true',
  viewportWidth: 1440,
  viewportHeight: 900,
  mockPort: 3456,
  maxVerticalOffsetDeltaPx: 6,
  screenshotsDir: path.resolve(__dirname, 'screenshots'),
  distDir: path.resolve(__dirname, '../../dist'),
  providers: ALL_VENDOR_CONFIGS.map((vc) => ({
    id: vc.id,
    name: vc.name,
    domain: vc.domains[0],
    mockPath: vc.route?.mockPath || `/${vc.id}`,
    config: vc,
    getLiveUrl: (src, dest, dateIso) => {
      const dates = formatRoutingDates(dateIso);
      return vc.route
        ? vc.route.getLiveUrl(src, dest, dates, DEFAULT_GLOBAL_ROUTING.sourceCity, DEFAULT_GLOBAL_ROUTING.destCity)
        : `https://${vc.domains[0]}`;
    },
  })),
};

