/**
 * Vendor Portal Configurations Registry
 * Exports unified vendor configs for all supported portals.
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

export * from './types';
export * from './confirmtkt.config';
export * from './irctc.config';
export * from './makemytrip.config';
export * from './ixigo.config';
export * from './paytm.config';
export * from './cleartrip.config';
export * from './goibibo.config';
export * from './easemytrip.config';
export * from './railyatri.config';

import { VendorPortalConfig } from './types';
import { confirmTktConfig } from './confirmtkt.config';
import { irctcConfig } from './irctc.config';
import { makeMyTripConfig } from './makemytrip.config';
import { ixigoConfig } from './ixigo.config';
import { paytmConfig } from './paytm.config';
import { clearTripConfig } from './cleartrip.config';
import { goibiboConfig } from './goibibo.config';
import { easeMyTripConfig } from './easemytrip.config';
import { railYatriConfig } from './railyatri.config';

export const ALL_VENDOR_CONFIGS: VendorPortalConfig[] = [
  confirmTktConfig,
  irctcConfig,
  makeMyTripConfig,
  ixigoConfig,
  paytmConfig,
  clearTripConfig,
  goibiboConfig,
  easeMyTripConfig,
  railYatriConfig,
];
