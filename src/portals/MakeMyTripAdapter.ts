/**
 * MakeMyTrip Portal Adapter
 * Specialized for MakeMyTrip React Search Results
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';
import { makeMyTripConfig } from './configs/makemytrip.config';

export class MakeMyTripAdapter extends BasePortalAdapter {
  constructor() {
    super(makeMyTripConfig);
  }
}
