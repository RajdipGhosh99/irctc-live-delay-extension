/**
 * Core Utilities: ISO Formatter, Date Resolver, Delay Parser, and Math Helpers
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

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
    if (diffMinutes <= 0) return `${timeStr} (Just now)`;
    if (diffMinutes === 1) return `${timeStr} (1 min ago)`;
    if (diffMinutes < 60) return `${timeStr} (${diffMinutes} mins ago)`;
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

export function sanitizeHtml(str: string): string {
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
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // 2. YYYYMMDD (e.g. 20260829)
  const compactMatch = str.match(/\b(20\d\d)(0[1-9]|1[0-2])([0-3]\d)\b/);
  if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;

  // 3. DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/\b([0-3]?\d)[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d\d)\b/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 4. DDMMYYYY
  const dmyCompact = str.match(/\b([0-3]\d)(0[1-9]|1[0-2])(20\d\d)\b/);
  if (dmyCompact) return `${dmyCompact[3]}-${dmyCompact[2]}-${dmyCompact[1]}`;

  // 5. "29 Aug 2026", "29 August, 2026"
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
    if (monthNum) return `${year}-${monthNum}-${day}`;
  }

  // 6. Day + Month without Year: "29 Aug", "Sat, 29 Aug"
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
      const currentYear = new Date().getFullYear();
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

  if (/(?:right\s*time|on\s*time|rt|ontime|no\s*delay|on\s*schedule|running\s*on\s*time)/i.test(str) && !/(?:delay|late|behind)/i.test(str)) {
    return 0;
  }

  const pureColonMatch = str.match(/^([+-])?(\d{1,2}):(\d{2})$/);
  if (pureColonMatch) {
    const sign = pureColonMatch[1] === '-' ? -1 : 1;
    const hours = parseInt(pureColonMatch[2], 10) || 0;
    const mins = parseInt(pureColonMatch[3], 10) || 0;
    return sign * (hours * 60 + mins);
  }

  if (/^[+-]?\d+$/.test(str)) {
    return parseInt(str, 10) || 0;
  }

  const keywordHhMmMatch = str.match(/(?:delay|delayed|late|behind|late\s*by|delay\s*by|delaying)\s*(?:is|:)?\s*(\d{1,2}):(\d{2})/i);
  if (keywordHhMmMatch) {
    const hours = parseInt(keywordHhMmMatch[1], 10) || 0;
    const mins = parseInt(keywordHhMmMatch[2], 10) || 0;
    return hours * 60 + mins;
  }

  const keywordHrMinMatch = str.match(/(?:delay|delayed|late|behind|late\s*by|delay\s*by)\s*(?:is|:)?\s*(\d+)\s*(?:hr|hour|hours|h)\s*(?:and)?\s*(\d+)?\s*(?:min|mins|minute|minutes|m)?/i);
  if (keywordHrMinMatch) {
    const hours = parseInt(keywordHrMinMatch[1], 10) || 0;
    const mins = keywordHrMinMatch[2] ? parseInt(keywordHrMinMatch[2], 10) : 0;
    return hours * 60 + mins;
  }

  const keywordMinMatch = str.match(/(?:delay|delayed|late|behind|late\s*by|delay\s*by)\s*(?:is|:)?\s*(\d+)\s*(?:min|mins|minute|minutes|m)?/i);
  if (keywordMinMatch) {
    return parseInt(keywordMinMatch[1], 10) || 0;
  }

  let totalMinutes = 0;
  let hasUnitMatch = false;

  const generalHr = str.match(/(\d+)\s*(?:hr|hour|hours|h)\b/i);
  if (generalHr) {
    totalMinutes += parseInt(generalHr[1], 10) * 60;
    hasUnitMatch = true;
  }

  const generalMin = str.match(/(\d+)\s*(?:min|mins|minute|minutes|m)\b/i);
  if (generalMin) {
    totalMinutes += parseInt(generalMin[1], 10);
    hasUnitMatch = true;
  }

  if (hasUnitMatch) {
    if (str.includes('early') || str.includes('before') || str.startsWith('-')) {
      return -totalMinutes;
    }
    return totalMinutes;
  }

  const earlyMatch = str.match(/(?:early|before\s*time|ahead)\s*(?:by|is|:)?\s*(\d{1,2}):(\d{2})/i);
  if (earlyMatch) {
    const hours = parseInt(earlyMatch[1], 10) || 0;
    const mins = parseInt(earlyMatch[2], 10) || 0;
    return -(hours * 60 + mins);
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

export function formatDelayHhMm(delayMinutes: number, withSign = true): string {
  if (isNaN(delayMinutes) || delayMinutes === null || delayMinutes === undefined) {
    return '00:00';
  }
  const isEarly = delayMinutes < 0;
  const absMin = Math.abs(Math.round(delayMinutes));
  const hours = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');

  if (absMin === 0) return '00:00';
  if (!withSign) return `${hh}:${mm}`;
  const sign = isEarly ? '-' : '+';
  return `${sign}${hh}:${mm}`;
}

export function formatDelayShort(delayMinutes: number): string {
  if (isNaN(delayMinutes) || (delayMinutes <= 5 && delayMinutes >= -5)) {
    return 'On Time';
  }
  return formatDelayHhMm(delayMinutes, true);
}

export function formatDelayLong(delayMinutes: number): string {
  if (isNaN(delayMinutes) || (delayMinutes <= 5 && delayMinutes >= -5)) {
    return delayMinutes < 0 ? `Running ${Math.abs(delayMinutes)} mins Early` : 'Running Right Time';
  }

  const isEarly = delayMinutes < 0;
  const absMin = Math.abs(delayMinutes);
  const direction = isEarly ? 'Early' : 'Late';

  if (absMin < 60) return `Running ${absMin} mins ${direction}`;

  const hours = Math.floor(absMin / 60);
  const remainderMins = absMin % 60;
  const hrStr = hours === 1 ? '1 hr' : `${hours} hrs`;

  if (remainderMins === 0) return `Running ${hrStr} ${direction}`;
  return `Running ${hrStr} ${remainderMins} mins ${direction}`;
}

export function shortenLiveLocation(locationStr?: string, maxLen = 42): string {
  if (!locationStr) return 'Live location unavailable';
  let clean = locationStr.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1).trim() + '…';
}

/**
 * Universal 5-digit train number extractor supporting isolated numbers and concatenated titles (e.g. "12904Golden", "22436", "04153")
 */
export function extractTrainNumberRegex(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(?:^|[^\d])(\d{5})(?=[^\d]|$)/);
  return match ? match[1] : null;
}

