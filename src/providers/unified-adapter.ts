/**
 * Unified Multi-Provider Normalization Adapter
 * Standardizes disparate API payloads from IRCTC, RapidAPI, IndianRailAPI, and Custom Endpoints
 * into a single, canonical, strictly typed UnifiedTrainStatus structure.
 * 
 * Standards Compliance:
 * - ISO 8601 (Timestamps & Dates)
 * - ISO/IEC 25010 (Fault Tolerance & Uniform Contract)
 * 
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { ProviderId, TrainDelayData } from '../types';
import {
  getIso8601Timestamp,
  getIso8601Date,
  parseDelayToMinutes,
  calculateTimeDiffMinutes,
} from '../utils/iso-utils';

/**
 * Canonical Data Model for Unified Train Status
 */
export interface CanonicalStationInfo {
  name: string;
  code: string;
  hasArrived?: boolean;
  hasDeparted?: boolean;
  scheduledArrival?: string;
  actualArrival?: string;
  scheduledDeparture?: string;
  actualDeparture?: string;
}

/**
 * Searches across multiple possible field names for a string or primitive value
 */
function findFirstValue(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;

  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
      return obj[k];
    }
  }

  // Check nested data / result containers
  const containers = [obj.data, obj.result, obj.response, obj.CurrentStation, obj.currentStation, obj.curStn];
  for (const container of containers) {
    if (container && typeof container === 'object') {
      for (const k of keys) {
        if (container[k] !== undefined && container[k] !== null && container[k] !== '') {
          return container[k];
        }
      }
    }
  }

  return undefined;
}

/**
 * Cleans and standardizes train name strings
 */
function sanitizeTrainName(rawName?: string, defaultNumber?: string): string {
  if (!rawName) return `Train ${defaultNumber || ''}`.trim();
  return String(rawName)
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes station array across all API formats (station_details, stations, stationList, PreviousStations, etc.)
 */
function extractStationList(rawJson: any): any[] {
  if (!rawJson) return [];

  const candidates = [
    rawJson.data?.station_details,
    rawJson.data?.previous_stations,
    rawJson.data?.stations,
    rawJson.data?.stationList,
    rawJson.stations,
    rawJson.stationList,
    rawJson.stationData,
    rawJson.StationDetails,
    rawJson.PreviousStations,
    rawJson.Stations,
    rawJson.result?.stations,
  ];

  for (const cand of candidates) {
    if (Array.isArray(cand) && cand.length > 0) {
      return cand;
    }
  }

  return [];
}

/**
 * Unified Normalization Engine: Ingests any arbitrary provider JSON response
 * and outputs a 100% consistent, standardized TrainDelayData contract.
 */
export function normalizeUnifiedTrainResponse(
  rawJson: any,
  providerId: ProviderId,
  providerName: string,
  requestedTrainNumber: string,
  travelDate?: string
): TrainDelayData {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error(`${providerName}: Empty or invalid payload received from API.`);
  }

  // 0. Handle Official IRCTC NTES vInstanceList structure
  let irctcTrainPositionStr: string | undefined;
  const irctcInstance = Array.isArray(rawJson.vInstanceList) && rawJson.vInstanceList.length > 0 ? rawJson.vInstanceList[0] : null;
  if (irctcInstance) {
    if (!rawJson.trainName && irctcInstance.trainName) {
      rawJson.trainName = irctcInstance.trainName;
    }
    if (irctcInstance.trainPosition) {
      irctcTrainPositionStr = String(irctcInstance.trainPosition);
      // Parse Delay: e.g. "Delay: 01:21", "Delay: 17 Mins", "Delay: Right Time"
      const delayMatch = irctcTrainPositionStr.match(/Delay:\s*(\d{1,2}):(\d{2})/i) || irctcTrainPositionStr.match(/Delay:\s*(\d+)\s*(?:min|mins|m)/i);
      if (delayMatch) {
        if (delayMatch[2] !== undefined) {
          rawJson.delay = parseInt(delayMatch[1], 10) * 60 + parseInt(delayMatch[2], 10);
        } else {
          rawJson.delay = parseInt(delayMatch[1], 10);
        }
      } else if (/right\s*time|on\s*time/i.test(irctcTrainPositionStr)) {
        rawJson.delay = 0;
      }

      // Parse Station: e.g. "Departed from JHARSUGUDA JN(JSG) at 10:56"
      const stnMatch = irctcTrainPositionStr.match(/(?:from|at)\s+([A-Za-z0-9\s]+?)\s*\(([A-Z0-9]+)\)/i);
      if (stnMatch) {
        rawJson.current_station_name = stnMatch[1].trim();
        rawJson.current_station_code = stnMatch[2].trim();
      }
    }
  }

  // 1. Unified Train Number Resolution
  const rawTrainNo = findFirstValue(rawJson, [
    'train_no', 'trainNo', 'trainNumber', 'TrainNumber', 'train_number', 'TrainNo', 'train'
  ]);
  const trainNumber = String(rawTrainNo || requestedTrainNumber || '').replace(/[^\d]/g, '').slice(0, 5);

  // 2. Unified Train Name Resolution
  const rawTrainName = findFirstValue(rawJson, [
    'train_name', 'trainName', 'TrainName', 'train_title', 'name', 'title'
  ]);
  const trainName = sanitizeTrainName(rawTrainName, trainNumber);

  // 3. Unified Current Station Resolution
  let currentStationName = findFirstValue(rawJson, [
    'current_station_name', 'currentStationName', 'CurrentStationName',
    'cur_station_name', 'curStnName', 'station_name', 'StationName', 'stationName'
  ]);
  let currentStationCode = findFirstValue(rawJson, [
    'current_station_code', 'currentStationCode', 'CurrentStationCode',
    'cur_station_code', 'curStnCode', 'station_code', 'StationCode', 'stationCode', 'stnCode'
  ]);
  let nextStationName = findFirstValue(rawJson, [
    'upcoming_station', 'next_station_name', 'nextStationName', 'NextStationName',
    'next_station', 'nextStation', 'upcomingStation'
  ]);

  // Handle nested objects: e.g. currentStation: { name: '...', code: '...' }
  const currentStnObj = rawJson.currentStation || rawJson.CurrentStation || rawJson.data?.current_station || rawJson.data?.curStn;
  if (currentStnObj && typeof currentStnObj === 'object') {
    if (!currentStationName) {
      currentStationName = currentStnObj.stationName || currentStnObj.station_name || currentStnObj.StationName || currentStnObj.stnName;
    }
    if (!currentStationCode) {
      currentStationCode = currentStnObj.stationCode || currentStnObj.station_code || currentStnObj.StationCode || currentStnObj.stnCode;
    }
  }

  const nextStnObj = rawJson.nextStation || rawJson.NextStation || rawJson.data?.next_station;
  if (nextStnObj && typeof nextStnObj === 'object' && !nextStationName) {
    nextStationName = nextStnObj.stationName || nextStnObj.station_name || nextStnObj.StationName || nextStnObj.stnName;
  }

  // 4. Unified Delay Resolution
  let delayMinutes = 0;
  let delayFound = false;

  const directDelayFields = [
    'delay', 'delay_in_minutes', 'delayInMinutes', 'late_minutes', 'lateMinutes',
    'delay_time', 'delayTime', 'delay_in_arrival', 'delayInArrival', 'DelayInArrival',
    'delay_in_departure', 'delayInDeparture', 'DelayInDeparture'
  ];

  for (const field of directDelayFields) {
    const rawVal = findFirstValue(rawJson, [field]);
    if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
      const parsed = parseDelayToMinutes(rawVal);
      if (parsed !== 0 || String(rawVal).includes('0')) {
        delayMinutes = parsed;
        delayFound = true;
        break;
      }
    }
  }

  // 5. Unified Station List Traversal & Itinerary Fallback
  const stationList = extractStationList(rawJson);
  if (stationList.length > 0) {
    // Find active / visited stations
    const visited = stationList.filter((s: any) =>
      s.has_departed || s.has_arrived || s.hasDeparted || s.hasArrived ||
      s.station_status === 'DEPARTED' || s.station_status === 'ARRIVED' ||
      s.is_current || s.isCurrent
    );
    const activeStn = visited.length > 0 ? visited[visited.length - 1] : stationList[0];

    if (activeStn) {
      if (!currentStationName || currentStationName === 'En Route') {
        currentStationName = activeStn.station_name || activeStn.stationName || activeStn.StationName || activeStn.stnName || 'En Route';
        currentStationCode = activeStn.station_code || activeStn.stationCode || activeStn.StationCode || activeStn.stnCode || '';
      }

      if (!delayFound) {
        const stnDelay = parseDelayToMinutes(
          activeStn.delay_in_arrival ?? activeStn.delayInArrival ??
          activeStn.delay_in_departure ?? activeStn.delayInDeparture ??
          activeStn.delay ?? activeStn.late_minutes ?? activeStn.DelayInArrival
        );
        if (stnDelay !== 0) {
          delayMinutes = stnDelay;
          delayFound = true;
        } else if ((activeStn.sta || activeStn.scheduledArrival) && (activeStn.eta || activeStn.actualArrival)) {
          const sched = activeStn.sta || activeStn.scheduledArrival;
          const actual = activeStn.eta || activeStn.actualArrival;
          const diff = calculateTimeDiffMinutes(sched, actual);
          if (diff !== 0) {
            delayMinutes = diff;
            delayFound = true;
          }
        }
      }
    }

    if (!nextStationName) {
      const upcoming = stationList.find((s: any) => !s.has_departed && !s.has_arrived && !s.hasDeparted && !s.hasArrived);
      if (upcoming) {
        nextStationName = upcoming.station_name || upcoming.stationName || upcoming.StationName || upcoming.stnName || '';
      }
    }
  }

  // 6. Unified Journey Status & Summary Formulation
  const isStarted = rawJson.data?.is_train_started !== false &&
    rawJson.is_train_started !== false &&
    rawJson.data?.train_start_date !== null;

  const now = new Date();
  const isOnTime = delayMinutes <= 5 && delayMinutes >= -5;

  let statusSummary: string;
  if (irctcTrainPositionStr && irctcTrainPositionStr.length > 5) {
    statusSummary = irctcTrainPositionStr;
  } else if (!isStarted && delayMinutes === 0 && (!currentStationName || currentStationName === 'Origin' || currentStationName === 'En Route')) {
    statusSummary = 'Scheduled (Not Started Yet)';
  } else if (isOnTime) {
    statusSummary = delayMinutes < 0 ? `Running ${Math.abs(delayMinutes)} mins Early` : 'Running Right Time';
  } else {
    statusSummary = `Running ${delayMinutes} mins Late`;
  }

  return {
    trainNumber: trainNumber || requestedTrainNumber,
    trainName,
    delayMinutes,
    isOnTime,
    currentStationName: String(currentStationName || 'En Route'),
    currentStationCode: String(currentStationCode || ''),
    nextStationName: nextStationName ? String(nextStationName) : undefined,
    lastUpdated: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    fetchedTimestamp: now.getTime(),
    isoTimestamp: getIso8601Timestamp(now),
    isoDate: travelDate || getIso8601Date(now),
    statusSummary,
    source: 'network',
    providerName,
  };
}
