/**
 * Ixigo Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';
import { ixigoConfig } from './configs/ixigo.config';

export class IxigoAdapter extends BasePortalAdapter {
  constructor() {
    super(ixigoConfig);
  }
}
