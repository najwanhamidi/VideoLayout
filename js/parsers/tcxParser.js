/**
 * TCX Parser
 * Parses Garmin/Training Center XML files including native workout laps and trackpoints.
 */
import { haversineDistance } from '../splitCalculator.js';

export function parseTCX(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid TCX file format: ' + parserError.textContent);
  }

  const activityEl = xmlDoc.querySelector('Activity');
  const sport = activityEl ? activityEl.getAttribute('Sport') : 'Running';
  const idEl = xmlDoc.querySelector('Activity > Id');
  const startTime = idEl ? new Date(idEl.textContent) : new Date();

  const lapEls = xmlDoc.querySelectorAll('Lap');
  const rawLaps = [];
  const trackpoints = [];

  let totalDistance = 0;
  let totalDuration = 0;
  let totalCalories = 0;
  let totalAscent = 0;
  let totalDescent = 0;
  let hrSum = 0;
  let hrCount = 0;
  let maxHr = 0;
  let cadSum = 0;
  let cadCount = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;

  let prevEle = null;
  let prevLat = null;
  let prevLon = null;
  let runningDist = 0;

  lapEls.forEach((lapEl, lapIdx) => {
    const totalTimeEl = lapEl.querySelector('TotalTimeSeconds');
    const lapDuration = totalTimeEl ? parseFloat(totalTimeEl.textContent) : 0;

    const distEl = lapEl.querySelector('DistanceMeters');
    const lapDist = distEl ? parseFloat(distEl.textContent) : 0;

    const calEl = lapEl.querySelector('Calories');
    const lapCal = calEl ? parseInt(calEl.textContent, 10) : 0;

    const avgHrEl = lapEl.querySelector('AverageHeartRateBpm > Value');
    const lapAvgHr = avgHrEl ? parseInt(avgHrEl.textContent, 10) : null;

    const maxHrEl = lapEl.querySelector('MaximumHeartRateBpm > Value');
    const lapMaxHr = maxHrEl ? parseInt(maxHrEl.textContent, 10) : null;

    const cadEl = lapEl.querySelector('Cadence');
    const lapCad = cadEl ? parseInt(cadEl.textContent, 10) : null;

    totalDuration += lapDuration;
    totalCalories += lapCal;

    rawLaps.push({
      lapIndex: lapIdx + 1,
      totalDistance: lapDist,
      totalTimerTime: lapDuration,
      totalCalories: lapCal,
      avgHeartRate: lapAvgHr,
      maxHeartRate: lapMaxHr,
      avgCadence: lapCad,
    });

    // Parse trackpoints inside this lap
    const trkptEls = lapEl.querySelectorAll('Trackpoint');
    trkptEls.forEach((ptEl) => {
      const latEl = ptEl.querySelector('Position > LatitudeDegrees');
      const lonEl = ptEl.querySelector('Position > LongitudeDegrees');
      const lat = latEl ? parseFloat(latEl.textContent) : null;
      const lon = lonEl ? parseFloat(lonEl.textContent) : null;

      const altEl = ptEl.querySelector('AltitudeMeters');
      const ele = altEl ? parseFloat(altEl.textContent) : null;

      const ptDistEl = ptEl.querySelector('DistanceMeters');
      let dist = ptDistEl ? parseFloat(ptDistEl.textContent) : null;

      const timeEl = ptEl.querySelector('Time');
      const time = timeEl ? new Date(timeEl.textContent) : null;

      const ptHrEl = ptEl.querySelector('HeartRateBpm > Value');
      const hr = ptHrEl ? parseInt(ptHrEl.textContent, 10) : null;

      const ptCadEl = ptEl.querySelector('Cadence') || ptEl.querySelector('Extensions Cadence');
      const cad = ptCadEl ? parseInt(ptCadEl.textContent, 10) : null;

      const hasGps = (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon));
      const hasDistOrTime = (dist !== null || time !== null || hr !== null || cad !== null);

      if (hasGps || hasDistOrTime) {
        if (dist === null || isNaN(dist)) {
          if (hasGps && prevLat !== null && prevLon !== null) {
            runningDist += haversineDistance(prevLat, prevLon, lat, lon);
          }
          dist = runningDist;
        } else {
          runningDist = dist;
        }

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
          lat: hasGps ? lat : null,
          lon: hasGps ? lon : null,
          ele,
          time,
          hr,
          cad,
          dist,
          lapIndex: lapIdx + 1,
        });

        if (hasGps) {
          prevLat = lat;
          prevLon = lon;
        }
      }
    });
  });

  // Calculate final distance from trackpoints or laps
  if (trackpoints.length > 0) {
    totalDistance = trackpoints[trackpoints.length - 1].dist;
  } else {
    totalDistance = rawLaps.reduce((acc, l) => acc + l.totalDistance, 0);
  }

  const avgSpeed = totalDistance > 0 && totalDuration > 0 ? totalDistance / totalDuration : 0;
  const avgPace = avgSpeed > 0 ? 1000 / avgSpeed : 0;

  return {
    format: 'tcx',
    title: `${sport} Activity`,
    sport,
    startTime,
    distance: totalDistance,
    duration: totalDuration,
    elapsedTime: totalDuration,
    avgPace,
    avgHr: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
    maxHr: maxHr > 0 ? maxHr : null,
    avgCadence: cadCount > 0 ? Math.round(cadSum / cadCount) : null,
    elevationGain: Math.round(totalAscent),
    elevationLoss: Math.round(totalDescent),
    minElevation: minEle !== Infinity ? Math.round(minEle) : 0,
    maxElevation: maxEle !== -Infinity ? Math.round(maxEle) : 0,
    calories: totalCalories || Math.round(totalDistance * 0.065),
    trackpoints,
    rawLaps,
  };
}
