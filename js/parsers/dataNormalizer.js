/**
 * Data Normalizer
 * Unified entry point to parse FIT, TCX, GPX and calculate splits, laps, bounds, and HR zones.
 */
import { parseGPX } from './gpxParser.js';
import { parseTCX } from './tcxParser.js';
import { parseFIT } from './fitParser.js';
import { calculateSplits, standardizeLaps, formatPace, formatTime } from '../splitCalculator.js';

export async function parseActivityFile(file, isImperial = false, splitDistanceMeters = 1000) {
  const fileName = file.name.toLowerCase();
  let rawData;

  if (fileName.endsWith('.fit')) {
    const arrayBuffer = await file.arrayBuffer();
    rawData = parseFIT(arrayBuffer);
  } else if (fileName.endsWith('.tcx')) {
    const text = await file.text();
    rawData = parseTCX(text);
  } else if (fileName.endsWith('.gpx')) {
    const text = await file.text();
    rawData = parseGPX(text);
  } else {
    // Attempt auto-detection
    const text = await file.text();
    if (text.includes('<TrainingCenterDatabase') || text.includes('<Lap')) {
      rawData = parseTCX(text);
    } else if (text.includes('<gpx')) {
      rawData = parseGPX(text);
    } else {
      const buffer = await file.arrayBuffer();
      rawData = parseFIT(buffer);
    }
  }

  return normalizeActivity(rawData, isImperial, splitDistanceMeters);
}

export function recalculateActivitySplits(activity, splitDistanceMeters = 1000, isImperial = false) {
  const splits = calculateSplits(activity.trackpoints, splitDistanceMeters, isImperial);
  activity.splits = splits;
  activity.splitDistanceMeters = splitDistanceMeters;

  // Recalculate best pace
  let bestPace = activity.avgPace;
  splits.forEach((s) => {
    if (s.pace > 0 && s.pace < bestPace) {
      bestPace = s.pace;
    }
  });
  activity.bestPace = bestPace;
  activity.bestPaceFormatted = formatPace(bestPace, isImperial);
  return splits;
}

export function normalizeActivity(rawData, isImperial = false, splitDistanceMeters = 1000) {
  const trackpoints = rawData.trackpoints || [];

  // Calculate custom distance splits
  const splitDist = splitDistanceMeters || (isImperial ? 1609.34 : 1000);
  const splits = calculateSplits(trackpoints, splitDist, isImperial);

  // Standardize native laps if present
  let laps = [];
  if (rawData.rawLaps && rawData.rawLaps.length > 0) {
    laps = standardizeLaps(rawData.rawLaps, isImperial);
  }

  // Calculate Best (Fastest) Pace from splits or trackpoint rolling window
  let bestPace = rawData.avgPace;
  splits.forEach((s) => {
    if (s.pace > 0 && s.pace < bestPace) {
      bestPace = s.pace;
    }
  });

  // Calculate GPS Bounding Box
  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;

  trackpoints.forEach((pt) => {
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
    if (pt.lon < minLon) minLon = pt.lon;
    if (pt.lon > maxLon) maxLon = pt.lon;
  });

  const hasRoute = trackpoints.length > 1 && minLat !== 90 && maxLat - minLat > 0.0001;

  // Build telemetry curves for Pace Graph and Heart Rate Graph
  const hrCurve = [];
  const paceCurve = [];
  let minHr = 300;
  let maxHrObserved = rawData.maxHr || 0;

  for (let i = 0; i < trackpoints.length; i++) {
    const pt = trackpoints[i];
    // Heart rate
    if (pt.hr && pt.hr > 40) {
      if (pt.hr < minHr) minHr = pt.hr;
      if (pt.hr > maxHrObserved) maxHrObserved = pt.hr;
      hrCurve.push({ dist: pt.dist, hr: pt.hr });
    }
    // Pace
    let pace = null;
    if (pt.speed && pt.speed > 0.5) {
      pace = 1000 / pt.speed;
    } else if (i > 0) {
      const prev = trackpoints[i - 1];
      const dDist = pt.dist - prev.dist;
      const t1 = pt.time instanceof Date ? pt.time.getTime() : pt.time;
      const t0 = prev.time instanceof Date ? prev.time.getTime() : prev.time;
      const dTime = t1 && t0 ? (t1 - t0) / 1000 : 0;
      if (dDist > 5 && dTime > 0) {
        pace = dTime / (dDist / 1000);
      }
    }
    if (pace && pace >= 120 && pace <= 900) {
      paceCurve.push({ dist: pt.dist, pace });
    }
  }

  // Calculate HR Zones distribution (Z1: <60%, Z2: 60-70%, Z3: 70-80%, Z4: 80-90%, Z5: >90%)
  const maxHeartRate = maxHrObserved || (rawData.avgHr ? Math.round(rawData.avgHr * 1.15) : 190);
  const zThresholds = [
    maxHeartRate * 0.6,
    maxHeartRate * 0.7,
    maxHeartRate * 0.8,
    maxHeartRate * 0.9,
  ];

  const hrZones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, totalSeconds: 0 };
  let hrPointsCount = 0;

  for (let i = 1; i < trackpoints.length; i++) {
    const pt = trackpoints[i];
    const prev = trackpoints[i - 1];
    if (pt.hr && pt.hr > 40) {
      hrPointsCount++;
      const t1 = pt.time instanceof Date ? pt.time.getTime() : pt.time;
      const t0 = prev.time instanceof Date ? prev.time.getTime() : prev.time;
      const dt = t1 && t0 ? Math.min(30, Math.max(1, (t1 - t0) / 1000)) : 1;
      hrZones.totalSeconds += dt;

      if (pt.hr < zThresholds[0]) hrZones.z1 += dt;
      else if (pt.hr < zThresholds[1]) hrZones.z2 += dt;
      else if (pt.hr < zThresholds[2]) hrZones.z3 += dt;
      else if (pt.hr < zThresholds[3]) hrZones.z4 += dt;
      else hrZones.z5 += dt;
    }
  }

  // Format Date and Time
  const startDate = rawData.startTime instanceof Date ? rawData.startTime : new Date();
  const dateFormatted = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = startDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Imperial conversions
  const distKm = rawData.distance / 1000;
  const distMi = rawData.distance / 1609.34;
  const distanceMain = isImperial ? distMi.toFixed(2) : distKm.toFixed(2);
  const distanceUnit = isImperial ? 'mi' : 'km';

  return {
    title: rawData.title || 'Running Activity',
    dateFormatted,
    timeFormatted,
    startDate,
    distance: rawData.distance,
    distanceMain,
    distanceUnit,
    duration: rawData.duration,
    durationFormatted: formatTime(rawData.duration),
    elapsedTime: rawData.elapsedTime,
    avgPace: rawData.avgPace,
    avgPaceFormatted: formatPace(rawData.avgPace, isImperial),
    bestPace: bestPace,
    bestPaceFormatted: formatPace(bestPace, isImperial),
    avgHr: rawData.avgHr,
    maxHr: maxHeartRate,
    minHr: minHr !== 300 ? minHr : Math.round(rawData.avgHr * 0.8),
    avgCadence: rawData.avgCadence,
    elevationGain: rawData.elevationGain,
    elevationLoss: rawData.elevationLoss,
    minElevation: rawData.minElevation,
    maxElevation: rawData.maxElevation,
    calories: rawData.calories,
    trackpoints,
    splits,
    splitDistanceMeters: splitDist,
    laps,
    hasLaps: laps.length > 0,
    hasRoute,
    bounds: hasRoute ? { minLat, maxLat, minLon, maxLon } : null,
    hrZones: hrPointsCount > 0 ? hrZones : null,
    hrCurve,
    paceCurve,
  };
}
