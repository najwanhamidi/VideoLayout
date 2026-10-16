/**
 * Demo Data Generator
 * Provides 4 realistic sample running activities for immediate testing:
 * 1. Morning 5K (Negative Split)
 * 2. Scenic 10K Trail (High Elevation Profile)
 * 3. Sunday Half Marathon (21.1 km)
 * 4. Track Workout (8 x 400m Laps)
 */
import { normalizeActivity } from './parsers/dataNormalizer.js';

// Helper to generate a realistic smooth GPS track along a closed loop
function generateLoopTrack(centerLat, centerLon, radiusKm, numPoints, durationSec, baseEle, eleAmp, baseHr, hrAmp, baseCad) {
  const rawPoints = [];
  const startTime = new Date(Date.now() - durationSec * 1000 - 3600000);
  let cumulativeDist = 0;
  let prevLat = null;
  let prevLon = null;

  // Pass 1: Generate route geometry, elevation, and segment distances
  for (let i = 0; i < numPoints; i++) {
    const fraction = i / (numPoints - 1);
    const angle = fraction * Math.PI * 2;
    const r = radiusKm * (1 + 0.25 * Math.sin(3 * angle) + 0.15 * Math.cos(5 * angle));

    const dLat = (r * Math.sin(angle)) / 111.32;
    const dLon = (r * Math.cos(angle)) / (111.32 * Math.cos((centerLat * Math.PI) / 180));

    const lat = centerLat + dLat;
    const lon = centerLon + dLon;

    const ele = baseEle + eleAmp * Math.sin(2 * angle + 0.5) + (eleAmp * 0.3) * Math.cos(6 * angle);
    const hr = Math.round(baseHr + hrAmp * fraction + (eleAmp > 20 ? (ele - baseEle) * 0.2 : 0) + (Math.random() * 4 - 2));
    const cad = Math.round(baseCad + Math.sin(angle) * 3 + (Math.random() * 2 - 1));

    let dDist = 0;
    if (prevLat !== null && prevLon !== null) {
      const R = 6371000;
      const dLatRad = ((lat - prevLat) * Math.PI) / 180;
      const dLonRad = ((lon - prevLon) * Math.PI) / 180;
      const a =
        Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
        Math.cos((prevLat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLonRad / 2) *
          Math.sin(dLonRad / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      dDist = R * c;
      cumulativeDist += dDist;
    }

    rawPoints.push({
      lat,
      lon,
      ele: Math.round(ele * 10) / 10,
      hr,
      cad,
      dDist,
      dist: cumulativeDist,
      fraction,
    });

    prevLat = lat;
    prevLon = lon;
  }

  // Pass 2: Apply realistic pace variation (negative split + uphill effort) and normalize total duration
  let rawTotalTime = 0;
  for (let i = 1; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    const prev = rawPoints[i - 1];
    const dEle = pt.ele - prev.ele;
    // Pace variation: runners start controlled (fraction 0 -> -12% speed), build up, kick at finish (+18% speed)
    // Hill grade: uphill slows down slightly
    const paceMod = 1.0 + 0.22 * (pt.fraction - 0.5) - (dEle > 0.5 ? Math.min(0.2, dEle * 0.05) : 0);
    const unnormalizedDt = pt.dDist / Math.max(0.5, paceMod);
    pt.unnormalizedDt = unnormalizedDt;
    rawTotalTime += unnormalizedDt;
  }

  const timeScale = rawTotalTime > 0 ? durationSec / rawTotalTime : 1;
  const points = [];
  let curTimeSec = 0;

  for (let i = 0; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    if (i > 0) {
      const dt = pt.unnormalizedDt * timeScale;
      curTimeSec += dt;
      const speed = dt > 0 ? pt.dDist / dt : 3.5;
      pt.speed = Math.round(speed * 100) / 100;
    } else {
      pt.speed = 3.5;
    }

    const time = new Date(startTime.getTime() + curTimeSec * 1000);
    points.push({
      lat: pt.lat,
      lon: pt.lon,
      ele: pt.ele,
      time,
      hr: pt.hr,
      cad: pt.cad,
      speed: pt.speed,
      dist: pt.dist,
    });
  }

  return { points, totalDist: cumulativeDist };
}

export function getDemoActivities(isImperial = false) {
  // 1. Morning 5K
  const run5kTrack = generateLoopTrack(37.7749, -122.4194, 0.78, 180, 1365, 35, 18, 152, 22, 178);
  const raw5k = {
    title: 'Morning 5K Speedrun',
    startTime: new Date(Date.now() - 1365000),
    distance: 5020,
    duration: 1365,
    elapsedTime: 1390,
    avgPace: 1365 / 5.02, // ~271.9 s/km (4:31/km)
    avgHr: 164,
    maxHr: 179,
    avgCadence: 178,
    elevationGain: 48,
    elevationLoss: 46,
    calories: 340,
    trackpoints: run5kTrack.points,
    rawLaps: [],
  };

  // 2. Scenic 10K Trail
  const run10kTrack = generateLoopTrack(34.0522, -118.2437, 1.55, 320, 2955, 120, 75, 156, 24, 174);
  const raw10k = {
    title: 'Scenic 10K Trail & Ridge',
    startTime: new Date(Date.now() - 2955000 - 86400000),
    distance: 10050,
    duration: 2955,
    elapsedTime: 3010,
    avgPace: 2955 / 10.05, // ~294 s/km (4:54/km)
    avgHr: 168,
    maxHr: 184,
    avgCadence: 174,
    elevationGain: 195,
    elevationLoss: 192,
    calories: 720,
    trackpoints: run10kTrack.points,
    rawLaps: [],
  };

  // 3. Sunday Half Marathon
  const run21kTrack = generateLoopTrack(40.7829, -73.9654, 3.2, 550, 6270, 25, 35, 160, 16, 176);
  const raw21k = {
    title: 'Sunday Half Marathon',
    startTime: new Date(Date.now() - 6270000 - 172800000),
    distance: 21150,
    duration: 6270, // 1h 44m 30s
    elapsedTime: 6350,
    avgPace: 6270 / 21.15, // ~296.4 s/km (4:56/km)
    avgHr: 166,
    maxHr: 181,
    avgCadence: 176,
    elevationGain: 135,
    elevationLoss: 132,
    calories: 1480,
    trackpoints: run21kTrack.points,
    rawLaps: [],
  };

  // 4. Track Workout: 8x400m Repeats (with real workout laps!)
  const rawIntervalLaps = [
    { lapIndex: 1, totalDistance: 1600, totalTimerTime: 512, avgHeartRate: 142, maxHeartRate: 154, avgCadence: 168, totalAscent: 2 }, // Warmup
    { lapIndex: 2, totalDistance: 400, totalTimerTime: 78, avgHeartRate: 172, maxHeartRate: 182, avgCadence: 192, totalAscent: 0 },  // Repeat 1 (3:15/km)
    { lapIndex: 3, totalDistance: 200, totalTimerTime: 75, avgHeartRate: 155, maxHeartRate: 168, avgCadence: 150, totalAscent: 0 },  // Rest 1
    { lapIndex: 4, totalDistance: 400, totalTimerTime: 77, avgHeartRate: 174, maxHeartRate: 184, avgCadence: 194, totalAscent: 0 },  // Repeat 2 (3:12/km)
    { lapIndex: 5, totalDistance: 200, totalTimerTime: 76, avgHeartRate: 157, maxHeartRate: 170, avgCadence: 152, totalAscent: 0 },  // Rest 2
    { lapIndex: 6, totalDistance: 400, totalTimerTime: 76, avgHeartRate: 176, maxHeartRate: 186, avgCadence: 194, totalAscent: 0 },  // Repeat 3 (3:10/km)
    { lapIndex: 7, totalDistance: 200, totalTimerTime: 78, avgHeartRate: 160, maxHeartRate: 172, avgCadence: 150, totalAscent: 0 },  // Rest 3
    { lapIndex: 8, totalDistance: 400, totalTimerTime: 75, avgHeartRate: 178, maxHeartRate: 188, avgCadence: 196, totalAscent: 0 },  // Repeat 4 (3:07/km - Fastest!)
    { lapIndex: 9, totalDistance: 200, totalTimerTime: 80, avgHeartRate: 162, maxHeartRate: 174, avgCadence: 148, totalAscent: 0 },  // Rest 4
    { lapIndex: 10, totalDistance: 400, totalTimerTime: 76, avgHeartRate: 177, maxHeartRate: 187, avgCadence: 194, totalAscent: 0 }, // Repeat 5
    { lapIndex: 11, totalDistance: 200, totalTimerTime: 80, avgHeartRate: 163, maxHeartRate: 175, avgCadence: 150, totalAscent: 0 }, // Rest 5
    { lapIndex: 12, totalDistance: 400, totalTimerTime: 76, avgHeartRate: 178, maxHeartRate: 188, avgCadence: 194, totalAscent: 0 }, // Repeat 6
    { lapIndex: 13, totalDistance: 200, totalTimerTime: 82, avgHeartRate: 164, maxHeartRate: 176, avgCadence: 148, totalAscent: 0 }, // Rest 6
    { lapIndex: 14, totalDistance: 400, totalTimerTime: 75, avgHeartRate: 180, maxHeartRate: 190, avgCadence: 196, totalAscent: 0 }, // Repeat 7
    { lapIndex: 15, totalDistance: 200, totalTimerTime: 84, avgHeartRate: 166, maxHeartRate: 178, avgCadence: 148, totalAscent: 0 }, // Rest 7
    { lapIndex: 16, totalDistance: 400, totalTimerTime: 73, avgHeartRate: 182, maxHeartRate: 192, avgCadence: 198, totalAscent: 0 }, // Repeat 8 (3:02/km!)
    { lapIndex: 17, totalDistance: 1200, totalTimerTime: 420, avgHeartRate: 145, maxHeartRate: 160, avgCadence: 164, totalAscent: 1 }, // Cooldown
  ];

  const trackTrack = generateLoopTrack(51.5074, -0.1278, 0.45, 260, 2223, 15, 3, 168, 18, 182);
  const rawIntervals = {
    title: 'Track Intervals (8 x 400m)',
    startTime: new Date(Date.now() - 2223000 - 259200000),
    distance: 7400,
    duration: 2223,
    elapsedTime: 2310,
    avgPace: 2223 / 7.4,
    avgHr: 169,
    maxHr: 192,
    avgCadence: 182,
    elevationGain: 12,
    elevationLoss: 12,
    calories: 590,
    trackpoints: trackTrack.points,
    rawLaps: rawIntervalLaps,
  };

  return {
    '5k': normalizeActivity(raw5k, isImperial),
    '10k': normalizeActivity(raw10k, isImperial),
    '21k': normalizeActivity(raw21k, isImperial),
    'intervals': normalizeActivity(rawIntervals, isImperial),
  };
}
