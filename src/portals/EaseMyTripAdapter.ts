/**
 * EaseMyTrip Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';
import { easeMyTripConfig } from './configs/easemytrip.config';

export class EaseMyTripAdapter extends BasePortalAdapter {
  constructor() {
    super(easeMyTripConfig);
  }
}
