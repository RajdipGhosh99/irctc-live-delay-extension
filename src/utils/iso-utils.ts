/**
 * ISO Compliance & Enterprise Performance Utility Suite
 * Standards:
 * - ISO 8601: Dates and Times
 * - ISO/IEC 25010: Software Quality & Fault Tolerance (SQuaRE)
 * - ISO/IEC 27001: Security & Privacy
 * - ISO 9241-171: Accessibility (WCAG 2.1 AA)
 * 
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

export enum IsoErrorCode {
  AUTH_REQUIRED = 'ISO_ERR_AUTH_REQUIRED',
  RATE_LIMIT_EXCEEDED = 'ISO_ERR_RATE_LIMIT_EXCEEDED',
  NETWORK_UNAVAILABLE = 'ISO_ERR_NETWORK_UNAVAILABLE',
  DATA_NOT_FOUND = 'ISO_ERR_DATA_NOT_FOUND',
  INVALID_PAYLOAD = 'ISO_ERR_INVALID_PAYLOAD',
  INTERNAL_FAULT = 'ISO_ERR_INTERNAL_FAULT',
}

export interface IsoStandardError {
  errorCode: IsoErrorCode;
  statusCode: number;
  message: string;
  detail?: string;
  isoTimestamp: string;
  providerId?: string;
}

export function getIso8601Timestamp(date: Date = new Date()): string {
  return date.toISOString();
}

export function getIso8601Date(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function parseToIso8601(val?: string | number | Date): string {
  if (!val) return getIso8601Timestamp();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'number') return new Date(val).toISOString();

  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return getIso8601Timestamp();
}

export function formatIsoHumanTime(isoTimestamp: string, locale = 'en-IN'): string {
  try {
    const date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) return 'Just now';

    const timeStr = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMinutes <= 0) {
      return `${timeStr} (Just now)`;
    }
    if (diffMinutes === 1) {
      return `${timeStr} (1 min ago)`;
    }
    if (diffMinutes < 60) {
      return `${timeStr} (${diffMinutes} mins ago)`;
    }
    return timeStr;
  } catch {
    return 'Just now';
  }
}

export function maskIsoCredential(key: string): string {
  const clean = (key || '').trim();
  if (!clean) return '••••••••';
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
}

export function sanitizeIsoString(str: string): string {
  if (!str) return '';
  return str.replace(/[<>&"'/]/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      case '/': return '&#x2F;';
      default: return char;
    }
  });
}

const MONTHS_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

export function normalizeDateToIsoDate(rawDateStr: string): string | null {
  if (!rawDateStr) return null;
  const str = rawDateStr.trim();

  // 1. Standard ISO YYYY-MM-DD
  const isoMatch = str.match(/\b(20\d\d)-(0[1-9]|1[0-2])-([0-3]\d)\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // 2. YYYYMMDD (e.g. 20260829)
  const compactMatch = str.match(/\b(20\d\d)(0[1-9]|1[0-2])([0-3]\d)\b/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }

  // 3. DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/\b([0-3]?\d)[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d\d)\b/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 4. DDMMYYYY (e.g. 29082026)
  const dmyCompact = str.match(/\b([0-3]\d)(0[1-9]|1[0-2])(20\d\d)\b/);
  if (dmyCompact) {
    return `${dmyCompact[3]}-${dmyCompact[2]}-${dmyCompact[1]}`;
  }

  // 5. "29 Aug 2026", "29 August, 2026", "Aug 29, 2026", "29-Aug-2026"
  const textMonthMatch =
    str.match(/\b([0-3]?\d)[\s\-\,]+([A-Za-z]{3,9})[\s\-\,]+(20\d\d)\b/) ||
    str.match(/\b([A-Za-z]{3,9})[\s\-\,]+([0-3]?\d)[\s\-\,]+(20\d\d)\b/);
  if (textMonthMatch) {
    let day = '';
    let mon = '';
    const year = textMonthMatch[3] || new Date().getFullYear().toString();

    if (isNaN(Number(textMonthMatch[1]))) {
      mon = textMonthMatch[1].toLowerCase().slice(0, 3);
      day = textMonthMatch[2].padStart(2, '0');
    } else {
      day = textMonthMatch[1].padStart(2, '0');
      mon = textMonthMatch[2].toLowerCase().slice(0, 3);
    }

    const monthNum = MONTHS_MAP[mon];
    if (monthNum) {
      return `${year}-${monthNum}-${day}`;
    }
  }

  // 6. Day + Month without Year: "29 Aug", "Sat, 29 Aug", "29 Aug, Sat"
  const partialMonthMatch =
    str.match(/\b([0-3]?\d)[\s\-\,]+([A-Za-z]{3,9})\b/) ||
    str.match(/\b([A-Za-z]{3,9})[\s\-\,]+([0-3]?\d)\b/);
  if (partialMonthMatch) {
    let day = '';
    let mon = '';
    if (isNaN(Number(partialMonthMatch[1]))) {
      mon = partialMonthMatch[1].toLowerCase().slice(0, 3);
      day = partialMonthMatch[2]?.padStart(2, '0');
    } else {
      day = partialMonthMatch[1].padStart(2, '0');
      mon = partialMonthMatch[2]?.toLowerCase().slice(0, 3);
    }
    const monthNum = MONTHS_MAP[mon];
    if (monthNum && day) {
      const now = new Date();
      const currentYear = now.getFullYear();
      return `${currentYear}-${monthNum}-${day}`;
    }
  }

  return null;
}

export function parseDelayToMinutes(delayVal: any): number {
  if (delayVal === undefined || delayVal === null) return 0;
  if (typeof delayVal === 'number') {
    return isNaN(delayVal) ? 0 : Math.round(delayVal);
  }

  const str = String(delayVal).trim();
  if (!str) return 0;

  const colonMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10) || 0;
    const mins = parseInt(colonMatch[2], 10) || 0;
    return hours * 60 + mins;
  }

  if (/^[+-]?\d+$/.test(str)) {
    return parseInt(str, 10) || 0;
  }

  let totalMinutes = 0;
  let matched = false;

  const hrMatch = str.match(/(\d+)\s*(?:hr|hour|hours|h)/i);
  if (hrMatch) {
    totalMinutes += parseInt(hrMatch[1], 10) * 60;
    matched = true;
  }

  const minMatch = str.match(/(\d+)\s*(?:min|mins|minute|minutes|m)/i);
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
    matched = true;
  }

  if (matched) {
    if (str.includes('early') || str.includes('before') || str.startsWith('-')) {
      return -totalMinutes;
    }
    return totalMinutes;
  }

  const digits = str.match(/(\d+)/);
  if (digits) {
    if (str.includes('early') || str.startsWith('-')) {
      return -(parseInt(digits[0], 10) || 0);
    }
    return parseInt(digits[0], 10) || 0;
  }

  if (/right\s*time|on\s*time|rt|ontime|schedule/i.test(str)) {
    return 0;
  }

  return 0;
}

export function calculateTimeDiffMinutes(scheduledTime?: string, actualTime?: string): number {
  if (!scheduledTime || !actualTime) return 0;

  const sMatch = scheduledTime.match(/(\d{1,2}):(\d{2})/);
  const aMatch = actualTime.match(/(\d{1,2}):(\d{2})/);
  if (!sMatch || !aMatch) return 0;

  const sMin = parseInt(sMatch[1], 10) * 60 + parseInt(sMatch[2], 10);
  const aMin = parseInt(aMatch[1], 10) * 60 + parseInt(aMatch[2], 10);

  let diff = aMin - sMin;
  if (diff < -720) {
    diff += 1440;
  } else if (diff > 720) {
    diff -= 1440;
  }

  return diff;
}

/**
 * Formats delay in minutes to a clean, compact badge label (e.g. "+1h 21m", "+45m", "-15m", "On Time")
 */
export function formatDelayShort(delayMinutes: number): string {
  if (isNaN(delayMinutes) || (delayMinutes <= 5 && delayMinutes >= -5)) {
    return 'On Time';
  }

  const isEarly = delayMinutes < 0;
  const absMin = Math.abs(delayMinutes);
  const sign = isEarly ? '-' : '+';

  if (absMin < 60) {
    return `${sign}${absMin}m`;
  }

  const hours = Math.floor(absMin / 60);
  const remainderMins = absMin % 60;

  if (remainderMins === 0) {
    return `${sign}${hours}h`;
  }

  return `${sign}${hours}h ${remainderMins}m`;
}

/**
 * Formats delay in minutes to human-readable verbose text (e.g. "Running 1 hr 21 mins Late", "Running 2 hrs Late", "Running 25 mins Late", "Running Right Time")
 */
export function formatDelayLong(delayMinutes: number): string {
  if (isNaN(delayMinutes) || (delayMinutes <= 5 && delayMinutes >= -5)) {
    return delayMinutes < 0 ? `Running ${Math.abs(delayMinutes)} mins Early` : 'Running Right Time';
  }

  const isEarly = delayMinutes < 0;
  const absMin = Math.abs(delayMinutes);
  const direction = isEarly ? 'Early' : 'Late';

  if (absMin < 60) {
    return `Running ${absMin} mins ${direction}`;
  }

  const hours = Math.floor(absMin / 60);
  const remainderMins = absMin % 60;
  const hrStr = hours === 1 ? '1 hr' : `${hours} hrs`;

  if (remainderMins === 0) {
    return `Running ${hrStr} ${direction}`;
  }

  return `Running ${hrStr} ${remainderMins} mins ${direction}`;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly cooldownMs: number;

  constructor(threshold = 3, cooldownMs = 180000) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  public recordSuccess(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
  }

  public recordFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();
  }

  public isOpen(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailureTime < this.cooldownMs) {
        return true;
      }
      this.failures = this.threshold - 1;
    }
    return false;
  }
}
