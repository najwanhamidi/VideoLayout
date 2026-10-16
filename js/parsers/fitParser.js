/**
 * FIT Parser
 * Parses Garmin/FIT binary activity files using the official Garmin Fit SDK.
 */
import { Decoder, Stream } from '../vendor/fitsdk.bundle.js';
import { haversineDistance } from '../splitCalculator.js';

export function parseFIT(arrayBuffer) {
  const stream = Stream.fromByteArray(new Uint8Array(arrayBuffer));
  const decoder = new Decoder(stream);
  const { messages } = decoder.read();

  if (!messages) {
    throw new Error('Failed to read FIT file messages.');
  }

  const session = messages.sessionMesgs && messages.sessionMesgs[0] ? messages.sessionMesgs[0] : {};
  const rawLaps = messages.lapMesgs || [];
  const records = messages.recordMesgs || [];

  if (records.length === 0 && rawLaps.length === 0) {
    throw new Error('No activity records found in this FIT file.');
  }

  const SEMICIRCLE_TO_DEG = 180 / Math.pow(2, 31);
  const trackpoints = [];

  let totalDistance = 0;
  let totalAscent = 0;
  let totalDescent = 0;
  let hrSum = 0;
  let hrCount = 0;
  let maxHr = 0;
  let cadSum = 0;
  let cadCount = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;

  let prevLat = null;
  let prevLon = null;
  let prevEle = null;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];

    // Coordinate conversion from semicircles
    let lat = null;
    let lon = null;
    if (typeof rec.positionLat === 'number' && typeof rec.positionLong === 'number') {
      lat = rec.positionLat * SEMICIRCLE_TO_DEG;
      lon = rec.positionLong * SEMICIRCLE_TO_DEG;
    }

    const ele = typeof rec.altitude === 'number' ? rec.altitude : (typeof rec.enhancedAltitude === 'number' ? rec.enhancedAltitude : null);
    if (ele !== null && !isNaN(ele)) {
      if (ele < minEle) minEle = ele;
      if (ele > maxEle) maxEle = ele;

      if (prevEle !== null) {
        const d = ele - prevEle;
        if (d > 0.5) totalAscent += d;
        else if (d < -0.5) totalDescent += Math.abs(d);
      }
      prevEle = ele;
    }

    // Cumulative distance
    let dist = typeof rec.distance === 'number' ? rec.distance : null;
    if (dist === null) {
      if (lat !== null && lon !== null && prevLat !== null && prevLon !== null) {
        totalDistance += haversineDistance(prevLat, prevLon, lat, lon);
      }
      dist = totalDistance;
    } else {
      totalDistance = dist;
    }

    // Heart rate
    const hr = typeof rec.heartRate === 'number' ? rec.heartRate : null;
    if (hr && hr > 30) {
      hrSum += hr;
      hrCount++;
      if (hr > maxHr) maxHr = hr;
    }

    // Cadence (convert single-leg rpm to spm if needed)
    let cad = typeof rec.cadence === 'number' ? rec.cadence : null;
    if (cad && cad > 0) {
      if (cad < 120) cad = cad * 2; // running SPM adjustment if stored as single-leg RPM
      cadSum += cad;
      cadCount++;
    }

    const time = rec.timestamp instanceof Date ? rec.timestamp : (rec.timestamp ? new Date(rec.timestamp) : null);

    const hasGps = (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon));
    const hasDistOrTime = (dist !== null || time !== null || hr !== null || (rec.speed !== undefined && rec.speed !== null));

    if (hasGps || hasDistOrTime) {
      trackpoints.push({
        lat: hasGps ? lat : null,
        lon: hasGps ? lon : null,
        ele,
        time,
        hr,
        cad,
        dist,
        speed: rec.speed || rec.enhancedSpeed || null,
      });

      if (hasGps) {
        prevLat = lat;
        prevLon = lon;
      }
    }
  }

  // Session aggregate values fallback
  const sessionDist = session.totalDistance || totalDistance;
  const sessionDuration = session.totalTimerTime || session.totalElapsedTime || (trackpoints.length > 1 && trackpoints[0].time && trackpoints[trackpoints.length - 1].time ? (trackpoints[trackpoints.length - 1].time - trackpoints[0].time) / 1000 : 0);
  const sessionAvgHr = session.avgHeartRate || (hrCount > 0 ? Math.round(hrSum / hrCount) : null);
  const sessionMaxHr = session.maxHeartRate || maxHr || null;
  const sessionCad = session.avgCadence ? (session.avgCadence < 120 ? session.avgCadence * 2 : session.avgCadence) : (cadCount > 0 ? Math.round(cadSum / cadCount) : null);
  const sessionAscent = typeof session.totalAscent === 'number' ? session.totalAscent : Math.round(totalAscent);
  const sessionDescent = typeof session.totalDescent === 'number' ? session.totalDescent : Math.round(totalDescent);
  const calories = session.totalCalories || Math.round(sessionDist * 0.065);

  const avgSpeed = sessionDist > 0 && sessionDuration > 0 ? sessionDist / sessionDuration : 0;
  const avgPace = avgSpeed > 0 ? 1000 / avgSpeed : 0;

  // Standardize native laps
  const standardizedLaps = rawLaps.map((lap, i) => {
    let lapCad = lap.avgCadence || null;
    if (lapCad && lapCad < 120) lapCad = lapCad * 2;
    return {
      lapIndex: i + 1,
      totalDistance: lap.totalDistance || 0,
      totalTimerTime: lap.totalTimerTime || lap.totalElapsedTime || 0,
      totalCalories: lap.totalCalories || 0,
      avgHeartRate: lap.avgHeartRate || null,
      maxHeartRate: lap.maxHeartRate || null,
      avgCadence: lapCad,
      totalAscent: lap.totalAscent || 0,
      totalDescent: lap.totalDescent || 0,
      avgSpeed: lap.avgSpeed || lap.enhancedAvgSpeed || 0,
    };
  });

  return {
    format: 'fit',
    title: session.sport ? `${session.sport.toString().toUpperCase()} Run` : 'Running Activity',
    sport: session.sport || 'running',
    startTime: session.startTime || (trackpoints[0]?.time) || new Date(),
    distance: sessionDist,
    duration: sessionDuration,
    elapsedTime: session.totalElapsedTime || sessionDuration,
    avgPace: avgPace,
    avgHr: sessionAvgHr,
    maxHr: sessionMaxHr,
    avgCadence: sessionCad,
    elevationGain: sessionAscent,
    elevationLoss: sessionDescent,
    minElevation: minEle !== Infinity ? Math.round(minEle) : 0,
    maxElevation: maxEle !== -Infinity ? Math.round(maxEle) : 0,
    calories,
    trackpoints,
    rawLaps: standardizedLaps,
  };
}
