import { ProviderVerificationFn } from '../helpers/types';
import { verifyMakeMyTripProvider } from './makemytrip';
import { verifyConfirmTktProvider } from './confirmtkt';
import { verifyRailYatriProvider } from './railyatri';
import { verifyIrctcProvider } from './irctc';
import { verifyClearTripProvider } from './cleartrip';
import { verifyIxigoProvider } from './ixigo';
import { verifyGoibiboProvider } from './goibibo';
import { verifyPaytmProvider } from './paytm';
import { verifyEaseMyTripProvider } from './easemytrip';

export * from './makemytrip';
export * from './confirmtkt';
export * from './railyatri';
export * from './irctc';
export * from './cleartrip';
export * from './ixigo';
export * from './goibibo';
export * from './paytm';
export * from './easemytrip';

export interface ProviderItem {
  id: string;
  name: string;
  verify: ProviderVerificationFn;
}

export const ALL_E2E_PROVIDERS: ProviderItem[] = [
  { id: 'makemytrip', name: 'MakeMyTrip (Live)', verify: verifyMakeMyTripProvider },
  { id: 'confirmtkt', name: 'ConfirmTkt (Live)', verify: verifyConfirmTktProvider },
  { id: 'railyatri', name: 'RailYatri (Live)', verify: verifyRailYatriProvider },
  { id: 'irctc', name: 'IRCTC NextGen Official (Live)', verify: verifyIrctcProvider },
  { id: 'cleartrip', name: 'ClearTrip (Live)', verify: verifyClearTripProvider },
  { id: 'ixigo', name: 'Ixigo Trains (Live Search)', verify: verifyIxigoProvider },
  { id: 'goibibo', name: 'Goibibo Trains (Live)', verify: verifyGoibiboProvider },
  { id: 'paytm', name: 'Paytm Trains (Live Search)', verify: verifyPaytmProvider },
  { id: 'easemytrip', name: 'EaseMyTrip (Live)', verify: verifyEaseMyTripProvider },
];

export const PROVIDER_ALIASES: Record<string, string> = {
  mmt: 'makemytrip',
  ct: 'confirmtkt',
  ry: 'railyatri',
  emt: 'easemytrip',
};
