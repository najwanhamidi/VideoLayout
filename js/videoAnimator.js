/**
 * RunOverlay Video Animation & Export Engine
 * Generates smooth frame-by-frame animated videos according to run progress.
 * Animates route progression, runner pulse beacon, live-ticking stats,
 * scanning elevation profiles, and illuminated kilometer splits.
 */

import { formatTime, formatPace } from './splitCalculator.js';

/**
 * Creates a progressive snapshot of the activity at a given progress fraction (0.0 to 1.0).
 * @param {Object} fullActivity - Complete normalized activity
 * @param {number} progress - Fraction from 0.0 to 1.0
 * @param {boolean} isImperial - Whether imperial units are active
 * @returns {Object} Progressive activity state
 */
export function getProgressiveActivity(fullActivity, progress, isImperial = false) {
  if (!fullActivity) return fullActivity;
  const p = Math.max(0.001, Math.min(1.0, progress));

  const pts = fullActivity.trackpoints || [];
  const totalPts = pts.length;
  const totalDist = fullActivity.distance || 1;
  const totalDuration = fullActivity.duration || 1;

  // 1. Current distance
  const currentDistMeters = totalDist * p;
  const distKm = currentDistMeters / 1000;
  const distMi = currentDistMeters / 1609.34;
  const distanceMain = isImperial ? distMi.toFixed(2) : distKm.toFixed(2);
  const distanceUnit = isImperial ? 'mi' : 'km';

  // 2. Trackpoint slicing & runner point interpolation
  let slicedPoints = [];
  let runnerPoint = null;
  let elapsedSecFromPoints = 0;
  let instantSpeed = null;

  if (totalPts > 0) {
    const floatIdx = p * (totalPts - 1);
    const idx = Math.floor(floatIdx);
    const alpha = floatIdx - idx;
    const pt1 = pts[idx];
    const pt2 = pts[Math.min(totalPts - 1, idx + 1)];

    const curLat = pt1.lat + (pt2.lat - pt1.lat) * alpha;
    const curLon = pt1.lon + (pt2.lon - pt1.lon) * alpha;
    const curEle = pt1.ele + (pt2.ele - pt1.ele) * alpha;
    const curHr = Math.round(pt1.hr + ((pt2.hr || pt1.hr) - pt1.hr) * alpha);
    const curCad = Math.round((pt1.cad || 170) + (((pt2.cad || pt1.cad) || 170) - (pt1.cad || 170)) * alpha);

    if (pt1.speed && pt2.speed) {
      instantSpeed = pt1.speed + (pt2.speed - pt1.speed) * alpha;
    }

    // Time elapsed from GPS trackpoint timestamps
    const getMs = (pt) => (pt.time instanceof Date ? pt.time.getTime() : typeof pt.time === 'number' ? (pt.time > 1e11 ? pt.time : pt.time * 1000) : null);
    const t0 = getMs(pts[0]);
    const t1 = getMs(pt1);
    const t2 = getMs(pt2);
    if (t0 !== null && t1 !== null && t2 !== null) {
      const curTimeMs = t1 + (t2 - t1) * alpha;
      elapsedSecFromPoints = Math.max(0, (curTimeMs - t0) / 1000);
    }

    runnerPoint = {
      lat: curLat,
      lon: curLon,
      ele: Math.round(curEle * 10) / 10,
      hr: curHr || fullActivity.avgHr || 150,
      cad: curCad,
      speed: instantSpeed,
      dist: currentDistMeters
    };

    slicedPoints = pts.slice(0, idx + 1).concat([runnerPoint]);
  }

  // 3. Progressive Splits Segmentation (Live segment tracking)
  const fullSplits = fullActivity.splits || [];
  let splitElapsedSec = 0;
  let activeSplitSegment = null;

  let splitCumDist = 0;
  const progressiveSplits = fullSplits.map((s) => {
    const sStart = typeof s.startDist === 'number' ? s.startDist : splitCumDist;
    const sDist = s.distance || 1000;
    const sEnd = sStart + sDist;
    splitCumDist = sEnd;

    const isCompleted = p >= 0.999 || currentDistMeters >= sEnd;
    const isCurrent = !isCompleted && currentDistMeters >= sStart && currentDistMeters < sEnd;
    const isPending = !isCompleted && !isCurrent;

    let splitProgress = 0.0;
    if (isCompleted) {
      splitProgress = 1.0;
      splitElapsedSec += (s.duration || 0);
    } else if (isCurrent) {
      splitProgress = Math.max(0.01, Math.min(0.999, (currentDistMeters - sStart) / sDist));
      splitElapsedSec += (s.duration || 0) * splitProgress;
    }

    const liveSegmentDuration = isCompleted
      ? s.duration
      : isCurrent
      ? Math.max(1, Math.round(s.duration * splitProgress))
      : 0;

    const displayTimeFormatted = isPending ? '--:--' : formatTime(liveSegmentDuration);
    const displayPaceFormatted = isPending ? '--:--' : isCurrent ? formatPace(s.pace, isImperial) : s.paceFormatted;

    const splitObj = {
      ...s,
      startDist: sStart,
      endDist: sEnd,
      isCompleted,
      isCurrent,
      isPending,
      splitProgress,
      displayTime: liveSegmentDuration,
      displayTimeFormatted,
      displayPace: s.pace,
      displayPaceFormatted
    };

    if (isCurrent) activeSplitSegment = splitObj;
    return splitObj;
  });

  // 4. Progressive Device Laps Segmentation
  const fullLaps = fullActivity.laps || [];
  let lapCumDist = 0;
  let activeLapSegment = null;
  const progressiveLaps = fullLaps.map((lap) => {
    const lStart = typeof lap.startDist === 'number' ? lap.startDist : lapCumDist;
    const lDist = lap.distance || 1000;
    const lEnd = lStart + lDist;
    lapCumDist = lEnd;

    const isCompleted = p >= 0.999 || currentDistMeters >= lEnd;
    const isCurrent = !isCompleted && currentDistMeters >= lStart && currentDistMeters < lEnd;
    const isPending = !isCompleted && !isCurrent;

    const splitProgress = isCompleted ? 1.0 : isCurrent ? Math.max(0.01, Math.min(0.999, (currentDistMeters - lStart) / lDist)) : 0.0;
    const liveLapDuration = isCompleted ? lap.duration : isCurrent ? Math.max(1, Math.round(lap.duration * splitProgress)) : 0;

    const displayTimeFormatted = isPending ? '--:--' : formatTime(liveLapDuration);
    const displayPaceFormatted = isPending ? '--:--' : isCurrent ? formatPace(lap.pace, isImperial) : lap.paceFormatted;

    const lapObj = {
      ...lap,
      startDist: lStart,
      endDist: lEnd,
      isCompleted,
      isCurrent,
      isPending,
      splitProgress,
      displayTime: liveLapDuration,
      displayTimeFormatted,
      displayPace: lap.pace,
      displayPaceFormatted
    };

    if (isCurrent) activeLapSegment = lapObj;
    return lapObj;
  });

  // 5. Accurate Elapsed Time (derived from actual trackpoints or piecewise split segments)
  let currentDurationSec = 0;
  if (p >= 0.999) {
    currentDurationSec = totalDuration;
  } else if (splitElapsedSec > 0) {
    currentDurationSec = Math.round(splitElapsedSec);
  } else if (elapsedSecFromPoints > 0) {
    currentDurationSec = Math.round(elapsedSecFromPoints);
  } else {
    currentDurationSec = Math.round(totalDuration * p);
  }
  const durationFormatted = formatTime(currentDurationSec);

  // 6. Live Instantaneous Pace
  let livePace = null;
  const paceCurve = fullActivity.paceCurve || [];
  if (paceCurve.length > 1) {
    let pIdx = 0;
    while (pIdx < paceCurve.length - 1 && paceCurve[pIdx + 1].dist < currentDistMeters) {
      pIdx++;
    }
    const pc1 = paceCurve[pIdx];
    const pc2 = paceCurve[Math.min(paceCurve.length - 1, pIdx + 1)];
    if (pc2.dist > pc1.dist) {
      const frac = Math.max(0, Math.min(1, (currentDistMeters - pc1.dist) / (pc2.dist - pc1.dist)));
      const interPace = pc1.pace + (pc2.pace - pc1.pace) * frac;
      if (interPace >= 120 && interPace <= 900) livePace = interPace;
    } else if (pc1.pace >= 120 && pc1.pace <= 900) {
      livePace = pc1.pace;
    }
  }

  if (!livePace && instantSpeed && instantSpeed > 0.5) {
    const paceFromSpeed = 1000 / instantSpeed;
    if (paceFromSpeed >= 120 && paceFromSpeed <= 900) livePace = paceFromSpeed;
  }

  if (!livePace && activeSplitSegment && activeSplitSegment.pace > 0) {
    livePace = activeSplitSegment.pace;
  } else if (!livePace && activeLapSegment && activeLapSegment.pace > 0) {
    livePace = activeLapSegment.pace;
  }

  if (!livePace) livePace = fullActivity.avgPace;
  const livePaceFormatted = formatPace(livePace, isImperial);

  // 7. Dynamic Cumulative Average Pace
  // Tracks the runner's true cumulative mean pace up to current progress
  let curAvgPace = fullActivity.avgPace;
  if (p >= 0.999) {
    curAvgPace = fullActivity.avgPace;
  } else if (currentDistMeters > 30 && currentDurationSec > 0) {
    curAvgPace = currentDurationSec / (currentDistMeters / 1000);
  } else {
    curAvgPace = livePace;
  }
  const avgPaceFormatted = formatPace(curAvgPace, isImperial);

  // Update active split/lap live pace display
  if (activeSplitSegment) {
    activeSplitSegment.displayPace = livePace;
    activeSplitSegment.displayPaceFormatted = livePaceFormatted;
  }
  if (activeLapSegment) {
    activeLapSegment.displayPace = livePace;
    activeLapSegment.displayPaceFormatted = livePaceFormatted;
  }

  // 8. Progressive Heart Rate Calculation (True cumulative mean + Instant HR)
  let hrSum = 0;
  let hrCount = 0;
  for (let i = 0; i < slicedPoints.length; i++) {
    const h = slicedPoints[i].hr;
    if (h && h > 40) {
      hrSum += h;
      hrCount++;
    }
  }
  let curAvgHr = hrCount > 0 ? Math.round(hrSum / hrCount) : (runnerPoint ? runnerPoint.hr : fullActivity.avgHr);
  if (p >= 0.999 && fullActivity.avgHr) {
    curAvgHr = fullActivity.avgHr;
  }
  const liveHr = runnerPoint && runnerPoint.hr ? runnerPoint.hr : curAvgHr;

  // 9. Progressive Elevation Gain up to current point
  let elevGain = 0;
  if (slicedPoints.length > 1) {
    for (let i = 1; i < slicedPoints.length; i++) {
      const diff = slicedPoints[i].ele - slicedPoints[i - 1].ele;
      if (diff > 0.3) elevGain += diff;
    }
  }

  // 10. Animation vs Static End Preview Stats Selection:
  // When animated for videos, the pace display animates and shows real-time pace instead of cumulative average pace.
  // The heart rate animates and displays real-time HR instead of cumulative average HR.
  // For the static preview at the end (p >= 0.999), show the overall average pace and average HR instead.
  const isEndHold = p >= 0.999;
  const displayPace = isEndHold ? fullActivity.avgPace : livePace;
  const displayPaceFormatted = isEndHold ? fullActivity.avgPaceFormatted : livePaceFormatted;
  const displayHr = isEndHold ? fullActivity.avgHr : liveHr;
  const displayHrFormatted = isEndHold
    ? (fullActivity.avgHrFormatted || `${fullActivity.avgHr} bpm`)
    : `${liveHr} bpm`;

  return {
    ...fullActivity,
    distance: currentDistMeters,
    distanceMain,
    distanceUnit,
    duration: currentDurationSec,
    durationFormatted,
    avgPace: displayPace,
    avgPaceFormatted: displayPaceFormatted,
    livePace,
    livePaceFormatted,
    instantPace: livePace,
    instantPaceFormatted: livePaceFormatted,
    cumulativeAvgPace: curAvgPace,
    cumulativeAvgPaceFormatted: avgPaceFormatted,
    avgHr: displayHr,
    liveHr,
    currentHr: liveHr,
    cumulativeAvgHr: curAvgHr,
    avgHrFormatted: displayHrFormatted,
    liveHrFormatted: `${liveHr} bpm`,
    elevationGain: isEndHold ? fullActivity.elevationGain : Math.round(elevGain),
    trackpoints: slicedPoints,
    fullTrackpoints: pts,
    fullBounds: fullActivity.bounds,
    fullDistance: totalDist,
    fullDuration: totalDuration,
    fullMinElevation: fullActivity.minElevation,
    fullMaxElevation: fullActivity.maxElevation,
    fullMinHr: fullActivity.minHr,
    fullMaxHr: fullActivity.maxHr,
    runnerPoint,
    splits: progressiveSplits,
    laps: progressiveLaps,
    currentSplit: activeSplitSegment || progressiveSplits[progressiveSplits.length - 1],
    currentLap: activeLapSegment || progressiveLaps[progressiveLaps.length - 1],
    progress: p,
    isAnimated: true
  };
}

/**
 * Detects best supported video container & codec in the current browser.
 * @returns {string} Supported MIME type (e.g. 'video/mp4;codecs=avc1' or 'video/webm;codecs=vp9')
 */
export function getSupportedVideoMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return 'video/webm';
  }
  const candidateTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for (const t of candidateTypes) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return 'video/webm';
}

/**
 * Video Animator Controller
 * Manages timeline playback, live scrubbing, and video export rendering.
 */
export class VideoAnimator {
  constructor(renderer, state, onRenderCallback) {
    this.renderer = renderer;
    this.state = state;
    this.onRenderCallback = onRenderCallback;

    this.progress = 1.0;
    this.isPlaying = false;
    this.duration = 10; // seconds for run progression
    this.holdDuration = 5; // seconds to hold final static summary preview
    this.fps = 30;
    this.isLooping = true;
    this.animFrameId = null;
    this.lastTimestamp = null;
    this.currentHoldElapsed = 0;

    this.onProgressUpdate = null;
    this.onPlayStateChange = null;
  }

  /**
   * Start playback
   */
  play() {
    if (this.isPlaying) return;
    if (this.progress >= 0.999) {
      this.progress = 0.0;
      this.currentHoldElapsed = 0;
    }
    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    if (this.onPlayStateChange) this.onPlayStateChange(true);
    this._loop();
  }

  /**
   * Pause playback
   */
  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  /**
   * Toggle between Play and Pause
   */
  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  /**
   * Reset timeline to 0%
   */
  reset() {
    this.pause();
    this.currentHoldElapsed = 0;
    this.seek(0.0);
  }

  /**
   * Seek to specific progress (0.0 to 1.0)
   */
  seek(newProgress) {
    this.progress = Math.max(0.0, Math.min(1.0, newProgress));
    this.currentHoldElapsed = 0;
    this.renderCurrentProgress();
    if (this.onProgressUpdate) {
      this.onProgressUpdate(this.progress);
    }
  }

  /**
   * Set animation run progression duration in seconds
   */
  setDuration(sec) {
    this.duration = Math.max(2, Math.min(120, sec));
  }

  /**
   * Set static preview hold duration in seconds
   */
  setHoldDuration(sec) {
    this.holdDuration = Math.max(0, Math.min(30, sec));
  }

  /**
   * Toggle or set loop mode
   */
  setLoop(loopBool) {
    this.isLooping = Boolean(loopBool);
  }

  /**
   * Internal requestAnimationFrame loop
   */
  _loop() {
    if (!this.isPlaying) return;

    this.animFrameId = requestAnimationFrame((now) => {
      if (!this.lastTimestamp) this.lastTimestamp = now;
      const deltaSec = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;

      if (this.progress < 1.0) {
        this.progress += deltaSec / this.duration;
        if (this.progress >= 1.0) {
          this.progress = 1.0;
          this.currentHoldElapsed = 0;
        }
        this.renderCurrentProgress();
        if (this.onProgressUpdate) this.onProgressUpdate(this.progress);
      } else {
        // Holding on static preview screen at progress = 1.0
        this.currentHoldElapsed += deltaSec;
        if (this.currentHoldElapsed >= this.holdDuration) {
          if (this.isLooping) {
            this.progress = 0.0;
            this.currentHoldElapsed = 0;
            this.renderCurrentProgress();
            if (this.onProgressUpdate) this.onProgressUpdate(0.0);
          } else {
            this.pause();
            return;
          }
        }
      }

      if (this.isPlaying) {
        this._loop();
      }
    });
  }

  /**
   * Renders the progressive activity to canvas
   */
  renderCurrentProgress() {
    if (!this.state.currentActivity) return;
    const progActivity = getProgressiveActivity(this.state.currentActivity, this.progress, this.state.isImperial);
    if (this.onRenderCallback) {
      this.onRenderCallback(progActivity);
    } else {
      this.renderer.render(progActivity, this.state.config, 1);
    }
  }

  /**
   * Frame-by-frame deterministic video export.
   * Renders each frame at precise progress timestamps, capturing directly into MediaRecorder.
   * Keeps final shot static preview holding for customizable holdDuration before ending video.
   *
   * @param {Object} options - { duration: 10, holdDuration: 5, fps: 30, scale: 1, mimeType: 'video/mp4' }
   * @param {Function} onProgress - Callback (currentFrame, totalFrames, percent)
   * @returns {Promise<Object>} - Resolves with { blob, url, filename, duration, runDuration, holdDuration, size }
   */
  async exportVideo(options = {}, onProgress = null) {
    const runDuration = options.duration || this.duration || 10;
    const holdDuration = options.holdDuration !== undefined
      ? Number(options.holdDuration)
      : (this.holdDuration !== undefined ? Number(this.holdDuration) : 5);
    const fps = options.fps || this.fps || 30;
    const scale = options.scale || 1;
    const runFrames = Math.max(10, Math.round(runDuration * fps));
    const holdFrames = Math.max(0, Math.round(holdDuration * fps));
    const totalFrames = runFrames + holdFrames;
    const totalDuration = runDuration + holdDuration;
    const mimeType = options.mimeType || getSupportedVideoMimeType();

    // Use offscreen or dedicated export canvas
    let exportCanvas = document.getElementById('exportCanvas');
    if (!exportCanvas) {
      exportCanvas = document.createElement('canvas');
      exportCanvas.id = 'exportCanvas';
      exportCanvas.style.position = 'fixed';
      exportCanvas.style.left = '-9999px';
      exportCanvas.style.top = '-9999px';
      exportCanvas.style.pointerEvents = 'none';
      exportCanvas.style.opacity = '0';
      document.body.appendChild(exportCanvas);
    }

    const ratioSpec = this.renderer.getAspectRatioDimensions ? this.renderer.getAspectRatioDimensions(this.state.config.aspectRatio, this.state.config) : { width: 1080, height: 1920 };
    exportCanvas.width = ratioSpec.width * scale;
    exportCanvas.height = ratioSpec.height * scale;

    const stream = exportCanvas.captureStream(fps);
    const videoBitsPerSecond = scale >= 2 ? 16000000 : 8000000;
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    return new Promise(async (resolve, reject) => {
      recorder.onerror = (err) => reject(err);

      recorder.onstop = () => {
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const rawTitle = (this.state.config.customTitle || this.state.currentActivity.title || 'run_overlay');
        const cleanTitle = rawTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const filename = `${cleanTitle}_animation.${ext}`;
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        resolve({
          blob,
          url,
          filename,
          duration: totalDuration,
          runDuration,
          holdDuration,
          mimeType,
          size: blob.size
        });
      };

      // Start recording
      recorder.start();

      // Render frame by frame
      const frameInterval = 1000 / fps;
      const origCanvas = this.renderer.canvas;
      const origCtx = this.renderer.ctx;

      // Swap renderer canvas to exportCanvas during render
      this.renderer.canvas = exportCanvas;
      this.renderer.ctx = exportCanvas.getContext('2d');

      try {
        for (let i = 0; i < totalFrames; i++) {
          const tFrameStart = performance.now();
          // First runFrames progress from 0.0 to 1.0; remaining holdFrames hold at 1.0
          const p = i < runFrames
            ? (runFrames > 1 ? i / (runFrames - 1) : 1.0)
            : 1.0;
          const progActivity = getProgressiveActivity(this.state.currentActivity, p, this.state.isImperial);
          this.renderer.render(progActivity, this.state.config, scale);

          if (onProgress) {
            const pct = Math.round(((i + 1) / totalFrames) * 100);
            onProgress(i + 1, totalFrames, pct);
          }

          // Allow stream to encode frame with steady pacing
          const elapsed = performance.now() - tFrameStart;
          const waitTime = Math.max(8, frameInterval - elapsed);
          await new Promise((r) => setTimeout(r, waitTime));
        }

        // Give recorder a brief buffer before closing stream
        setTimeout(() => {
          this.renderer.canvas = origCanvas;
          this.renderer.ctx = origCtx;
          // Re-render preview canvas at current state
          this.renderer.render(this.state.currentActivity, this.state.config, 1);
          recorder.stop();
        }, 150);

      } catch (err) {
        this.renderer.canvas = origCanvas;
        this.renderer.ctx = origCtx;
        recorder.stop();
        reject(err);
      }
    });
  }
}
