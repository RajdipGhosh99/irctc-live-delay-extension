/**
 * Goibibo Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';
import { goibiboConfig } from './configs/goibibo.config';

export class GoibiboAdapter extends BasePortalAdapter {
  constructor() {
    super(goibiboConfig);
  }
}
