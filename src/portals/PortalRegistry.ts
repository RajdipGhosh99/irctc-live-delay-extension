/**
 * Portal Registry & Adapter Factory
 * Dispatches active website adapter based on current hostname
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { BasePortalAdapter, PortalAdapter } from './BasePortalAdapter';
import { ClearTripAdapter } from './ClearTripAdapter';
import { ConfirmTktAdapter } from './ConfirmTktAdapter';
import { EaseMyTripAdapter } from './EaseMyTripAdapter';
import { GenericPortalAdapter } from './GenericPortalAdapter';
import { GoibiboAdapter } from './GoibiboAdapter';
import { IrctcAdapter } from './IrctcAdapter';
import { IxigoAdapter } from './IxigoAdapter';
import { MakeMyTripAdapter } from './MakeMyTripAdapter';
import { PaytmAdapter } from './PaytmAdapter';
import { RailYatriAdapter } from './RailYatriAdapter';

export class PortalRegistry {
  private static adapters: BasePortalAdapter[] = [
    new ConfirmTktAdapter(),
    new IrctcAdapter(),
    new MakeMyTripAdapter(),
    new IxigoAdapter(),
    new PaytmAdapter(),
    new ClearTripAdapter(),
    new GoibiboAdapter(),
    new EaseMyTripAdapter(),
    new RailYatriAdapter(),
  ];

  private static genericAdapter: BasePortalAdapter = new GenericPortalAdapter();

  public static getActiveAdapter(url = window.location.href, hostname = window.location.hostname): PortalAdapter {
    for (const adapter of this.adapters) {
      if (adapter.matches(url, hostname)) {
        return adapter;
      }
    }
    return this.genericAdapter;
  }

  public static getAllAdapters(): PortalAdapter[] {
    return [...this.adapters, this.genericAdapter];
  }
}
