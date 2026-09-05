/**
 * IRCTC Portal Adapter
 * Dedicated adapter for IRCTC NextGen portal (irctc.co.in)
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter } from './BasePortalAdapter';
import { irctcConfig } from './configs/irctc.config';

export class IrctcAdapter extends BasePortalAdapter {
  constructor() {
    super(irctcConfig);
  }
}
