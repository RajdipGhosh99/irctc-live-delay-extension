/**
 * Paytm Trains Portal Adapter
 * Dedicated adapter for Paytm Trains (paytm.com)
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';
import { paytmConfig } from './configs/paytm.config';

export class PaytmAdapter extends BasePortalAdapter {
  constructor() {
    super(paytmConfig);
  }
}
