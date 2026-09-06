export interface PositionSwitchResults {
  besideName: boolean;
  headerRight: boolean;
  belowName: boolean;
}

export interface HoverPopoverResults {
  opened: boolean;
  box1Class: string;
  colorsPassed: boolean;
  locationClean: boolean;
  locationText: string;
  zeroDuplicates: boolean;
  clockFormatted: boolean;
  actionButtons: boolean;
}

export interface PlaywrightPortalResult {
  step: number;
  portal: string;
  url: string;
  trainsIdentified: number;
  buttonInjected: boolean;
  positions: PositionSwitchResults;
  deltaY: number;
  popover: HoverPopoverResults;
  screenshotFile: string;
  status: 'PASSED' | 'FAILED';
  error?: string;
}

export type ProviderVerificationFn = (
  context: any,
  distDir: string,
  screenshotsDir: string,
  isHeadless: boolean
) => Promise<PlaywrightPortalResult>;
