/**
 * RailYatri Portal Adapter
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';
import { railYatriConfig } from './configs/railyatri.config';

export class RailYatriAdapter extends BasePortalAdapter {
  constructor() {
    super(railYatriConfig);
  }
}
