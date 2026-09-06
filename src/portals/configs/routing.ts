/**
 * Global Routing & Station Configuration (Single Source of Truth)
 * Shared across Extension Runtime and E2E Test Suite.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { FormattedDateValues, GlobalStationRouteConfig } from './types';

export function getTomorrowDateIso(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatRoutingDates(dateIso?: string): FormattedDateValues {
  const iso = dateIso || getTomorrowDateIso();
  const [yyyy, mm, dd] = iso.split('-');
  return {
    iso,
    yyyymmdd: `${yyyy}${mm}${dd}`,
    dd_mm_yyyy: `${dd}-${mm}-${yyyy}`,
    ddMmYyyySlash: `${dd}/${mm}/${yyyy}`,
  };
}

export const DEFAULT_GLOBAL_ROUTING: GlobalStationRouteConfig = {
  sourceCode: (typeof process !== 'undefined' && process.env?.TEST_SRC) || 'KGP',
  sourceCity: (typeof process !== 'undefined' && process.env?.TEST_SRC_CITY) || 'Kharagpur',
  destCode: (typeof process !== 'undefined' && process.env?.TEST_DEST) || 'HWH',
  destCity: (typeof process !== 'undefined' && process.env?.TEST_DEST_CITY) || 'Howrah',
  journeyDateIso: (typeof process !== 'undefined' && process.env?.TEST_DATE) || getTomorrowDateIso(),
};
