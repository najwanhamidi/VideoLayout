/**
 * GPX Parser
 * Parses GPX (GPS Exchange Format) XML string into standard activity object.
 */
import { haversineDistance } from '../splitCalculator.js';

export function parseGPX(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Check parsing error
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid GPX file format: ' + parserError.textContent);
  }

  // Activity title and time
  const nameEl = xmlDoc.querySelector('trk > name') || xmlDoc.querySelector('metadata > name');
  const activityTitle = nameEl ? nameEl.textContent.trim() : 'Running Activity';

  const timeEl = xmlDoc.querySelector('metadata > time') || xmlDoc.querySelector('trkpt > time');
  const startTime = timeEl ? new Date(timeEl.textContent) : new Date();

  const trkpts = xmlDoc.querySelectorAll('trkpt');
  if (trkpts.length === 0) {
    throw new Error('No track points found in this GPX file.');
  }

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
  let prevTime = null;
  let movingTimeSec = 0;

  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    const lat = parseFloat(pt.getAttribute('lat'));
    const lon = parseFloat(pt.getAttribute('lon'));

    if (isNaN(lat) || isNaN(lon)) continue;

    // Elevation
    const eleEl = pt.querySelector('ele');
    const ele = eleEl ? parseFloat(eleEl.textContent) : null;
    if (ele !== null && !isNaN(ele)) {
      if (ele < minEle) minEle = ele;
      if (ele > maxEle) maxEle = ele;
    }

    // Timestamp
    const ptTimeEl = pt.querySelector('time');
    const time = ptTimeEl ? new Date(ptTimeEl.textContent) : null;

    // Heart rate & Cadence (often in extensions)
    let hr = null;
    let cad = null;

    const hrEl = pt.querySelector('hr') || pt.querySelector('*|hr');
    if (hrEl) hr = parseInt(hrEl.textContent, 10);

    const cadEl = pt.querySelector('cad') || pt.querySelector('*|cad');
    if (cadEl) cad = parseInt(cadEl.textContent, 10);

    // Compute distance
    if (prevLat !== null && prevLon !== null) {
      const stepDist = haversineDistance(prevLat, prevLon, lat, lon);
      totalDistance += stepDist;

      if (prevEle !== null && ele !== null) {
        const dEle = ele - prevEle;
        if (dEle > 0.5) totalAscent += dEle;
        else if (dEle < -0.5) totalDescent += Math.abs(dEle);
      }

      if (prevTime && time) {
        const dSec = (time - prevTime) / 1000;
        // Moving time threshold (e.g. pace faster than 20 min/km and < 15s pause)
        if (dSec > 0 && dSec < 60) {
          const speed = stepDist / dSec; // m/s
          if (speed > 0.5) movingTimeSec += dSec;
        }
      }
    }

    if (hr && hr > 30) {
      hrSum += hr;
      hrCount++;
      if (hr > maxHr) maxHr = hr;
    }

    if (cad && cad > 30) {
      cadSum += cad;
      cadCount++;
    }

    trackpoints.push({
      lat,
      lon,
      ele,
      time,
      hr,
      cad,
      dist: totalDistance,
    });

    prevLat = lat;
    prevLon = lon;
    prevEle = ele;
    prevTime = time;
  }

  const firstPtTime = trackpoints[0]?.time;
  const lastPtTime = trackpoints[trackpoints.length - 1]?.time;
  const totalElapsedSec = firstPtTime && lastPtTime ? (lastPtTime - firstPtTime) / 1000 : movingTimeSec;
  const durationSec = movingTimeSec > 0 ? movingTimeSec : totalElapsedSec;

  const avgSpeed = totalDistance > 0 && durationSec > 0 ? totalDistance / durationSec : 0; // m/s
  const avgPace = avgSpeed > 0 ? 1000 / avgSpeed : 0; // sec/km

  return {
    format: 'gpx',
    title: activityTitle,
    startTime: startTime,
    distance: totalDistance, // meters
    duration: durationSec, // seconds
    elapsedTime: totalElapsedSec,
    avgPace: avgPace, // sec/km
    avgHr: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
    maxHr: maxHr > 0 ? maxHr : null,
    avgCadence: cadCount > 0 ? Math.round(cadSum / cadCount) : null,
    elevationGain: Math.round(totalAscent),
    elevationLoss: Math.round(totalDescent),
    minElevation: minEle !== Infinity ? Math.round(minEle) : 0,
    maxElevation: maxEle !== -Infinity ? Math.round(maxEle) : 0,
    calories: Math.round(totalDistance * 0.065), // approximate if missing
    trackpoints,
    laps: [], // GPX generally has no native laps; splitCalculator generates 1km splits
  };
}
