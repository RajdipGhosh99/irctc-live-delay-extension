/**
 * ClearTrip Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';
import { clearTripConfig } from './configs/cleartrip.config';

export class ClearTripAdapter extends BasePortalAdapter {
  constructor() {
    super(clearTripConfig);
  }
}
