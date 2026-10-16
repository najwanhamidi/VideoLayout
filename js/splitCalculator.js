/**
 * Split Calculator
 * Computes metric (custom distance: 500m, 1km, 2km, 5km, etc.) and imperial splits,
 * plus parses and standardizes device laps.
 */

// Haversine formula to calculate great-circle distance between two coordinates in meters
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatPace(secondsPerKm, isImperial = false) {
  if (!secondsPerKm || isNaN(secondsPerKm) || !isFinite(secondsPerKm) || secondsPerKm <= 0) {
    return '--:--';
  }
  const paceSec = isImperial ? secondsPerKm * 1.60934 : secondsPerKm;
  const minutes = Math.floor(paceSec / 60);
  const seconds = Math.floor(paceSec % 60);
  const unit = isImperial ? '/mi' : '/km';
  return `${minutes}:${seconds.toString().padStart(2, '0')} ${unit}`;
}

export function formatTime(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generates user-friendly split names based on interval distance
 */
export function getSplitIntervalName(distanceMeters, index, isFinal = false, actualDist = null, isImperial = false) {
  const dist = actualDist || distanceMeters;
  if (isImperial) {
    const miles = dist / 1609.34;
    if (Math.abs(distanceMeters - 1609.34) < 10) {
      return isFinal && actualDist && actualDist < distanceMeters * 0.95
        ? `Mi ${index} (${miles.toFixed(2)}mi)`
        : `Mi ${index}`;
    }
    return `Split ${index} (${miles.toFixed(2)}mi)`;
  }

  // Metric formatting
  if (distanceMeters === 1000) {
    return isFinal && actualDist && actualDist < distanceMeters * 0.95
      ? `Km ${index} (${(dist / 1000).toFixed(2)}km)`
      : `Km ${index}`;
  }
  if (distanceMeters === 500) {
    return `500m #${index}`;
  }
  if (distanceMeters === 400) {
    return `400m #${index}`;
  }
  if (distanceMeters === 2000) {
    return `2Km #${index}`;
  }
  if (distanceMeters === 5000) {
    return `5Km #${index}`;
  }

  const km = (dist / 1000).toFixed(2);
  return `Lap ${index} (${km}km)`;
}

/**
 * Calculates custom distance splits from a list of trackpoints.
 * trackpoints: [{ lat, lon, ele, time, hr, cad, dist }]
 * splitDistanceMeters: interval distance (default 1000m, or 500m, 2000m, 5000m, etc.)
 */
export function calculateSplits(trackpoints, splitDistanceMeters = 1000, isImperial = false) {
  if (!trackpoints || trackpoints.length < 2) return [];

  // Ensure cumulative distances exist
  let runningDist = 0;
  const enrichedPoints = [];

  for (let i = 0; i < trackpoints.length; i++) {
    const pt = trackpoints[i];
    if (i > 0) {
      if (typeof pt.dist === 'number' && pt.dist > 0) {
        runningDist = pt.dist;
      } else {
        const prev = trackpoints[i - 1];
        if (prev.lat !== null && prev.lon !== null && pt.lat !== null && pt.lon !== null) {
          runningDist += haversineDistance(prev.lat, prev.lon, pt.lat, pt.lon);
        } else if (pt.speed && pt.time && prev.time) {
          const t1 = pt.time instanceof Date ? pt.time.getTime() : pt.time;
          const t0 = prev.time instanceof Date ? prev.time.getTime() : prev.time;
          const dt = (t1 - t0) / 1000;
          if (dt > 0) runningDist += pt.speed * dt;
        }
      }
    }
    const tMs = pt.time instanceof Date ? pt.time.getTime() : typeof pt.time === 'number' ? pt.time : i * 1000;
    enrichedPoints.push({
      ...pt,
      dist: runningDist,
      tMs,
    });
  }

  const totalDist = enrichedPoints[enrichedPoints.length - 1].dist;
  if (totalDist <= 0) return [];

  const splits = [];
  let currentTarget = splitDistanceMeters;
  let splitStartIdx = 0;
  let splitIndex = 1;

  while (splitStartIdx < enrichedPoints.length - 1) {
    // Find points belonging to this split
    const startPt = enrichedPoints[splitStartIdx];
    let endIdx = splitStartIdx + 1;

    while (endIdx < enrichedPoints.length && enrichedPoints[endIdx].dist < currentTarget) {
      endIdx++;
    }

    const isFinalSplit = endIdx >= enrichedPoints.length;
    const actualEndIdx = isFinalSplit ? enrichedPoints.length - 1 : endIdx;
    const endPt = enrichedPoints[actualEndIdx];

    if (actualEndIdx <= splitStartIdx) break;

    // Split segment stats
    const distMeters = isFinalSplit ? Math.max(1, endPt.dist - startPt.dist) : splitDistanceMeters;

    // If final split remainder is negligible (< 5m) and we already have splits, break
    if (isFinalSplit && distMeters < 5 && splits.length > 0) {
      break;
    }

    const timeDeltaSec = Math.max(1, (endPt.tMs - startPt.tMs) / 1000);

    // Pace in sec/km
    const paceSecPerKm = timeDeltaSec / (distMeters / 1000);

    // HR and Cadence averages in this split
    let hrSum = 0;
    let hrCount = 0;
    let maxHr = 0;
    let minHr = Infinity;
    let cadSum = 0;
    let cadCount = 0;
    let eleGain = 0;
    let eleLoss = 0;

    for (let k = splitStartIdx; k <= actualEndIdx; k++) {
      const p = enrichedPoints[k];
      if (p.hr && p.hr > 40) {
        hrSum += p.hr;
        hrCount++;
        if (p.hr > maxHr) maxHr = p.hr;
        if (p.hr < minHr) minHr = p.hr;
      }
      if (p.cad && p.cad > 30) {
        cadSum += p.cad;
        cadCount++;
      }
      if (k > splitStartIdx && typeof p.ele === 'number' && typeof enrichedPoints[k - 1].ele === 'number') {
        const dEle = p.ele - enrichedPoints[k - 1].ele;
        if (dEle > 0) eleGain += dEle;
        else eleLoss += Math.abs(dEle);
      }
    }

    const avgHr = hrCount > 0 ? Math.round(hrSum / hrCount) : null;
    const avgCadence = cadCount > 0 ? Math.round(cadSum / cadCount) : null;

    const splitName = getSplitIntervalName(splitDistanceMeters, splitIndex, isFinalSplit, distMeters, isImperial);
    const distFormatted = distMeters >= 1000
      ? (isImperial ? `${(distMeters / 1609.34).toFixed(2)} mi` : `${(distMeters / 1000).toFixed(2)} km`)
      : `${Math.round(distMeters)} m`;

    splits.push({
      index: splitIndex,
      type: 'manual_split',
      name: splitName,
      shortName: `${splitIndex}`,
      distance: distMeters,
      distFormatted,
      duration: timeDeltaSec,
      pace: paceSecPerKm,
      paceFormatted: formatPace(paceSecPerKm, isImperial),
      timeFormatted: formatTime(timeDeltaSec),
      avgHr,
      maxHr: maxHr || avgHr,
      minHr: minHr !== Infinity ? minHr : avgHr,
      avgCadence,
      elevationGain: Math.round(eleGain),
      elevationLoss: Math.round(eleLoss),
      isFastest: false,
      isSlowest: false,
      startPoint: startPt,
      endPoint: endPt,
    });

    if (isFinalSplit) break;
    splitStartIdx = actualEndIdx;
    currentTarget += splitDistanceMeters;
    splitIndex++;
  }

  // Identify fastest and slowest splits
  let minPace = Infinity;
  let maxPace = 0;
  let fastestIdx = -1;
  let slowestIdx = -1;

  splits.forEach((s, i) => {
    if (s.distance >= splitDistanceMeters * 0.4) {
      if (s.pace < minPace) {
        minPace = s.pace;
        fastestIdx = i;
      }
      if (s.pace > maxPace) {
        maxPace = s.pace;
        slowestIdx = i;
      }
    }
  });

  if (fastestIdx !== -1) splits[fastestIdx].isFastest = true;
  if (slowestIdx !== -1 && slowestIdx !== fastestIdx) splits[slowestIdx].isSlowest = true;

  return splits;
}

/**
 * Standardizes native device laps (from FIT or TCX).
 */
export function standardizeLaps(rawLaps, isImperial = false) {
  if (!rawLaps || !Array.isArray(rawLaps) || rawLaps.length === 0) return [];

  const laps = rawLaps.map((lap, i) => {
    const dist = lap.distance || lap.totalDistance || lap.total_distance || 0;
    const duration = lap.duration || lap.totalTimerTime || lap.total_timer_time || lap.totalElapsedTime || lap.total_elapsed_time || 1;
    const pace = dist > 0 ? duration / (dist / 1000) : (lap.avgSpeed ? 1000 / lap.avgSpeed : 0);
    const avgHr = lap.avgHr || lap.avgHeartRate || lap.avg_heart_rate || null;
    const maxHr = lap.maxHr || lap.maxHeartRate || lap.max_heart_rate || null;
    const minHr = lap.minHr || lap.minHeartRate || lap.min_heart_rate || (avgHr ? Math.max(40, Math.round(avgHr * 0.88)) : null);
    const avgCad = lap.avgCadence || lap.avg_cadence || null;
    const eleGain = lap.elevationGain || lap.totalAscent || lap.total_ascent || 0;
    const eleLoss = lap.elevationLoss || lap.totalDescent || lap.total_descent || 0;

    let distFormatted = '';
    if (dist >= 1000) {
      distFormatted = isImperial ? `${(dist / 1609.34).toFixed(2)} mi` : `${(dist / 1000).toFixed(2)} km`;
    } else {
      distFormatted = `${Math.round(dist)} m`;
    }

    return {
      index: i + 1,
      type: 'device_lap',
      name: `Lap ${i + 1}`,
      shortName: `L${i + 1}`,
      distance: dist,
      distFormatted,
      duration,
      pace,
      paceFormatted: formatPace(pace, isImperial),
      timeFormatted: formatTime(duration),
      avgHr: avgHr ? Math.round(avgHr) : null,
      maxHr: maxHr ? Math.round(maxHr) : null,
      minHr: minHr ? Math.round(minHr) : null,
      avgCadence: avgCad ? Math.round(avgCad) : null,
      elevationGain: Math.round(eleGain),
      elevationLoss: Math.round(eleLoss),
      isFastest: false,
      isSlowest: false,
    };
  });

  let minPace = Infinity;
  let maxPace = 0;
  let fastestIdx = -1;
  let slowestIdx = -1;

  laps.forEach((l, i) => {
    if (l.distance >= 100 && l.pace > 0) {
      if (l.pace < minPace) {
        minPace = l.pace;
        fastestIdx = i;
      }
      if (l.pace > maxPace) {
        maxPace = l.pace;
        slowestIdx = i;
      }
    }
  });

  if (fastestIdx !== -1) laps[fastestIdx].isFastest = true;
  if (slowestIdx !== -1 && slowestIdx !== fastestIdx) laps[slowestIdx].isSlowest = true;

  return laps;
}
