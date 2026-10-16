/**
 * App Controller (v2.0 Pro Studio)
 * Orchestrates UI interactions, canvas drag & drop, interactive widget resizing,
 * custom text stickers, multi-language label editing, and exports.
 */
import { OverlayRenderer, ASPECT_RATIOS } from './renderer.js';
import { getDemoActivities } from './demoData.js';
import { parseActivityFile, normalizeActivity, recalculateActivitySplits } from './parsers/dataNormalizer.js';
import { VideoAnimator, getProgressiveActivity } from './videoAnimator.js';
import { formatTime } from './splitCalculator.js';

// Application State
const state = {
  isImperial: false,
  currentActivity: null,
  demoActivities: null,
  selectedWidget: null, // Currently selected widget key for drag/resize gizmo
  isInteractiveLayout: true, // Interactive drag/resize mode on canvas
  config: {
    aspectRatio: '9:16',
    template: 'story-pro',
    bgType: 'solid', // solid, photo, gradient, transparent
    solidBgColor: '#0a0a0d',
    gradientPreset: 'sunset',
    photoFit: 'fit', // fit (no-crop), cover, stretch
    photoBackdrop: 'blur', // blur, solid, black, transparent
    photoZoom: 1,
    photoPanX: 0,
    photoPanY: 0,
    photoBlur: 0,
    photoBrightness: 100,
    photoContrast: 100,
    photoProtectionGradient: true,
    theme: 'volt',
    customAccentColor: null,
    cardStyle: 'glass',
    cardRadius: 16,
    fontFamily: 'athletic',
    showWidgetHeader: true,
    showWidgetMap: true,
    showWidgetHero: true,
    showWidgetMetrics: true,
    showWidgetSplits: true,
    showWidgetElevation: false,
    showWidgetHrZones: false,
    showWidgetBrand: true,
    showWidgetPaceGraph: false,
    showWidgetHrGraph: false,
    showWidgetAvgHrBadge: false,
    headerTemplate: 'modern',
    headerDesign: 'modern',
    mapDesign: 'glow',
    heroDesign: 'mega',
    metricsDesign: 'grid',
    splitsDesign: 'vertical-bars',
    splitHighlightDesign: 'spotlight',
    elevationDesign: 'area',
    paceGraphDesign: 'area',
    hrGraphDesign: 'filled-area',
    hrBadgeDesign: 'pill',
    splitDistanceMeters: 1000,
    heroMetric: 'distance', // distance, time, pace
    mapColorMode: 'accent', // accent, pace, hr
    mapGlow: true,
    splitDataSource: 'km', // km or laps
    splitWidgetMode: 'bars', // bars or highlight
    highlightSplitTarget: 'fastest', // fastest, slowest, last, index-X
    brandStyle: 'runcut',
    customTitle: '',
    customSubtitle: '',
    runnerName: '@runner',
    locationName: '',
    headerShowLocation: true,
    weatherText: '',
    customWatermark: '',
    metricShowHr: true,
    metricShowElevation: true,
    metricShowCadence: true,
    metricShowCalories: true,
    metricShowBestPace: true,
    // Custom Metric Labels (Multi-Language Overrides)
    labelDistance: '',
    labelTime: '',
    labelPace: '',
    labelBestPace: '',
    labelHr: '',
    labelElevation: '',
    labelCadence: '',
    labelCalories: '',
    // Split Customizations (New User Requirement)
    splitColumns: {
      split: true,
      time: true,
      pace: true,
      delta: true,
      avgHr: true,
      maxHr: false,
      minHr: false,
      cadence: false,
      elevation: true,
    },
    splitHighlightFastest: true,
    splitCustomTitle: '',
    splitCustomLabels: {},
    // Universal Widget Text Overrides
    widgetTextOverrides: {
      hero: { label: '', value: '', unit: '' },
      header: { title: '', subtitle: '', runner: '', location: '', weather: '' },
      splits: { title: '', headerSplit: '', headerTime: '', headerPace: '', headerDelta: '', headerHr: '', headerMaxHr: '', headerMinHr: '', headerCad: '', headerElev: '' },
      metrics: { distance: '', time: '', pace: '', hr: '', elevation: '', cadence: '', calories: '', bestPace: '' },
      paceGraph: { title: '' },
      hrGraph: { title: '' },
      elevation: { title: '' },
      hrBadge: { label: '', unit: '' },
      brand: { text: '' },
    },
    // Custom Text Stickers
    customTexts: [],
    // Custom Widget Positions & Sizes
    widgetPositions: {},
    // Individual Element Styles Overrides (font, sizeScale, color, accentColor, textAlign, cardStyle, opacity)
    elementStyles: {},
    // Background Border Customization per widget (resize only border, offsets, radius, stroke, colors)
    widgetBgStyles: {},
    // Sub-Element Offsets & Z-depth per widget (move individual text, icons, graphs X, Y, Z)
    widgetElementOffsets: {},
  },
  export: {
    scale: 2, // 2X Ultra crisp default
    format: 'png',
  },
};

// DOM Elements
const canvas = document.getElementById('overlayCanvas');
const canvasWrapper = document.getElementById('canvasWrapper');
const renderer = new OverlayRenderer(canvas);

// Gizmo Elements
const gizmoOverlay = document.getElementById('gizmoOverlay');
const gizmoBox = document.getElementById('gizmoBox');
const gizmoTitle = document.getElementById('gizmoTitle');
const gizmoDeleteBtn = document.getElementById('gizmoDeleteBtn');

// Gizmo Drag & Resize State
let activeDragMode = null; // 'move', 'resize', 'photo'
let activeHandle = null;
let dragStartX = 0;
let dragStartY = 0;
let dragInitialPos = null;
let dragInitialPanX = 0;
let dragInitialPanY = 0;
let dragInitialZoom = 1;
let isInteracting = false;

// ==========================================
// UNIVERSAL UNDO / REDO & RESTORE ENGINE
// ==========================================
const MAX_UNDO_STACK = 50;
let undoStack = [];
let redoStack = [];
let isPerformingUndoRedo = false;

function pushUndoSnapshot() {
  if (isPerformingUndoRedo) return;
  const snapshot = JSON.parse(JSON.stringify(state.config));
  undoStack.push(snapshot);
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
  redoStack = [];
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const uNav = document.getElementById('universalUndoBtn');
  const rNav = document.getElementById('universalRedoBtn');
  const uStage = document.getElementById('stageUndoBtn');
  const rStage = document.getElementById('stageRedoBtn');

  if (uNav) uNav.disabled = !canUndo;
  if (rNav) rNav.disabled = !canRedo;
  if (uStage) uStage.disabled = !canUndo;
  if (rStage) rStage.disabled = !canRedo;
}

function undo() {
  if (undoStack.length === 0) {
    showToast('Nothing to undo');
    return;
  }
  isPerformingUndoRedo = true;
  const currentSnapshot = JSON.parse(JSON.stringify(state.config));
  redoStack.push(currentSnapshot);
  if (redoStack.length > MAX_UNDO_STACK) redoStack.shift();

  const prevConfig = undoStack.pop();
  state.config = prevConfig;

  syncAllControlsWithConfig();
  triggerRender();
  updateGizmoBox();
  updateUndoRedoButtons();
  isPerformingUndoRedo = false;
  showToast('Undo successful ↶');
}

function redo() {
  if (redoStack.length === 0) {
    showToast('Nothing to redo');
    return;
  }
  isPerformingUndoRedo = true;
  const currentSnapshot = JSON.parse(JSON.stringify(state.config));
  undoStack.push(currentSnapshot);
  if (undoStack.length > MAX_UNDO_STACK) undoStack.shift();

  const nextConfig = redoStack.pop();
  state.config = nextConfig;

  syncAllControlsWithConfig();
  triggerRender();
  updateGizmoBox();
  updateUndoRedoButtons();
  isPerformingUndoRedo = false;
  showToast('Redo successful ↷');
}

function syncAllControlsWithConfig() {
  const cfg = state.config;
  if (!cfg) return;

  // 1. Aspect Ratio
  const aspectPill = document.getElementById('aspectRatioPill');
  if (aspectPill) {
    aspectPill.textContent = ASPECT_RATIOS[cfg.aspectRatio]?.label.split(' ')[0] || cfg.aspectRatio;
  }
  updateActiveCard('#aspectRatioGrid', 'data-ratio', cfg.aspectRatio);

  // 2. Template
  const templateNames = {
    'story-pro': 'Story Pro',
    'split-focus': 'Split Focus',
    'minimal-hud': 'Minimal HUD',
    'stat-beast': 'Stat Beast',
    'route-focus': 'Route Focus',
    'lap-workout': 'Lap Workout',
  };
  const templatePill = document.getElementById('templatePill');
  if (templatePill) {
    templatePill.textContent = templateNames[cfg.template] || cfg.template;
  }
  updateActiveCard('#templateGrid', 'data-template', cfg.template);

  // 3. Theme & Colors
  updateActiveCard('#themeGrid', 'data-theme', cfg.theme);
  const customColorInput = document.getElementById('customColorInput');
  if (customColorInput && cfg.customAccentColor) {
    customColorInput.value = cfg.customAccentColor;
  }

  // 4. Card Style & Font
  updateActiveCard('#cardStyleGrid', 'data-cardstyle', cfg.cardStyle);
  updateActiveCard('#fontGrid', 'data-font', cfg.fontFamily);

  // 4b. Background Type & Photo
  updateActiveCard('#bgTypeGrid', 'data-bg', cfg.bgType || 'solid');
  const photoSection = document.getElementById('photoControlsSection');
  if (photoSection) {
    photoSection.style.display = cfg.bgType === 'photo' ? 'block' : 'none';
  }
  syncPhotoSliders();

  // 5. Widget Visibility Checkboxes
  const widgetToggles = [
    { id: 'toggleHeader', key: 'showWidgetHeader' },
    { id: 'toggleMap', key: 'showWidgetMap' },
    { id: 'toggleHero', key: 'showWidgetHero' },
    { id: 'toggleMetrics', key: 'showWidgetMetrics' },
    { id: 'toggleSplits', key: 'showWidgetSplits' },
    { id: 'toggleElevation', key: 'showWidgetElevation' },
    { id: 'toggleHrZones', key: 'showWidgetHrZones' },
    { id: 'toggleBrand', key: 'showWidgetBrand' },
    { id: 'togglePaceGraph', key: 'showWidgetPaceGraph' },
    { id: 'toggleHrGraph', key: 'showWidgetHrGraph' },
    { id: 'toggleAvgHrBadge', key: 'showWidgetAvgHrBadge' },
  ];
  widgetToggles.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) el.checked = cfg[key] !== false;
  });

  // 6. Metrics Checkboxes
  const metricToggles = [
    'metricShowHr', 'metricShowElevation', 'metricShowCadence', 'metricShowCalories', 'metricShowBestPace',
  ];
  metricToggles.forEach((key) => {
    const el = document.getElementById(key);
    if (el) el.checked = cfg[key] !== false;
  });

  // 7. Splits Tab Checkboxes
  const splitHighlightFastest = document.getElementById('toggleFastestSplitHighlight');
  if (splitHighlightFastest) splitHighlightFastest.checked = cfg.splitHighlightFastest !== false;

  const splitWidgetTitleInput = document.getElementById('inputSplitWidgetTitle');
  if (splitWidgetTitleInput) splitWidgetTitleInput.value = cfg.splitCustomTitle || '';

  if (cfg.splitColumns) {
    Object.entries(cfg.splitColumns).forEach(([colKey, val]) => {
      const capKey = colKey.charAt(0).toUpperCase() + colKey.slice(1);
      const el = document.getElementById('splitCol' + capKey);
      if (el) el.checked = !!val;
    });
  }

  // 8. Text Tab and Activity Inputs
  syncInputsWithActivity(state.currentActivity);
  renderCustomTextsList();

  // 8b. Header Location Toggle Sync
  const showLocVal = cfg.headerShowLocation !== false && cfg.showLocation !== false;
  ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = showLocVal;
  });

  // 9. Element Inspector Sync
  if (window.syncInspectorWithSelectedElement) {
    window.syncInspectorWithSelectedElement(state.selectedWidget || 'header');
  }

  // 10. Dropdowns & Grids Sync
  const setSelectVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };
  setSelectVal('headerDesignSelect', cfg.headerTemplate || cfg.headerDesign);
  setSelectVal('mapDesignSelect', cfg.mapDesign);
  setSelectVal('heroMetricSelect', cfg.heroMetric);
  setSelectVal('heroDesignSelect', cfg.heroDesign);
  setSelectVal('metricsDesignSelect', cfg.metricsDesign);
  setSelectVal('splitWidgetModeSelect', cfg.splitWidgetMode);
  setSelectVal('splitsDesignSelect', cfg.splitsDesign);
  setSelectVal('splitHighlightDesignSelect', cfg.splitHighlightDesign);
  setSelectVal('elevationDesignSelect', cfg.elevationDesign);
  setSelectVal('paceGraphDesignSelect', cfg.paceGraphDesign);
  setSelectVal('hrGraphDesignSelect', cfg.hrGraphDesign);
  setSelectVal('hrBadgeDesignSelect', cfg.hrBadgeDesign);
  setSelectVal('brandStyleSelect', cfg.brandStyle);
  setSelectVal('splitIntervalSelect', cfg.splitInterval);

  updateActiveCard('#splitSourceGrid', 'data-source', cfg.splitDataSource || 'auto');
  updateActiveCard('#splitWidgetModeGrid', 'data-mode', cfg.splitWidgetMode || 'bars');
  updateActiveCard('#headerTemplateGrid', 'data-template', cfg.headerTemplate || cfg.headerDesign || 'modern');
}

function deleteSelectedTarget(targetKey = null) {
  const key = targetKey || state.selectedWidget;
  if (!key) {
    showToast('No element selected to delete');
    return;
  }
  pushUndoSnapshot();

  // 1. Check if it's a custom text sticker
  const cIdx = state.config.customTexts.findIndex((t) => t.id === key);
  if (cIdx !== -1) {
    state.config.customTexts.splice(cIdx, 1);
    selectWidget(null);
    renderCustomTextsList();
    triggerRender();
    showToast('Deleted text sticker');
    return;
  }

  // 2. Check if it's a background border (_bg)
  if (key.endsWith('_bg')) {
    const baseKey = key.replace(/_bg$/, '');
    if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
    if (!state.config.widgetBgStyles[baseKey]) state.config.widgetBgStyles[baseKey] = {};
    state.config.widgetBgStyles[baseKey].visible = false;
    state.config.widgetBgStyles[baseKey].hidden = true;
    state.config.widgetBgStyles[baseKey].showBg = false;
    state.config.widgetBgStyles[baseKey].showBorder = false;
    selectWidget(baseKey);
    if (window.syncInspectorWithSelectedElement) {
      window.syncInspectorWithSelectedElement(baseKey, 'bg');
    }
    triggerRender();
    showToast(`Deleted background border for ${baseKey}`);
    return;
  }

  // 3. Check if inspector has a sub-part selected for this widget
  const subPartSelect = document.getElementById('inspectorSubPartSelect');
  const currentPart = subPartSelect ? subPartSelect.value : 'widget';
  if (currentPart !== 'widget' && currentPart !== 'bg' && subPartSelect) {
    if (!state.config.widgetElementOffsets) state.config.widgetElementOffsets = {};
    if (!state.config.widgetElementOffsets[key]) state.config.widgetElementOffsets[key] = {};
    if (!state.config.widgetElementOffsets[key][currentPart]) {
      state.config.widgetElementOffsets[key][currentPart] = { x: 0, y: 0, z: 1 };
    }
    state.config.widgetElementOffsets[key][currentPart].hidden = true;
    state.config.widgetElementOffsets[key][currentPart].visible = false;
    if (key === 'header' && currentPart === 'location') {
      state.config.headerShowLocation = false;
      state.config.showLocation = false;
      ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
      });
    }
    triggerRender();
    showToast(`Deleted / hid ${currentPart} in ${key}`);
    return;
  }

  // 4. Default: Delete (hide) the entire widget
  const showKey = 'showWidget' + key.charAt(0).toUpperCase() + key.slice(1);
  if (showKey in state.config) {
    state.config[showKey] = false;
    const widgetCheckbox = document.getElementById(showKey) || document.getElementById('toggle' + key.charAt(0).toUpperCase() + key.slice(1));
    if (widgetCheckbox) widgetCheckbox.checked = false;
    selectWidget(null);
    triggerRender();
    showToast(`Deleted ${key} widget`);
  } else {
    selectWidget(null);
    triggerRender();
    showToast(`Deselected ${key}`);
  }
}

function restoreWidgetToTemplate(targetKey = null) {
  const key = targetKey || state.selectedWidget;
  if (!key) {
    showToast('Select a widget to restore');
    return;
  }
  pushUndoSnapshot();

  const baseKey = key.replace(/_bg$/, '');

  // Reset custom position & size
  if (state.config.widgetPositions && state.config.widgetPositions[baseKey]) {
    delete state.config.widgetPositions[baseKey];
  }

  // Reset custom border styles (offset, size, radius, stroke, visibility, textOnly)
  if (state.config.widgetBgStyles && state.config.widgetBgStyles[baseKey]) {
    delete state.config.widgetBgStyles[baseKey];
  }

  // Reset custom sub-element offsets & hidden states
  if (state.config.widgetElementOffsets && state.config.widgetElementOffsets[baseKey]) {
    delete state.config.widgetElementOffsets[baseKey];
  }

  // Reset custom styling (font, sizeScale, color, accentColor, cardStyle, textAlign)
  if (state.config.elementStyles && state.config.elementStyles[baseKey]) {
    delete state.config.elementStyles[baseKey];
  }

  // Reset custom text overrides
  if (state.config.widgetTextOverrides && state.config.widgetTextOverrides[baseKey]) {
    delete state.config.widgetTextOverrides[baseKey];
  }

  // Widget specific reset
  if (baseKey === 'header') {
    state.config.customTitle = '';
    state.config.customSubtitle = '';
    state.config.runnerName = '@runner';
    state.config.locationName = '';
    state.config.weatherText = '';
    state.config.headerShowLocation = true;
    state.config.showLocation = true;
    ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = true;
    });
    syncInputsWithActivity(state.currentActivity);
  } else if (baseKey === 'splits') {
    state.config.splitCustomTitle = '';
    state.config.splitHighlightFastest = true;
    state.config.splitColumns = {
      split: true,
      time: true,
      pace: true,
      delta: true,
      avgHr: true,
      maxHr: false,
      minHr: false,
      cadence: false,
      elevation: true,
    };
  }

  // Ensure widget is enabled / visible
  const showKey = 'showWidget' + baseKey.charAt(0).toUpperCase() + baseKey.slice(1);
  if (showKey in state.config) {
    state.config[showKey] = true;
    const widgetCheckbox = document.getElementById(showKey) || document.getElementById('toggle' + baseKey.charAt(0).toUpperCase() + baseKey.slice(1));
    if (widgetCheckbox) widgetCheckbox.checked = true;
  }

  // Re-sync UI controls and inspector
  syncAllControlsWithConfig();
  if (window.syncInspectorWithSelectedElement) {
    window.syncInspectorWithSelectedElement(baseKey, 'widget');
  }
  selectWidget(baseKey);
  triggerRender();
  showToast(`Restored ${baseKey} to original template design`);
}

function setupUndoRedoControls() {
  const uNav = document.getElementById('universalUndoBtn');
  const rNav = document.getElementById('universalRedoBtn');
  const uStage = document.getElementById('stageUndoBtn');
  const rStage = document.getElementById('stageRedoBtn');

  if (uNav) uNav.addEventListener('click', undo);
  if (rNav) rNav.addEventListener('click', redo);
  if (uStage) uStage.addEventListener('click', undo);
  if (rStage) rStage.addEventListener('click', redo);

  updateUndoRedoButtons();
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

    // Ctrl+Z / Cmd+Z for Undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        e.preventDefault();
        redo();
      } else {
        e.preventDefault();
        undo();
      }
      return;
    }

    // Ctrl+Y / Cmd+Y for Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    // Delete / Backspace key when a widget is selected (and not editing text)
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputActive) {
      if (state.selectedWidget) {
        e.preventDefault();
        deleteSelectedTarget(state.selectedWidget);
      }
    }

    // Spacebar to toggle Play/Pause Run Animation (when not typing in an input/textarea)
    if (e.code === 'Space' && !isInputActive) {
      if (videoAnimator) {
        e.preventDefault();
        videoAnimator.togglePlay();
      }
    }
  });
}

// ==========================================
// WORKSPACE PREVIEW ZOOM CONTROLLER
// ==========================================
function setupZoomControls() {
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomLevelText = document.getElementById('zoomLevelText');
  const stageViewport = document.getElementById('stageViewport');

  const zoomLevels = [0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
  state.previewZoom = 'fit';

  // Keep track of the natural fitted height
  let lastFitHeight = 600;

  const updateFitHeight = () => {
    if (state.previewZoom === 'fit' && canvas) {
      const h = canvas.offsetHeight || canvas.getBoundingClientRect().height;
      if (h > 100) lastFitHeight = h;
    }
  };

  const applyZoom = (zoom) => {
    state.previewZoom = zoom;
    if (zoom === 'fit') {
      if (stageViewport) {
        stageViewport.classList.remove('mode-zoomed');
        stageViewport.classList.add('mode-fit');
      }
      canvasWrapper.style.width = '';
      canvasWrapper.style.height = '';
      canvasWrapper.style.maxWidth = '';
      canvasWrapper.style.maxHeight = '';
      canvas.style.width = '';
      canvas.style.height = '';
      canvas.style.maxWidth = '';
      canvas.style.maxHeight = '';
      if (zoomLevelText) zoomLevelText.textContent = 'Fit';
      setTimeout(updateFitHeight, 50);
    } else {
      updateFitHeight();
      if (stageViewport) {
        stageViewport.classList.remove('mode-fit');
        stageViewport.classList.add('mode-zoomed');
      }
      const z = typeof zoom === 'number' ? zoom : 1.0;
      const baseHeight = lastFitHeight > 100 ? lastFitHeight : Math.max(360, (stageViewport ? stageViewport.clientHeight : window.innerHeight * 0.72) - 48);
      const targetH = Math.round(baseHeight * z);
      const aspect = canvas.width > 0 && canvas.height > 0 ? (canvas.width / canvas.height) : (9 / 16);
      const targetW = Math.round(targetH * aspect);

      canvasWrapper.style.maxWidth = 'none';
      canvasWrapper.style.maxHeight = 'none';
      canvas.style.maxWidth = 'none';
      canvas.style.maxHeight = 'none';

      canvasWrapper.style.width = `${targetW}px`;
      canvasWrapper.style.height = `${targetH}px`;
      canvas.style.width = `${targetW}px`;
      canvas.style.height = `${targetH}px`;
      if (zoomLevelText) zoomLevelText.textContent = `${Math.round(z * 100)}%`;
    }
    updateGizmoBox();
  };

  const getNextZoom = (direction) => {
    let cur = state.previewZoom === 'fit' ? 1.0 : state.previewZoom;
    if (direction > 0) {
      return zoomLevels.find((l) => l > cur + 0.05) || zoomLevels[zoomLevels.length - 1];
    } else {
      const reversed = [...zoomLevels].reverse();
      return reversed.find((l) => l < cur - 0.05) || zoomLevels[0];
    }
  };

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      applyZoom(getNextZoom(1));
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      applyZoom(getNextZoom(-1));
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      if (state.previewZoom === 'fit') {
        applyZoom(1.0);
      } else {
        applyZoom('fit');
      }
    });
  }

  // Ctrl + Mouse Wheel Zoom on stageViewport
  if (stageViewport) {
    stageViewport.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        applyZoom(getNextZoom(dir));
      }
    }, { passive: false });
  }

  // Window resize keeps fit and gizmo in sync
  window.addEventListener('resize', () => {
    if (state.previewZoom === 'fit') {
      applyZoom('fit');
    } else {
      applyZoom(state.previewZoom);
    }
  });

  window.applyWorkspaceZoom = applyZoom;
}

let videoAnimator = null;
let lastExportedVideoResult = null;

function init() {
  // 1. Load initial demo activities
  state.demoActivities = getDemoActivities(state.isImperial);
  state.currentActivity = state.demoActivities['5k'];

  // Sync inputs with activity
  syncInputsWithActivity(state.currentActivity);

  // Initialize Video Animator Engine
  videoAnimator = new VideoAnimator(renderer, state, (progActivity) => {
    renderer.render(progActivity, state.config, 1);
    updateGizmoBox();
  });
  window.videoAnimator = videoAnimator;

  // 2. Setup Event Listeners
  setupNavigationTabs();
  setupActivityControls();
  setupFormatControls();
  setupSavedTemplatesControls();
  setupZoomControls();
  setupSplitsControls();
  setupWidgetsControls();
  setupTextAndStickersControls();
  setupHeaderTemplateControls();
  setupElementInspectorControls();
  setupStyleControls();
  setupExportControls();
  setupVideoAnimationControls();
  setupGizmoController();
  setupUndoRedoControls();
  setupKeyboardShortcuts();

  // 3. Populate Splits UI
  updateSplitsDropdownAndTable();

  // 4. Initial Render
  window.state = state;
  window.renderer = renderer;
  window.selectWidget = selectWidget;
  window.triggerRender = triggerRender;
  triggerRender();
}

// Trigger canvas re-render and reposition gizmo
function triggerRender(progActivity = null) {
  const act = progActivity || (videoAnimator && videoAnimator.progress < 0.999
    ? getProgressiveActivity(state.currentActivity, videoAnimator.progress, state.isImperial)
    : state.currentActivity);
  renderer.render(act, state.config, 1);
  updateGizmoBox();
}

function updateAnimTimelineMarkers(progressFraction = 1.0) {
  if (!state.currentActivity) return;
  const p = Math.max(0, Math.min(1, progressFraction));
  const totalDist = state.currentActivity.distance || 1;
  const totalDuration = state.currentActivity.duration || 1;
  const curDist = totalDist * p;
  const curDuration = Math.round(totalDuration * p);

  const isImperial = state.isImperial;
  const curDistStr = isImperial ? (curDist / 1609.34).toFixed(2) : (curDist / 1000).toFixed(2);
  const totalDistStr = isImperial ? (totalDist / 1609.34).toFixed(2) : (totalDist / 1000).toFixed(2);
  const unit = isImperial ? 'mi' : 'km';

  const distProgress = document.getElementById('animDistProgress');
  const timeProgress = document.getElementById('animTimeProgress');
  const percentProgress = document.getElementById('animPercentProgress');

  if (distProgress) distProgress.textContent = `${curDistStr} / ${totalDistStr} ${unit}`;
  if (timeProgress) timeProgress.textContent = `${formatTime(curDuration)} / ${formatTime(totalDuration)}`;
  if (percentProgress) percentProgress.textContent = `${Math.round(p * 100)}%`;
}

function setupVideoAnimationControls() {
  const playPauseBtn = document.getElementById('animPlayPauseBtn');
  const playIcon = document.getElementById('animPlayIcon');
  const resetBtn = document.getElementById('animResetBtn');
  const scrubber = document.getElementById('animScrubber');
  const durationSelect = document.getElementById('animDurationSelect');
  const holdSelect = document.getElementById('animHoldSelect');
  const loopToggle = document.getElementById('animLoopToggle');
  const openExportModalBtn = document.getElementById('animOpenExportModalBtn');
  const startVideoExportBtn = document.getElementById('startVideoExportBtn');

  // Video Export Modal elements
  const modal = document.getElementById('videoExportModal');
  const closeBtn = document.getElementById('closeVideoModalBtn');
  const settingsView = document.getElementById('videoSettingsView');
  const progressView = document.getElementById('videoProgressView');
  const completedView = document.getElementById('videoCompletedView');
  const modalDurationSelect = document.getElementById('modalVideoDurationSelect');
  const modalHoldSelect = document.getElementById('modalVideoHoldSelect');
  const tabHoldSelect = document.getElementById('videoExportHoldSelect');
  const modalScaleSelect = document.getElementById('modalVideoScaleSelect');
  const modalFpsSelect = document.getElementById('modalVideoFpsSelect');
  const modalCodecSelect = document.getElementById('modalVideoCodecSelect');
  const modalRenderBtn = document.getElementById('modalRenderVideoBtn');
  const modalDownloadBtn = document.getElementById('modalDownloadVideoBtn');
  const modalRenderAgainBtn = document.getElementById('modalRenderAgainBtn');
  const videoPreviewPlayer = document.getElementById('videoPreviewPlayer');
  const videoMetaText = document.getElementById('videoMetaText');
  const progressBar = document.getElementById('videoProgressBar');
  const progressDetail = document.getElementById('videoProgressDetail');
  const progressStatusText = document.getElementById('videoProgressStatusText');

  // Hook callbacks to VideoAnimator
  videoAnimator.onProgressUpdate = (p) => {
    if (scrubber) scrubber.value = Math.round(p * 1000);
    updateAnimTimelineMarkers(p);
  };

  videoAnimator.onPlayStateChange = (isPlaying) => {
    if (playIcon) playIcon.textContent = isPlaying ? '⏸' : '▶';
    if (playPauseBtn) {
      playPauseBtn.title = isPlaying ? 'Pause Run Animation (Space)' : 'Play Run Animation (Space)';
      playPauseBtn.classList.toggle('playing', isPlaying);
    }
  };

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      videoAnimator.togglePlay();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      videoAnimator.reset();
    });
  }

  if (scrubber) {
    scrubber.addEventListener('input', (e) => {
      const p = Number(e.target.value) / 1000;
      videoAnimator.seek(p);
    });
  }

  function syncRunDuration(durSec) {
    const dur = Number(durSec);
    videoAnimator.setDuration(dur);
    if (durationSelect) durationSelect.value = dur;
    if (modalDurationSelect) modalDurationSelect.value = dur;
    const tabDur = document.getElementById('videoExportDurationSelect');
    if (tabDur) tabDur.value = dur;
  }

  if (durationSelect) {
    durationSelect.addEventListener('change', (e) => {
      syncRunDuration(e.target.value);
    });
  }

  if (modalDurationSelect) {
    modalDurationSelect.addEventListener('change', (e) => {
      syncRunDuration(e.target.value);
    });
  }

  const tabDurSelect = document.getElementById('videoExportDurationSelect');
  if (tabDurSelect) {
    tabDurSelect.addEventListener('change', (e) => {
      syncRunDuration(e.target.value);
    });
  }

  function syncHoldDuration(holdSec) {
    const hold = Number(holdSec);
    videoAnimator.setHoldDuration(hold);
    if (holdSelect) holdSelect.value = hold;
    if (modalHoldSelect) modalHoldSelect.value = hold;
    if (tabHoldSelect) tabHoldSelect.value = hold;
  }

  if (holdSelect) {
    holdSelect.addEventListener('change', (e) => {
      syncHoldDuration(e.target.value);
    });
  }

  if (modalHoldSelect) {
    modalHoldSelect.addEventListener('change', (e) => {
      syncHoldDuration(e.target.value);
    });
  }

  if (tabHoldSelect) {
    tabHoldSelect.addEventListener('change', (e) => {
      syncHoldDuration(e.target.value);
    });
  }

  if (loopToggle) {
    loopToggle.addEventListener('click', () => {
      videoAnimator.setLoop(!videoAnimator.isLooping);
      loopToggle.classList.toggle('active', videoAnimator.isLooping);
    });
  }

  // Modal open helper
  function openExportModal() {
    videoAnimator.pause();
    if (modal) modal.style.display = 'flex';
    if (settingsView) settingsView.style.display = 'block';
    if (progressView) progressView.style.display = 'none';
    if (completedView) completedView.style.display = 'none';
  }

  if (openExportModalBtn) openExportModalBtn.addEventListener('click', openExportModal);
  if (startVideoExportBtn) {
    startVideoExportBtn.addEventListener('click', () => {
      const tabDur = document.getElementById('videoExportDurationSelect')?.value;
      const tabHold = document.getElementById('videoExportHoldSelect')?.value;
      const tabFps = document.getElementById('videoExportFpsSelect')?.value;
      if (tabDur && modalDurationSelect) modalDurationSelect.value = tabDur;
      if (tabHold && modalHoldSelect) modalHoldSelect.value = tabHold;
      if (tabFps && modalFpsSelect) modalFpsSelect.value = tabFps;
      openExportModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  if (modalRenderAgainBtn) {
    modalRenderAgainBtn.addEventListener('click', () => {
      if (settingsView) settingsView.style.display = 'block';
      if (progressView) progressView.style.display = 'none';
      if (completedView) completedView.style.display = 'none';
    });
  }

  // Render Execution
  if (modalRenderBtn) {
    modalRenderBtn.addEventListener('click', async () => {
      if (!state.currentActivity) {
        showToast('Please load an activity first.');
        return;
      }

      const duration = Number(modalDurationSelect?.value || 10);
      const holdDuration = Number(modalHoldSelect?.value ?? 5);
      const fps = Number(modalFpsSelect?.value || 30);
      const scale = Number(modalScaleSelect?.value || 1);
      const codecChoice = modalCodecSelect?.value || 'auto';
      const mimeType = codecChoice === 'auto' ? undefined : codecChoice;

      const totalExpectedFrames = Math.max(10, Math.round(duration * fps)) + Math.max(0, Math.round(holdDuration * fps));

      // Switch to progress view
      if (settingsView) settingsView.style.display = 'none';
      if (progressView) progressView.style.display = 'block';
      if (completedView) completedView.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      if (progressStatusText) progressStatusText.textContent = 'Rendering animated video frames...';
      if (progressDetail) progressDetail.textContent = `Rendering 0 / ${totalExpectedFrames} frames`;

      try {
        const result = await videoAnimator.exportVideo({
          duration,
          holdDuration,
          fps,
          scale,
          mimeType
        }, (frame, total, pct) => {
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressDetail) progressDetail.textContent = `Frame ${frame} / ${total} (${pct}%)`;
        });

        lastExportedVideoResult = result;

        // Switch to completed view
        if (progressView) progressView.style.display = 'none';
        if (completedView) completedView.style.display = 'block';

        if (videoPreviewPlayer) {
          videoPreviewPlayer.src = result.url;
          videoPreviewPlayer.play().catch(() => {});
        }

        const sizeMb = (result.size / (1024 * 1024)).toFixed(2);
        const formatName = result.filename.endsWith('.mp4') ? 'MP4' : 'WebM';
        if (videoMetaText) {
          videoMetaText.textContent = `${result.duration}s • ${formatName} • ${sizeMb} MB • ${result.filename}`;
        }

        showToast('Video rendered successfully! 🎬');

        // Check if desktop standalone mode is active to auto-save to output/
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Data = reader.result;
            try {
              const res = await fetch('/api/save-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: result.filename, videoData: base64Data })
              });
              if (res.ok) {
                const data = await res.json();
                if (data.success) {
                  showToast(`Saved to output/${result.filename}! 💾`);
                }
              }
            } catch (ignore) {}
          };
          reader.readAsDataURL(result.blob);
        } catch (ignore) {}

      } catch (err) {
        console.error('Video export error:', err);
        showToast('Video export failed: ' + err.message);
        if (settingsView) settingsView.style.display = 'block';
        if (progressView) progressView.style.display = 'none';
      }
    });
  }

  if (modalDownloadBtn) {
    modalDownloadBtn.addEventListener('click', () => {
      if (!lastExportedVideoResult) return;
      downloadBlob(lastExportedVideoResult.blob, lastExportedVideoResult.filename);
      showToast(`Downloading ${lastExportedVideoResult.filename}...`);
    });
  }

  // Initial timeline sync
  updateAnimTimelineMarkers(1.0);
}

// ==========================================
// 1. NAVIGATION TABS
// ==========================================
function setupNavigationTabs() {
  const tabsNav = document.getElementById('tabsNav');
  const tabBtns = tabsNav.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

// ==========================================
// 2. ACTIVITY & FILE UPLOAD
// ==========================================
function setupActivityControls() {
  const dropzone = document.getElementById('fileDropzone');
  const fileInput = document.getElementById('activityFileInput');
  const quickDemoSelect = document.getElementById('quickDemoSelect');
  const unitToggleBtn = document.getElementById('unitToggleBtn');
  const unitToggleLabel = document.getElementById('unitToggleLabel');

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      await handleActivityFileUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      await handleActivityFileUpload(e.target.files[0]);
    }
  });

  quickDemoSelect.addEventListener('change', (e) => {
    const demoKey = e.target.value;
    state.currentActivity = state.demoActivities[demoKey];
    syncInputsWithActivity(state.currentActivity);
    updateSplitsDropdownAndTable();
    if (videoAnimator) videoAnimator.seek(1.0);
    updateAnimTimelineMarkers(1.0);
    triggerRender();
    showToast(`Loaded ${state.currentActivity.title}`);
  });

  unitToggleBtn.addEventListener('click', () => {
    state.isImperial = !state.isImperial;
    unitToggleLabel.textContent = state.isImperial ? 'MI' : 'KM';
    state.demoActivities = getDemoActivities(state.isImperial);

    if (state.currentActivity) {
      recalculateActivitySplits(state.currentActivity, state.config.splitDistanceMeters, state.isImperial);
      state.currentActivity.distanceUnit = state.isImperial ? 'mi' : 'km';
    }

    updateSplitsDropdownAndTable();
    updateAnimTimelineMarkers(videoAnimator ? videoAnimator.progress : 1.0);
    triggerRender();
    showToast(`Switched units to ${state.isImperial ? 'Miles' : 'Kilometers'}`);
  });
}

async function handleActivityFileUpload(file) {
  showToast(`Parsing ${file.name}...`);
  try {
    const normalized = await parseActivityFile(file, state.isImperial, state.config.splitDistanceMeters);
    state.currentActivity = normalized;
    syncInputsWithActivity(normalized);
    updateSplitsDropdownAndTable();
    if (videoAnimator) videoAnimator.seek(1.0);
    updateAnimTimelineMarkers(1.0);
    triggerRender();
    showToast(`Loaded ${normalized.title} (${normalized.distanceMain} ${normalized.distanceUnit})`);
  } catch (err) {
    console.error('File parsing error:', err);
    showToast(`Failed to parse file: ${err.message}`);
  }
}

function syncInputsWithActivity(act) {
  if (!act) return;
  const title = document.getElementById('inputActivityTitle');
  const runner = document.getElementById('inputRunnerName');
  const loc = document.getElementById('inputLocationName');
  const weather = document.getElementById('inputWeatherText');

  if (title) title.value = state.config.customTitle || act.title || '';
  if (runner) runner.value = state.config.runnerName || '@runner';
  if (loc) loc.value = state.config.locationName || '';
  if (weather) weather.value = state.config.weatherText || '';

  // Also sync Text Tab inputs
  const ttTitle = document.getElementById('textTabActivityTitle');
  const ttSubtitle = document.getElementById('textTabSubtitle');
  const ttRunner = document.getElementById('textTabRunnerName');
  const ttLoc = document.getElementById('textTabLocationName');
  const ttWeather = document.getElementById('textTabWeatherText');
  const ttWatermark = document.getElementById('textTabWatermark');

  if (ttTitle) ttTitle.value = state.config.customTitle || act.title || '';
  if (ttSubtitle) ttSubtitle.value = state.config.customSubtitle || `${act.dateFormatted} • ${act.timeFormatted}`;
  if (ttRunner) ttRunner.value = state.config.runnerName || '@runner';
  if (ttLoc) ttLoc.value = state.config.locationName || '';
  if (ttWeather) ttWeather.value = state.config.weatherText || '';
  if (ttWatermark) ttWatermark.value = state.config.customWatermark || '';
}

// ==========================================
// 3. FORMAT & TEMPLATES CONTROLS
// ==========================================
function setupFormatControls() {
  // Aspect Ratios
  setupCardGrid('#aspectRatioGrid', 'data-ratio', (ratio) => {
    pushUndoSnapshot();
    state.config.aspectRatio = ratio;
    document.getElementById('aspectRatioPill').textContent = ASPECT_RATIOS[ratio]?.label.split(' ')[0] || ratio;
    if (renderer.bgImage && state.config.bgType === 'photo') {
      const img = renderer.bgImage;
      const imgAspect = img.width / img.height;
      const [rw, rh] = ratio.split(':').map(Number);
      const canvasAspect = (rw && rh) ? rw / rh : 9 / 16;
      const isRatioSimilar = Math.abs(imgAspect - canvasAspect) / Math.max(imgAspect, canvasAspect) < 0.05;
      if (!isRatioSimilar && state.config.photoFit !== 'cover') {
        state.config.photoFit = 'fit';
      }
      syncPhotoSliders();
    }
    triggerRender();
  });

  // Templates
  setupCardGrid('#templateGrid', 'data-template', (template) => {
    state.config.template = template;
    const templateNames = {
      'story-pro': 'Story Pro',
      'split-focus': 'Split Focus',
      'minimal-hud': 'Minimal HUD',
      'stat-beast': 'Stat Beast',
      'route-focus': 'Route Focus',
      'lap-workout': 'Lap Workout',
    };
    document.getElementById('templatePill').textContent = templateNames[template] || template;
    triggerRender();
  });
}

// ==========================================
// 3b. SAVED CUSTOM TEMPLATES CONTROLS
// ==========================================
const TEMPLATES_STORAGE_KEY = 'runoverlay_custom_templates';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#039;');
}

function getSavedTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('Failed to parse saved templates:', e);
    return [];
  }
}

function saveTemplatesToStorage(templates) {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates to storage:', e);
    showToast('Failed to save to local storage');
  }
}

function extractTemplateConfig(cfg) {
  return {
    aspectRatio: cfg.aspectRatio || '9:16',
    template: cfg.template || 'story-pro',
    theme: cfg.theme || 'cyber',
    customAccentColor: cfg.customAccentColor || null,

    // Background & styling
    bgType: cfg.bgType || 'solid',
    bgColor1: cfg.bgColor1 || '#0a0a0d',
    bgColor2: cfg.bgColor2 || '#13131a',
    bgGradientAngle: cfg.bgGradientAngle || 180,
    photoFit: cfg.photoFit || 'fit',
    photoZoom: typeof cfg.photoZoom === 'number' ? cfg.photoZoom : 1,
    photoPanX: typeof cfg.photoPanX === 'number' ? cfg.photoPanX : 0,
    photoPanY: typeof cfg.photoPanY === 'number' ? cfg.photoPanY : 0,
    photoBlur: typeof cfg.photoBlur === 'number' ? cfg.photoBlur : 0,
    cardStyle: cfg.cardStyle || 'glass',
    cardRadius: typeof cfg.cardRadius === 'number' ? cfg.cardRadius : 16,
    fontFamily: cfg.fontFamily || 'Inter',
    mapGlow: cfg.mapGlow !== false,

    // Enabled widgets
    showWidgetHeader: cfg.showWidgetHeader !== false,
    showWidgetMap: cfg.showWidgetMap !== false,
    showWidgetHero: cfg.showWidgetHero !== false,
    showWidgetMetrics: cfg.showWidgetMetrics !== false,
    showWidgetSplits: cfg.showWidgetSplits !== false,
    showWidgetElevation: cfg.showWidgetElevation !== false,
    showWidgetHrZones: cfg.showWidgetHrZones !== false,
    showWidgetBrand: cfg.showWidgetBrand !== false,
    showWidgetPaceGraph: cfg.showWidgetPaceGraph !== false,
    showWidgetHrGraph: cfg.showWidgetHrGraph !== false,
    showWidgetAvgHrBadge: cfg.showWidgetAvgHrBadge !== false,

    // Metric items
    metricShowHr: cfg.metricShowHr !== false,
    metricShowElevation: cfg.metricShowElevation !== false,
    metricShowCadence: cfg.metricShowCadence !== false,
    metricShowCalories: cfg.metricShowCalories !== false,
    metricShowBestPace: cfg.metricShowBestPace !== false,

    // Widget designs
    headerTemplate: cfg.headerTemplate || cfg.headerDesign || 'modern',
    headerDesign: cfg.headerDesign || cfg.headerTemplate || 'modern',
    heroMetric: cfg.heroMetric || 'distance',
    heroDesign: cfg.heroDesign || 'mega',
    metricsDesign: cfg.metricsDesign || 'grid',
    splitWidgetMode: cfg.splitWidgetMode || 'bars',
    splitsDesign: cfg.splitsDesign || 'vertical-bars',
    splitHighlightDesign: cfg.splitHighlightDesign || 'spotlight',
    elevationDesign: cfg.elevationDesign || 'area',
    paceGraphDesign: cfg.paceGraphDesign || 'area',
    hrGraphDesign: cfg.hrGraphDesign || 'filled-area',
    hrBadgeDesign: cfg.hrBadgeDesign || 'pill',
    brandStyle: cfg.brandStyle || 'strava',
    mapDesign: cfg.mapDesign || 'glow',

    // Splits configuration
    splitInterval: cfg.splitInterval || 1000,
    splitDataSource: cfg.splitDataSource || 'auto',
    splitHighlightFastest: cfg.splitHighlightFastest !== false,
    splitCustomTitle: cfg.splitCustomTitle || '',
    splitColumns: cfg.splitColumns ? JSON.parse(JSON.stringify(cfg.splitColumns)) : {},

    // Text overrides & label customizations
    headerShowLocation: cfg.headerShowLocation !== false,
    showLocation: cfg.showLocation !== false,
    customTitle: cfg.customTitle || '',
    customSubtitle: cfg.customSubtitle || '',
    runnerName: cfg.runnerName || '',
    locationName: cfg.locationName || '',
    weatherText: cfg.weatherText || '',
    customWatermark: cfg.customWatermark || '',
    labelDistance: cfg.labelDistance || '',
    labelTime: cfg.labelTime || '',
    labelPace: cfg.labelPace || '',
    labelHr: cfg.labelHr || '',
    labelElevation: cfg.labelElevation || '',
    labelCadence: cfg.labelCadence || '',
    widgetTextOverrides: cfg.widgetTextOverrides ? JSON.parse(JSON.stringify(cfg.widgetTextOverrides)) : {},
    customTexts: cfg.customTexts ? JSON.parse(JSON.stringify(cfg.customTexts)) : [],

    // Individual Positioning, Backgrounds, and Sub-Parts
    widgetPositions: cfg.widgetPositions ? JSON.parse(JSON.stringify(cfg.widgetPositions)) : {},
    widgetBgStyles: cfg.widgetBgStyles ? JSON.parse(JSON.stringify(cfg.widgetBgStyles)) : {},
    widgetElementOffsets: cfg.widgetElementOffsets ? JSON.parse(JSON.stringify(cfg.widgetElementOffsets)) : {},
    elementStyles: cfg.elementStyles ? JSON.parse(JSON.stringify(cfg.elementStyles)) : {},
  };
}

function saveCurrentTemplate(customName = null) {
  const nameInput = document.getElementById('saveTemplateNameInput');
  let name = (customName || (nameInput ? nameInput.value : '')).trim();

  if (!name) {
    const themeName = state.config.theme ? (state.config.theme.charAt(0).toUpperCase() + state.config.theme.slice(1)) : 'Custom';
    const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    name = `${themeName} ${state.config.aspectRatio || '9:16'} (${dateStr})`;
  }

  const templates = getSavedTemplates();
  const newTemplate = {
    id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name: name,
    createdAt: new Date().toISOString(),
    aspectRatio: state.config.aspectRatio || '9:16',
    theme: state.config.theme || 'cyber',
    config: extractTemplateConfig(state.config),
  };

  templates.unshift(newTemplate);
  saveTemplatesToStorage(templates);
  if (nameInput) nameInput.value = '';

  renderSavedTemplatesList();
  showToast(`Template "${name}" saved! 💾`);
  return newTemplate;
}

function applyCustomTemplate(templateId) {
  const templates = getSavedTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl || !tpl.config) {
    showToast('Template not found');
    return;
  }

  pushUndoSnapshot();

  const c = tpl.config;
  Object.keys(c).forEach((key) => {
    if (typeof c[key] === 'object' && c[key] !== null) {
      state.config[key] = JSON.parse(JSON.stringify(c[key]));
    } else {
      state.config[key] = c[key];
    }
  });

  syncAllControlsWithConfig();
  triggerRender();
  updateGizmoBox();
  renderSavedTemplatesList();

  showToast(`Applied template "${tpl.name}"! ⚡`);
}

function deleteCustomTemplate(templateId) {
  const templates = getSavedTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  const name = tpl ? tpl.name : 'template';
  if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;

  const filtered = templates.filter((t) => t.id !== templateId);
  saveTemplatesToStorage(filtered);
  renderSavedTemplatesList();
  showToast(`Deleted template "${name}"`);
}

function renameCustomTemplate(templateId) {
  const templates = getSavedTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) return;
  const newName = prompt('Enter new template name:', tpl.name);
  if (newName && newName.trim()) {
    tpl.name = newName.trim();
    saveTemplatesToStorage(templates);
    renderSavedTemplatesList();
    showToast('Template renamed');
  }
}

function exportSingleTemplate(templateId) {
  const templates = getSavedTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) return;

  const jsonStr = JSON.stringify(tpl, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const filename = `${tpl.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_template.json`;
  downloadBlob(blob, filename);
  showToast(`Exported "${tpl.name}" to JSON`);
}

function exportAllTemplates() {
  const templates = getSavedTemplates();
  if (templates.length === 0) {
    showToast('No saved templates to export');
    return;
  }

  const jsonStr = JSON.stringify(templates, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, 'runoverlay_saved_templates_backup.json');
  showToast(`Exported ${templates.length} template(s) to backup file`);
}

function importTemplatesFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const incoming = Array.isArray(data) ? data : [data];
      const valid = incoming.filter((item) => item && (item.config || item.aspectRatio || item.name));
      if (valid.length === 0) {
        showToast('Invalid template file format');
        return;
      }

      const templates = getSavedTemplates();
      valid.forEach((t) => {
        templates.unshift({
          id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: t.name || 'Imported Template',
          createdAt: t.createdAt || new Date().toISOString(),
          aspectRatio: t.aspectRatio || (t.config && t.config.aspectRatio) || '9:16',
          theme: t.theme || (t.config && t.config.theme) || 'cyber',
          config: t.config || extractTemplateConfig(t),
        });
      });

      saveTemplatesToStorage(templates);
      renderSavedTemplatesList();
      showToast(`Imported ${valid.length} template(s) successfully! 📥`);

      if (valid.length > 0) {
        applyCustomTemplate(templates[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Error reading template file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function renderSavedTemplatesList() {
  const container = document.getElementById('savedTemplatesList');
  const countBadge = document.getElementById('savedTemplatesCount');
  if (!container) return;

  const templates = getSavedTemplates();
  if (countBadge) countBadge.textContent = `${templates.length} Saved`;

  if (templates.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 18px 12px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle); border-radius: 8px; color: var(--text-muted); font-size: 0.78rem;">
        <div style="font-size: 1.5rem; margin-bottom: 6px;">📐</div>
        <div style="font-weight: 600; color: #fff; margin-bottom: 2px;">No Saved Templates Yet</div>
        <div>Customize your widgets, colors, and layout, then enter a name above to save your first reusable template!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  templates.forEach((tpl) => {
    const card = document.createElement('div');
    card.className = 'saved-template-card';
    card.style.cssText = 'background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s;';

    const dateStr = tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 700; font-size: 0.88rem; color: #fff; display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span>⚡</span>
            <span class="template-name-text">${escapeHtml(tpl.name)}</span>
            <button type="button" class="btn-rename-template" data-id="${tpl.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.72rem; padding:0 2px;" title="Rename template">✏️</button>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
            <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(204,255,0,0.12); color: var(--accent-volt); font-weight: 700;">${tpl.aspectRatio || '9:16'}</span>
            <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(56,189,248,0.12); color: #38bdf8; font-weight: 700;">${(tpl.theme || 'CYBER').toUpperCase()}</span>
            <span style="font-size: 0.68rem; color: var(--text-muted);">${dateStr}</span>
          </div>
        </div>
        <div style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">
          <button type="button" class="btn btn-primary btn-apply-template" data-id="${tpl.id}" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700;" title="Load and apply this template">
            Apply ⚡
          </button>
          <button type="button" class="btn btn-secondary btn-export-template" data-id="${tpl.id}" style="padding: 4px 8px; font-size: 0.72rem;" title="Download template JSON file">
            💾
          </button>
          <button type="button" class="btn btn-secondary btn-delete-template" data-id="${tpl.id}" style="padding: 4px 8px; font-size: 0.72rem; color: #f87171;" title="Delete this template">
            🗑️
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-apply-template').addEventListener('click', () => applyCustomTemplate(tpl.id));
    card.querySelector('.btn-export-template').addEventListener('click', () => exportSingleTemplate(tpl.id));
    card.querySelector('.btn-delete-template').addEventListener('click', () => deleteCustomTemplate(tpl.id));
    card.querySelector('.btn-rename-template').addEventListener('click', () => renameCustomTemplate(tpl.id));

    container.appendChild(card);
  });
}

function setupSavedTemplatesControls() {
  const saveBtn = document.getElementById('saveCurrentTemplateBtn');
  const nameInput = document.getElementById('saveTemplateNameInput');
  const stageSaveBtn = document.getElementById('stageSaveTemplateBtn');
  const importBtn = document.getElementById('importTemplateBtn');
  const fileInput = document.getElementById('importTemplateFileInput');
  const exportAllBtn = document.getElementById('exportAllTemplatesBtn');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveCurrentTemplate());
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveCurrentTemplate();
      }
    });
  }

  if (stageSaveBtn) {
    stageSaveBtn.addEventListener('click', () => {
      const formatTabBtn = document.querySelector('.tab-btn[data-tab="formatTab"]');
      if (formatTabBtn) formatTabBtn.click();

      const input = document.getElementById('saveTemplateNameInput');
      const box = document.getElementById('saveTemplateFormBox');
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
      }
      if (box) {
        box.style.borderColor = 'var(--accent-volt)';
        box.style.boxShadow = '0 0 16px rgba(204, 255, 0, 0.3)';
        setTimeout(() => {
          box.style.borderColor = 'var(--border-subtle)';
          box.style.boxShadow = 'none';
        }, 1500);
      }
      showToast('Enter template name and click Save 💾');
    });
  }

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importTemplatesFromFile(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', exportAllTemplates);
  }

  // Initial render from localStorage
  renderSavedTemplatesList();

  // Expose on window for tests and console
  window.saveCurrentTemplate = saveCurrentTemplate;
  window.applyCustomTemplate = applyCustomTemplate;
  window.getSavedTemplates = getSavedTemplates;
  window.renderSavedTemplatesList = renderSavedTemplatesList;
  window.importTemplatesFromFile = importTemplatesFromFile;
  window.exportSingleTemplate = exportSingleTemplate;
  window.exportAllTemplates = exportAllTemplates;
}

// ==========================================
// 4. SPLITS & LAPS CONTROLS
// ==========================================
function setupSplitsControls() {
  setupCardGrid('#splitSourceGrid', 'data-source', (source) => {
    state.config.splitDataSource = source;
    updateSplitsDropdownAndTable();
    triggerRender();
  });

  // Split Distance Interval Selector
  const splitIntervalSelect = document.getElementById('splitIntervalSelect');
  const customSplitGroup = document.getElementById('customSplitGroup');
  const customSplitInput = document.getElementById('customSplitInput');

  if (splitIntervalSelect) {
    const handleIntervalChange = () => {
      let meters = parseFloat(splitIntervalSelect.value);
      if (splitIntervalSelect.value === 'custom') {
        if (customSplitGroup) customSplitGroup.style.display = 'block';
        meters = parseFloat(customSplitInput.value) || 800;
      } else {
        if (customSplitGroup) customSplitGroup.style.display = 'none';
      }

      state.config.splitDistanceMeters = meters;
      if (state.currentActivity) {
        recalculateActivitySplits(state.currentActivity, meters, state.isImperial);
        updateSplitsDropdownAndTable();
        triggerRender();
        const label = meters >= 1000 ? (meters / 1000) + ' km' : meters + ' m';
        showToast(`Splits recalculated every ${label}`);
      }
    };

    splitIntervalSelect.addEventListener('change', handleIntervalChange);
    if (customSplitInput) customSplitInput.addEventListener('input', handleIntervalChange);
  }

  setupCardGrid('#splitWidgetModeGrid', 'data-mode', (mode) => {
    state.config.splitWidgetMode = mode;
    triggerRender();
  });

  const splitTargetSelect = document.getElementById('splitTargetSelect');
  if (splitTargetSelect) {
    splitTargetSelect.addEventListener('change', (e) => {
      state.config.highlightSplitTarget = e.target.value;
      triggerRender();
    });
  }

  // Split Data Columns Checkboxes (New User Requirement)
  const colBinds = [
    { id: 'colSplitTime', key: 'time' },
    { id: 'colSplitPace', key: 'pace' },
    { id: 'colSplitDelta', key: 'delta' },
    { id: 'colSplitAvgHr', key: 'avgHr' },
    { id: 'colSplitMaxHr', key: 'maxHr' },
    { id: 'colSplitMinHr', key: 'minHr' },
    { id: 'colSplitCadence', key: 'cadence' },
    { id: 'colSplitElev', key: 'elevation' },
  ];
  colBinds.forEach(({ id, key }) => {
    const cb = document.getElementById(id);
    if (cb) {
      cb.checked = !!state.config.splitColumns[key];
      cb.addEventListener('change', (e) => {
        state.config.splitColumns[key] = e.target.checked;
        triggerRender();
      });
    }
  });

  // Fastest Split Highlight Toggle (New User Requirement)
  const toggleFastest = document.getElementById('toggleFastestSplitHighlight');
  if (toggleFastest) {
    toggleFastest.checked = state.config.splitHighlightFastest !== false;
    toggleFastest.addEventListener('change', (e) => {
      state.config.splitHighlightFastest = e.target.checked;
      triggerRender();
    });
  }

  // Split Widget Title Input (New User Requirement)
  const splitTitleInput = document.getElementById('inputSplitWidgetTitle');
  if (splitTitleInput) {
    splitTitleInput.value = state.config.splitCustomTitle || '';
    splitTitleInput.addEventListener('input', (e) => {
      state.config.splitCustomTitle = e.target.value;
      if (state.config.widgetTextOverrides?.splits) {
        state.config.widgetTextOverrides.splits.title = e.target.value;
      }
      triggerRender();
    });
  }

  // Reset Split Row Labels Button
  const resetSplitLabelsBtn = document.getElementById('resetSplitLabelsBtn');
  if (resetSplitLabelsBtn) {
    resetSplitLabelsBtn.addEventListener('click', () => {
      state.config.splitCustomLabels = {};
      renderSplitRowRenamerList();
      triggerRender();
      showToast('Split row names reset to default');
    });
  }
}

function renderSplitRowRenamerList() {
  const container = document.getElementById('splitRowRenamerList');
  if (!container) return;

  const isLapSource = state.config.splitDataSource === 'laps' && state.currentActivity?.hasLaps;
  const items = isLapSource ? state.currentActivity?.laps : state.currentActivity?.splits;

  if (!items || items.length === 0) {
    container.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding:4px;">No splits loaded yet.</div>';
    return;
  }

  container.innerHTML = '';
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'split-renamer-row';
    const currentCustom = (state.config.splitCustomLabels && state.config.splitCustomLabels[item.index]) || '';

    row.innerHTML = `
      <span class="split-renamer-badge">${item.shortName || ('#' + (idx + 1))}</span>
      <input type="text" class="split-renamer-input" placeholder="${item.name}" value="${currentCustom}">
    `;

    const input = row.querySelector('.split-renamer-input');
    input.addEventListener('input', (e) => {
      if (!state.config.splitCustomLabels) state.config.splitCustomLabels = {};
      state.config.splitCustomLabels[item.index] = e.target.value;
      triggerRender();
    });

    container.appendChild(row);
  });
}

function updateSplitsDropdownAndTable() {
  const isLapSource = state.config.splitDataSource === 'laps' && state.currentActivity?.hasLaps;
  const items = isLapSource ? state.currentActivity?.laps : state.currentActivity?.splits;
  const select = document.getElementById('splitTargetSelect');
  const tbody = document.getElementById('splitsTableBody');
  const summaryBadge = document.getElementById('splitsTableSummaryBadge');

  renderSplitRowRenamerList();

  if (!items || items.length === 0) {
    if (select) select.innerHTML = '<option value="fastest">⚡ Fastest Split</option>';
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No split data available</td></tr>';
    if (summaryBadge) summaryBadge.textContent = '';
    return;
  }

  const totalDistMeters = items.reduce((sum, item) => sum + (item.distance || 0), 0);
  const distFormatted = state.isImperial
    ? `${(totalDistMeters / 1609.34).toFixed(2)} mi`
    : `${(totalDistMeters / 1000).toFixed(2)} km`;

  if (summaryBadge) {
    summaryBadge.textContent = `${items.length} Splits Total • ${distFormatted}`;
  }

  const prevVal = select.value;
  select.innerHTML = `
    <option value="fastest">⚡ Fastest Split (${items.find((i) => i.isFastest)?.shortName || 'PB'})</option>
    <option value="slowest">🐢 Slowest Split</option>
    <option value="last">🏁 Final Split (${items[items.length - 1].shortName})</option>
  `;

  const optGroup = document.createElement('optgroup');
  optGroup.label = isLapSource ? 'Select Specific Lap' : 'Select Specific Distance Split';

  items.forEach((item, idx) => {
    const opt = document.createElement('option');
    opt.value = `index-${idx}`;
    opt.textContent = `${item.name} • ${item.paceFormatted} (${item.timeFormatted})`;
    optGroup.appendChild(opt);
  });
  select.appendChild(optGroup);

  if (Array.from(select.options).some((o) => o.value === prevVal)) {
    select.value = prevVal;
  }

  tbody.innerHTML = '';
  items.forEach((item, idx) => {
    const tr = document.createElement('tr');
    if (item.isFastest) tr.classList.add('fastest');

    tr.innerHTML = `
      <td><strong>${item.name}</strong> ${item.isFastest ? '⚡' : ''}</td>
      <td>${item.timeFormatted}</td>
      <td><strong>${item.paceFormatted}</strong></td>
      <td>${item.avgHr ? item.avgHr + ' bpm' : '-'}</td>
      <td>${item.elevationGain ? '+' + item.elevationGain + 'm' : '-'}</td>
    `;

    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      select.value = `index-${idx}`;
      state.config.highlightSplitTarget = `index-${idx}`;
      state.config.splitWidgetMode = 'highlight';
      updateActiveCard('#splitWidgetModeGrid', 'data-mode', 'highlight');
      triggerRender();
      showToast(`Spotlighted ${item.name}`);
    });

    tbody.appendChild(tr);
  });

  // Add overall summary row at bottom of table
  if (items.length > 1) {
    const totalDurationSec = items.reduce((sum, item) => sum + (item.duration || 0), 0);
    const avgSecPerKm = totalDistMeters > 0 ? totalDurationSec / (totalDistMeters / 1000) : 0;
    const avgPaceMin = Math.floor(avgSecPerKm / 60);
    const avgPaceRemSec = Math.floor(avgSecPerKm % 60);
    const avgPaceFormatted = `${avgPaceMin}:${String(avgPaceRemSec).padStart(2, '0')} /km`;

    const totalHours = Math.floor(totalDurationSec / 3600);
    const totalMinutes = Math.floor((totalDurationSec % 3600) / 60);
    const totalSeconds = Math.round(totalDurationSec % 60);
    const totalTimeFormatted = totalHours > 0
      ? `${totalHours}:${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`
      : `${totalMinutes}:${String(totalSeconds).padStart(2, '0')}`;

    const totalTr = document.createElement('tr');
    totalTr.style.background = 'rgba(255, 255, 255, 0.08)';
    totalTr.style.borderTop = '2px solid rgba(255, 255, 255, 0.2)';
    totalTr.style.fontWeight = 'bold';
    totalTr.innerHTML = `
      <td><strong>TOTAL (${items.length})</strong></td>
      <td><strong>${totalTimeFormatted}</strong></td>
      <td><strong style="color:var(--accent-volt);">${avgPaceFormatted}</strong></td>
      <td>-</td>
      <td>-</td>
    `;
    tbody.appendChild(totalTr);
  }
}

// ==========================================
// 5. WIDGETS CONTROLS
// ==========================================
function setupWidgetsControls() {
  const binds = [
    { id: 'toggleHeader', key: 'showWidgetHeader' },
    { id: 'toggleMap', key: 'showWidgetMap' },
    { id: 'toggleHero', key: 'showWidgetHero' },
    { id: 'toggleMetrics', key: 'showWidgetMetrics' },
    { id: 'toggleSplits', key: 'showWidgetSplits' },
    { id: 'toggleElevation', key: 'showWidgetElevation' },
    { id: 'toggleHrZones', key: 'showWidgetHrZones' },
    { id: 'toggleBrand', key: 'showWidgetBrand' },
    { id: 'togglePaceGraph', key: 'showWidgetPaceGraph' },
    { id: 'toggleHrGraph', key: 'showWidgetHrGraph' },
    { id: 'toggleAvgHrBadge', key: 'showWidgetAvgHrBadge' },
  ];

  binds.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        state.config[key] = e.target.checked;
        triggerRender();
      });
    }
  });

  // Widget Design Variants Dropdowns
  const designBinds = [
    { id: 'headerDesignSelect', key: 'headerDesign' },
    { id: 'mapDesignSelect', key: 'mapDesign' },
    { id: 'heroDesignSelect', key: 'heroDesign' },
    { id: 'metricsDesignSelect', key: 'metricsDesign' },
    { id: 'splitsDesignSelect', key: 'splitsDesign' },
    { id: 'splitHighlightDesignSelect', key: 'splitHighlightDesign' },
    { id: 'elevationDesignSelect', key: 'elevationDesign' },
    { id: 'paceGraphDesignSelect', key: 'paceGraphDesign' },
    { id: 'hrGraphDesignSelect', key: 'hrGraphDesign' },
    { id: 'hrBadgeDesignSelect', key: 'hrBadgeDesign' },
  ];

  designBinds.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        pushUndoSnapshot();
        state.config[key] = e.target.value;
        triggerRender();
      });
    }
  });

  // Hero metric choice
  setupCardGrid('#heroMetricGrid', 'data-hero', (hero) => {
    pushUndoSnapshot();
    state.config.heroMetric = hero;
    triggerRender();
  });

  // Manual Position Sliders in Widgets Tab
  const posX = document.getElementById('widgetPosXSlider');
  const posY = document.getElementById('widgetPosYSlider');
  const posW = document.getElementById('widgetWidthSlider');
  const posH = document.getElementById('widgetHeightSlider');

  const onSliderChange = () => {
    if (!state.selectedWidget) return;
    const cur = state.config.widgetPositions[state.selectedWidget] || renderer.widgetBounds[state.selectedWidget] || {};
    state.config.widgetPositions[state.selectedWidget] = {
      ...cur,
      x: parseInt(posX.value, 10),
      y: parseInt(posY.value, 10),
      width: parseInt(posW.value, 10),
      height: parseInt(posH.value, 10),
    };
    triggerRender();
  };

  if (posX) posX.addEventListener('input', onSliderChange);
  if (posY) posY.addEventListener('input', onSliderChange);
  if (posW) posW.addEventListener('input', onSliderChange);
  if (posH) posH.addEventListener('input', onSliderChange);

  const resetPosBtn = document.getElementById('resetSelectedWidgetPosBtn');
  if (resetPosBtn) {
    resetPosBtn.addEventListener('click', () => {
      if (state.selectedWidget) {
        pushUndoSnapshot();
        delete state.config.widgetPositions[state.selectedWidget];
        triggerRender();
        showToast('Reset widget to template default');
      }
    });
  }

  const centerBtn = document.getElementById('centerSelectedWidgetBtn');
  if (centerBtn) {
    centerBtn.addEventListener('click', () => {
      if (state.selectedWidget) {
        pushUndoSnapshot();
        centerWidget(state.selectedWidget);
      }
    });
  }
}

// ==========================================
// 6. HEADER TEMPLATES CONTROLS
// ==========================================
function setupHeaderTemplateControls() {
  const grid = document.getElementById('headerTemplateGrid');
  const select = document.getElementById('headerDesignSelect');

  const setHeaderTemplate = (template) => {
    pushUndoSnapshot();
    state.config.headerTemplate = template;
    state.config.headerDesign = template;

    if (select && select.value !== template) {
      select.value = template;
    }

    if (grid) {
      const cards = grid.querySelectorAll('.choice-card');
      cards.forEach((c) => {
        c.classList.toggle('active', c.dataset.template === template);
      });
    }

    triggerRender();
  };

  if (grid) {
    const cards = grid.querySelectorAll('.choice-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const tmpl = card.dataset.template;
        if (tmpl) setHeaderTemplate(tmpl);
      });
    });
  }

  if (select) {
    select.addEventListener('change', (e) => {
      setHeaderTemplate(e.target.value);
    });
  }
}

// ==========================================
// 7. INDIVIDUAL ELEMENT INSPECTOR & STYLER
// ==========================================
function setupElementInspectorControls() {
  const elSelect = document.getElementById('inspectorElementSelect');
  const subPartSelect = document.getElementById('inspectorSubPartSelect');
  const subPartBadge = document.getElementById('inspectorSubPartBadge');
  const subPartGroup = document.getElementById('inspectorSubPartGroup');
  const bgControlsContainer = document.getElementById('inspectorBgControlsContainer');
  const subElemControlsContainer = document.getElementById('inspectorSubElementControlsContainer');
  const subElemTitle = document.getElementById('inspectorSubElementTitle');

  // Background border controls
  const bgWidthSlider = document.getElementById('inspectorBgWidthSlider');
  const bgWidthInput = document.getElementById('inspectorBgWidthInput');
  const bgHeightSlider = document.getElementById('inspectorBgHeightSlider');
  const bgHeightInput = document.getElementById('inspectorBgHeightInput');
  const bgOffsetXSlider = document.getElementById('inspectorBgOffsetXSlider');
  const bgOffsetXInput = document.getElementById('inspectorBgOffsetXInput');
  const bgOffsetYSlider = document.getElementById('inspectorBgOffsetYSlider');
  const bgOffsetYInput = document.getElementById('inspectorBgOffsetYInput');
  const bgRadiusSlider = document.getElementById('inspectorBgRadiusSlider');
  const bgRadiusInput = document.getElementById('inspectorBgRadiusInput');
  const bgBorderWidthSlider = document.getElementById('inspectorBgBorderWidthSlider');
  const bgBorderWidthInput = document.getElementById('inspectorBgBorderWidthInput');
  const bgBorderColorInput = document.getElementById('inspectorBgBorderColorInput');
  const bgBorderColorHex = document.getElementById('inspectorBgBorderColorHex');
  const bgFillColorInput = document.getElementById('inspectorBgFillColorInput');
  const bgFillColorHex = document.getElementById('inspectorBgFillColorHex');
  const resetBgBtn = document.getElementById('inspectorResetBgBtn');

  // Sub-element controls
  const subElemXSlider = document.getElementById('inspectorSubElemXSlider');
  const subElemXInput = document.getElementById('inspectorSubElemXInput');
  const subElemYSlider = document.getElementById('inspectorSubElemYSlider');
  const subElemYInput = document.getElementById('inspectorSubElemYInput');
  const subElemZSlider = document.getElementById('inspectorSubElemZSlider');
  const subElemZInput = document.getElementById('inspectorSubElemZInput');
  const subElemFontFamily = document.getElementById('inspectorSubElemFontFamily');
  const subElemSizeSlider = document.getElementById('inspectorSubElemSizeSlider');
  const subElemSizeInput = document.getElementById('inspectorSubElemSizeInput');
  const subElemSizeVal = document.getElementById('inspectorSubElemSizeVal');
  const subElemTextInput = document.getElementById('inspectorSubElemTextInput');
  const subElemColorInput = document.getElementById('inspectorSubElemColorInput');
  const subElemColorHex = document.getElementById('inspectorSubElemColorHex');
  const subElemColorResetBtn = document.getElementById('inspectorSubElemColorResetBtn');
  const resetSubElemBtn = document.getElementById('inspectorResetSubElemBtn');

  const fontSelect = document.getElementById('inspectorFontFamily');
  const sizeSlider = document.getElementById('inspectorFontSizeSlider');
  const sizeInput = document.getElementById('inspectorFontSizeInput');
  const sizeVal = document.getElementById('inspectorFontSizeVal');
  const colorInput = document.getElementById('inspectorColorInput');
  const colorHex = document.getElementById('inspectorColorHex');
  const accentInput = document.getElementById('inspectorAccentInput');
  const accentHex = document.getElementById('inspectorAccentHex');
  const alignGrid = document.getElementById('inspectorAlignGrid');
  const cardStyleSelect = document.getElementById('inspectorCardStyle');
  const opacitySlider = document.getElementById('inspectorOpacitySlider');
  const opacityVal = document.getElementById('inspectorOpacityVal');
  const resetBtn = document.getElementById('inspectorResetBtn');
  const resetAllBtn = document.getElementById('inspectorResetAllBtn');

  if (!elSelect) return;

  const SUB_PARTS_MAP = {
    header: [
      { key: 'title', label: 'Main Title' },
      { key: 'subtitle', label: 'Subtitle / Date' },
      { key: 'runner', label: 'Runner Handle' },
      { key: 'location', label: 'Location Name' },
      { key: 'weather', label: 'Weather Information' },
    ],
    hero: [
      { key: 'label', label: 'Metric Label' },
      { key: 'val', label: 'Primary Value' },
      { key: 'unit', label: 'Metric Unit' },
      { key: 'sec', label: 'Secondary / Sub-Metric' },
    ],
    splits: [
      { key: 'title', label: 'Split Header Title' },
      { key: 'badge', label: 'Fastest Split Highlight Pill' },
      { key: 'table', label: 'Splits Table / Bar Chart' },
    ],
    metrics: [
      { key: 'label', label: 'Metric Category Labels' },
      { key: 'val', label: 'Metric Stat Values' },
    ],
    map: [
      { key: 'route', label: 'Route GPS Path' },
      { key: 'caption', label: 'Polaroid Bottom Caption' },
    ],
    elevation: [
      { key: 'title', label: 'Elevation Profile Title' },
      { key: 'stat', label: 'Elevation Gain & Peak Stats' },
      { key: 'chart', label: 'Elevation Graph Curve/Area' },
    ],
    paceGraph: [
      { key: 'title', label: 'Pace Graph Title' },
      { key: 'stat', label: 'Pace Min/Max/Avg Stats' },
      { key: 'chart', label: 'Pace Graph Curve/Area' },
    ],
    hrGraph: [
      { key: 'title', label: 'Heart Rate Graph Title' },
      { key: 'stat', label: 'Heart Rate Summary Stats' },
      { key: 'chart', label: 'Heart Rate Graph Curve/Area' },
    ],
    splitHighlight: [
      { key: 'badge', label: 'Top Badge / Trophy' },
      { key: 'val', label: 'Pace Value' },
      { key: 'title', label: 'Split Name / Distance' },
      { key: 'time', label: 'Split Duration' },
      { key: 'hr', label: 'Split Heart Rate' },
    ],
    hrBadge: [
      { key: 'icon', label: 'Heart Icon' },
      { key: 'label', label: 'Badge Label' },
      { key: 'val', label: 'Heart Rate Number' },
      { key: 'unit', label: 'Unit Text (BPM)' },
      { key: 'peak', label: 'Peak HR Summary' },
    ],
    brand: [
      { key: 'text', label: 'Brand / Watermark Text' },
    ],
  };

  const getActiveKey = () => elSelect.value || 'header';
  const getStyleObj = () => {
    const key = getActiveKey();
    if (!state.config.elementStyles) state.config.elementStyles = {};
    if (!state.config.elementStyles[key]) state.config.elementStyles[key] = {};
    return state.config.elementStyles[key];
  };

  const getBgObj = () => {
    const key = getActiveKey();
    if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
    if (!state.config.widgetBgStyles[key]) state.config.widgetBgStyles[key] = {};
    return state.config.widgetBgStyles[key];
  };

  const getSubElemObj = () => {
    const key = getActiveKey();
    const part = subPartSelect ? subPartSelect.value : 'widget';
    if (!state.config.widgetElementOffsets) state.config.widgetElementOffsets = {};
    if (!state.config.widgetElementOffsets[key]) state.config.widgetElementOffsets[key] = {};
    if (!state.config.widgetElementOffsets[key][part]) state.config.widgetElementOffsets[key][part] = { x: 0, y: 0, z: 1 };
    return state.config.widgetElementOffsets[key][part];
  };

  // Sync controls with selected element
  window.syncInspectorWithSelectedElement = (key, forcePart = null) => {
    if (key && elSelect.querySelector(`option[value="${key}"]`)) {
      elSelect.value = key;
    }
    const targetKey = getActiveKey();
    const st = (state.config.elementStyles && state.config.elementStyles[targetKey]) || {};

    // Populate sub-parts dropdown for this widget
    if (subPartGroup) {
      subPartGroup.innerHTML = '';
      const parts = SUB_PARTS_MAP[targetKey] || [];
      parts.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.key;
        opt.textContent = `📍 ${p.label}`;
        subPartGroup.appendChild(opt);
      });
    }

    if (forcePart && subPartSelect) {
      subPartSelect.value = forcePart;
    } else if (subPartSelect) {
      const curVal = subPartSelect.value;
      const valid = curVal === 'widget' || curVal === 'bg' || (SUB_PARTS_MAP[targetKey] && SUB_PARTS_MAP[targetKey].some((p) => p.key === curVal));
      if (!valid) subPartSelect.value = 'widget';
    }

    const currentPart = subPartSelect ? subPartSelect.value : 'widget';

    // Show/hide sub-containers
    if (currentPart === 'bg') {
      if (bgControlsContainer) bgControlsContainer.style.display = 'block';
      if (subElemControlsContainer) subElemControlsContainer.style.display = 'none';
      if (subPartBadge) subPartBadge.textContent = 'Background Border Only';

      const bgStyle = (state.config.widgetBgStyles && state.config.widgetBgStyles[targetKey]) || {};
      const wDelta = typeof bgStyle.widthDelta === 'number' ? bgStyle.widthDelta : 0;
      const hDelta = typeof bgStyle.heightDelta === 'number' ? bgStyle.heightDelta : 0;
      const offX = typeof bgStyle.offsetX === 'number' ? bgStyle.offsetX : 0;
      const offY = typeof bgStyle.offsetY === 'number' ? bgStyle.offsetY : 0;
      const rad = typeof bgStyle.radius === 'number' ? bgStyle.radius : (state.config.cardRadius || 16);
      const bWidth = typeof bgStyle.borderWidth === 'number' ? bgStyle.borderWidth : 1;
      const bColor = bgStyle.borderColor || '';
      const fColor = bgStyle.fillColor || '';

      if (bgWidthSlider) bgWidthSlider.value = wDelta;
      if (bgWidthInput) bgWidthInput.value = wDelta;
      if (bgHeightSlider) bgHeightSlider.value = hDelta;
      if (bgHeightInput) bgHeightInput.value = hDelta;
      if (bgOffsetXSlider) bgOffsetXSlider.value = offX;
      if (bgOffsetXInput) bgOffsetXInput.value = offX;
      if (bgOffsetYSlider) bgOffsetYSlider.value = offY;
      if (bgOffsetYInput) bgOffsetYInput.value = offY;
      if (bgRadiusSlider) bgRadiusSlider.value = rad;
      if (bgRadiusInput) bgRadiusInput.value = rad;
      if (bgBorderWidthSlider) bgBorderWidthSlider.value = bWidth;
      if (bgBorderWidthInput) bgBorderWidthInput.value = bWidth;
      if (bgBorderColorHex) bgBorderColorHex.value = bColor;
      if (bgBorderColorInput && bColor.startsWith('#')) bgBorderColorInput.value = bColor;
      if (bgFillColorHex) bgFillColorHex.value = fColor;
      if (bgFillColorInput && fColor.startsWith('#')) bgFillColorInput.value = fColor;

      const bgShowBgToggle = document.getElementById('inspectorBgShowBgToggle');
      const bgShowBorderToggle = document.getElementById('inspectorBgShowBorderToggle');
      if (bgShowBgToggle) bgShowBgToggle.checked = bgStyle.showBg !== false && !bgStyle.textOnly;
      if (bgShowBorderToggle) bgShowBorderToggle.checked = bgStyle.showBorder !== false && !bgStyle.textOnly;
    } else if (currentPart !== 'widget') {
      if (bgControlsContainer) bgControlsContainer.style.display = 'none';
      if (subElemControlsContainer) subElemControlsContainer.style.display = 'block';
      const partObj = (SUB_PARTS_MAP[targetKey] || []).find((p) => p.key === currentPart);
      const pLabel = partObj ? partObj.label : currentPart;
      if (subPartBadge) subPartBadge.textContent = pLabel;
      if (subElemTitle) subElemTitle.textContent = `📍 ${pLabel} (Move X, Y, Z)`;

      const off = (state.config.widgetElementOffsets && state.config.widgetElementOffsets[targetKey] && state.config.widgetElementOffsets[targetKey][currentPart]) || { x: 0, y: 0, z: 1 };
      const ox = typeof off.x === 'number' ? off.x : 0;
      const oy = typeof off.y === 'number' ? off.y : 0;
      const oz = typeof off.z === 'number' ? off.z : 1;

      if (subElemXSlider) subElemXSlider.value = ox;
      if (subElemXInput) subElemXInput.value = ox;
      if (subElemYSlider) subElemYSlider.value = oy;
      if (subElemYInput) subElemYInput.value = oy;
      if (subElemZSlider) subElemZSlider.value = oz;
      if (subElemZInput) subElemZInput.value = oz;

      if (subElemFontFamily) subElemFontFamily.value = off.fontFamily || 'default';
      const sScale = typeof off.scale === 'number' && !isNaN(off.scale) ? off.scale : 100;
      if (subElemSizeSlider) subElemSizeSlider.value = sScale;
      if (subElemSizeInput) subElemSizeInput.value = sScale;
      if (subElemSizeVal) subElemSizeVal.textContent = `${sScale}%`;

      // Populate text input
      if (subElemTextInput) {
        let currentText = '';
        if (state.config.widgetTextOverrides && state.config.widgetTextOverrides[targetKey]) {
          currentText = state.config.widgetTextOverrides[targetKey][currentPart] || '';
        }
        if (!currentText) {
          if (targetKey === 'header' && currentPart === 'title') currentText = state.config.customTitle || '';
          if (targetKey === 'header' && currentPart === 'subtitle') currentText = state.config.customSubtitle || '';
          if (targetKey === 'header' && currentPart === 'runner') currentText = state.config.runnerName || '';
          if (targetKey === 'header' && currentPart === 'location') currentText = state.config.locationName || '';
          if (targetKey === 'header' && currentPart === 'weather') currentText = state.config.weatherText || '';
          if (targetKey === 'splits' && currentPart === 'title') currentText = state.config.splitCustomTitle || '';
        }
        subElemTextInput.value = currentText;
      }

      // Populate text color
      const currentColor = (off.color && off.color !== 'default') ? off.color : '';
      if (subElemColorHex) subElemColorHex.value = currentColor;
      if (subElemColorInput) {
        if (currentColor && currentColor.startsWith('#')) {
          subElemColorInput.value = currentColor;
        } else {
          subElemColorInput.value = '#ffffff';
        }
      }
    } else {
      if (bgControlsContainer) bgControlsContainer.style.display = 'none';
      if (subElemControlsContainer) subElemControlsContainer.style.display = 'none';
      if (subPartBadge) subPartBadge.textContent = 'Entire Widget';
    }

    if (fontSelect) fontSelect.value = st.fontFamily || 'default';
    const scale = typeof st.fontSizeScale === 'number' ? st.fontSizeScale : 100;
    if (sizeSlider) sizeSlider.value = scale;
    if (sizeInput) sizeInput.value = scale;
    if (sizeVal) sizeVal.textContent = `${scale}%`;

    const color = st.color || '';
    if (colorHex) colorHex.value = color;
    if (colorInput && color && color.startsWith('#')) colorInput.value = color;

    const accent = st.accentColor || '';
    if (accentHex) accentHex.value = accent;
    if (accentInput && accent && accent.startsWith('#')) accentInput.value = accent;

    const align = st.textAlign || 'default';
    if (alignGrid) {
      alignGrid.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b.dataset.align === align);
      });
    }

    if (cardStyleSelect) cardStyleSelect.value = st.cardStyle || 'default';
    const op = typeof st.opacity === 'number' ? st.opacity : 100;
    if (opacitySlider) opacitySlider.value = op;
    if (opacityVal) opacityVal.textContent = `${op}%`;

    // Render in-context dynamic text editor for current element
    renderInspectorTextEditor(targetKey);
  };

  const renderInspectorTextEditor = (targetKey) => {
    const container = document.getElementById('inspectorTextEditorContainer');
    const badge = document.getElementById('inspectorTextWidgetBadge');
    if (!container) return;

    const names = {
      header: 'Header Widget',
      hero: 'Hero Metric Card',
      metrics: 'Secondary Metrics Grid',
      splits: 'Splits Table / Chart',
      splitHighlight: 'Split Spotlight Card',
      map: 'Route Map',
      elevation: 'Elevation Profile',
      hrZones: 'Heart Rate Zones',
      paceGraph: 'Pace Graph',
      hrGraph: 'Heart Rate Graph',
      hrBadge: 'Avg Heart Rate Badge',
      brand: 'Watermark / Brand',
    };

    if (badge) badge.textContent = names[targetKey] || targetKey;
    container.innerHTML = '';

    const overrides = state.config.widgetTextOverrides;

    const addField = (label, value, placeholder, onChange) => {
      const field = document.createElement('div');
      field.className = 'inspector-text-field';
      field.innerHTML = `
        <label>${label}</label>
        <input type="text" value="${value || ''}" placeholder="${placeholder || ''}">
      `;
      const input = field.querySelector('input');
      input.addEventListener('input', (e) => {
        onChange(e.target.value);
        triggerRender();
      });
      container.appendChild(field);
      return input;
    };

    if (targetKey === 'hero') {
      addField('Metric Label', overrides.hero.label, 'DISTANCE', (v) => {
        overrides.hero.label = v;
        const el = document.getElementById('textTabHeroLabel');
        if (el) el.value = v;
      });
      addField('Value Override', overrides.hero.value, 'Auto-calculated (or custom)', (v) => {
        overrides.hero.value = v;
        const el = document.getElementById('textTabHeroValue');
        if (el) el.value = v;
      });
      addField('Unit', overrides.hero.unit, 'KM', (v) => {
        overrides.hero.unit = v;
        const el = document.getElementById('textTabHeroUnit');
        if (el) el.value = v;
      });
    } else if (targetKey === 'header') {
      addField('Title', state.config.customTitle || overrides.header.title, 'MORNING RUN', (v) => {
        state.config.customTitle = v;
        overrides.header.title = v;
        const el1 = document.getElementById('inputActivityTitle');
        const el2 = document.getElementById('textTabActivityTitle');
        if (el1) el1.value = v;
        if (el2) el2.value = v;
      });
      addField('Subtitle / Date', state.config.customSubtitle || overrides.header.subtitle, 'Date & Time', (v) => {
        state.config.customSubtitle = v;
        overrides.header.subtitle = v;
        const el = document.getElementById('textTabSubtitle');
        if (el) el.value = v;
      });
      addField('Runner Handle', state.config.runnerName || overrides.header.runner, '@runner_alex', (v) => {
        state.config.runnerName = v;
        overrides.header.runner = v;
        const el1 = document.getElementById('inputRunnerName');
        const el2 = document.getElementById('textTabRunnerName');
        if (el1) el1.value = v;
        if (el2) el2.value = v;
      });
      addField('Location', state.config.locationName || overrides.header.location, 'Location name', (v) => {
        state.config.locationName = v;
        overrides.header.location = v;
        const el1 = document.getElementById('inputLocationName');
        const el2 = document.getElementById('textTabLocationName');
        if (el1) el1.value = v;
        if (el2) el2.value = v;
      });
      addField('Weather', state.config.weatherText || overrides.header.weather, '18°C ☀️ Sunny', (v) => {
        state.config.weatherText = v;
        overrides.header.weather = v;
        const el1 = document.getElementById('inputWeatherText');
        const el2 = document.getElementById('textTabWeatherText');
        if (el1) el1.value = v;
        if (el2) el2.value = v;
      });
    } else if (targetKey === 'splits') {
      addField('Split Widget Title', state.config.splitCustomTitle || overrides.splits.title, 'SPLITS', (v) => {
        state.config.splitCustomTitle = v;
        overrides.splits.title = v;
        const el = document.getElementById('inputSplitWidgetTitle');
        if (el) el.value = v;
      });
      addField('Column Header: Split', overrides.splits.headerSplit, 'SPLIT', (v) => {
        overrides.splits.headerSplit = v;
        const el = document.getElementById('textTabSplitHeaderSplit');
        if (el) el.value = v;
      });
      addField('Column Header: Time', overrides.splits.headerTime, 'TIME', (v) => {
        overrides.splits.headerTime = v;
        const el = document.getElementById('textTabSplitHeaderTime');
        if (el) el.value = v;
      });
      addField('Column Header: Pace', overrides.splits.headerPace, 'PACE', (v) => {
        overrides.splits.headerPace = v;
        const el = document.getElementById('textTabSplitHeaderPace');
        if (el) el.value = v;
      });
      addField('Column Header: +/- Delta', overrides.splits.headerDelta, '+/-', (v) => {
        overrides.splits.headerDelta = v;
        const el = document.getElementById('textTabSplitHeaderDelta');
        if (el) el.value = v;
      });
      addField('Column Header: Avg HR', overrides.splits.headerHr, 'AVG HR', (v) => {
        overrides.splits.headerHr = v;
        const el = document.getElementById('textTabSplitHeaderHr');
        if (el) el.value = v;
      });
      addField('Column Header: Elevation', overrides.splits.headerElev, 'ELEV', (v) => {
        overrides.splits.headerElev = v;
        const el = document.getElementById('textTabSplitHeaderElev');
        if (el) el.value = v;
      });
    } else if (targetKey === 'metrics') {
      addField('Distance Label', state.config.labelDistance, 'DISTANCE', (v) => {
        state.config.labelDistance = v;
        overrides.metrics.distance = v;
        const el = document.getElementById('customLabelDistance');
        if (el) el.value = v;
      });
      addField('Moving Time Label', state.config.labelTime, 'TIME', (v) => {
        state.config.labelTime = v;
        overrides.metrics.time = v;
        const el = document.getElementById('customLabelTime');
        if (el) el.value = v;
      });
      addField('Avg Pace Label', state.config.labelPace, 'AVG PACE', (v) => {
        state.config.labelPace = v;
        overrides.metrics.pace = v;
        const el = document.getElementById('customLabelPace');
        if (el) el.value = v;
      });
      addField('Avg HR Label', state.config.labelHr, 'AVG HR', (v) => {
        state.config.labelHr = v;
        overrides.metrics.hr = v;
        const el = document.getElementById('customLabelHr');
        if (el) el.value = v;
      });
      addField('Elevation Gain Label', state.config.labelElevation, 'ELEV GAIN', (v) => {
        state.config.labelElevation = v;
        overrides.metrics.elevation = v;
        const el = document.getElementById('customLabelElevation');
        if (el) el.value = v;
      });
      addField('Cadence Label', state.config.labelCadence, 'CADENCE', (v) => {
        state.config.labelCadence = v;
        overrides.metrics.cadence = v;
        const el = document.getElementById('customLabelCadence');
        if (el) el.value = v;
      });
    } else if (targetKey === 'paceGraph') {
      addField('Pace Graph Title', overrides.paceGraph.title, 'PACE PROFILE', (v) => {
        overrides.paceGraph.title = v;
        const el = document.getElementById('textTabPaceGraphTitle');
        if (el) el.value = v;
      });
    } else if (targetKey === 'hrGraph') {
      addField('HR Graph Title', overrides.hrGraph.title, 'HEART RATE ZONES', (v) => {
        overrides.hrGraph.title = v;
        const el = document.getElementById('textTabHrGraphTitle');
        if (el) el.value = v;
      });
    } else if (targetKey === 'elevation') {
      addField('Elevation Profile Title', overrides.elevation.title, 'ELEVATION PROFILE', (v) => {
        overrides.elevation.title = v;
        const el = document.getElementById('textTabElevationTitle');
        if (el) el.value = v;
      });
    } else if (targetKey === 'hrBadge') {
      addField('Badge Label', overrides.hrBadge.label, 'AVG HEART RATE', (v) => {
        overrides.hrBadge.label = v;
        const el = document.getElementById('textTabHrBadgeLabel');
        if (el) el.value = v;
      });
      addField('Unit', overrides.hrBadge.unit, 'BPM', (v) => {
        overrides.hrBadge.unit = v;
        const el = document.getElementById('textTabHrBadgeUnit');
        if (el) el.value = v;
      });
    } else if (targetKey === 'brand') {
      addField('Brand / Watermark Text', state.config.customWatermark || overrides.brand.text, '⚡ RUNOVERLAY', (v) => {
        state.config.customWatermark = v;
        overrides.brand.text = v;
        const el1 = document.getElementById('textTabWatermark');
        const el2 = document.getElementById('textTabBrandWatermarkText');
        if (el1) el1.value = v;
        if (el2) el2.value = v;
      });
    } else {
      container.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding:6px 0;">This graphic element does not have editable text labels.</div>';
    }
  };

  elSelect.addEventListener('change', () => {
    window.syncInspectorWithSelectedElement(elSelect.value);
  });

  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      const st = getStyleObj();
      st.fontFamily = e.target.value;
      triggerRender();
    });
  }

  if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (sizeInput) sizeInput.value = val;
      if (sizeVal) sizeVal.textContent = `${val}%`;
      const st = getStyleObj();
      st.fontSizeScale = val;
      triggerRender();
    });
  }

  if (sizeInput) {
    const handleManualSize = (e) => {
      const val = Math.max(10, Math.min(500, parseInt(e.target.value, 10) || 100));
      if (sizeSlider) sizeSlider.value = Math.min(300, Math.max(30, val));
      if (sizeVal) sizeVal.textContent = `${val}%`;
      const st = getStyleObj();
      st.fontSizeScale = val;
      triggerRender();
    };
    sizeInput.addEventListener('input', handleManualSize);
    sizeInput.addEventListener('change', handleManualSize);
  }

  if (colorInput) {
    colorInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (colorHex) colorHex.value = val;
      const st = getStyleObj();
      st.color = val;
      triggerRender();
    });
  }

  if (colorHex) {
    colorHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const st = getStyleObj();
      st.color = val;
      if (val && val.startsWith('#') && (val.length === 7 || val.length === 4) && colorInput) {
        colorInput.value = val;
      }
      triggerRender();
    });
  }

  if (accentInput) {
    accentInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (accentHex) accentHex.value = val;
      const st = getStyleObj();
      st.accentColor = val;
      triggerRender();
    });
  }

  if (accentHex) {
    accentHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const st = getStyleObj();
      st.accentColor = val;
      if (val && val.startsWith('#') && (val.length === 7 || val.length === 4) && accentInput) {
        accentInput.value = val;
      }
      triggerRender();
    });
  }

  // Quick Color Swatches
  const colorPills = document.querySelectorAll('.inspector-color-pill');
  colorPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const target = pill.dataset.target; // 'color' or 'accent'
      const color = pill.dataset.color;
      const st = getStyleObj();
      if (target === 'color') {
        st.color = color;
        if (colorHex) colorHex.value = color;
        if (colorInput && color.startsWith('#')) colorInput.value = color;
      } else {
        st.accentColor = color;
        if (accentHex) accentHex.value = color;
        if (accentInput && color.startsWith('#')) accentInput.value = color;
      }
      triggerRender();
    });
  });

  if (alignGrid) {
    const alignBtns = alignGrid.querySelectorAll('button');
    alignBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        alignBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const st = getStyleObj();
        st.textAlign = btn.dataset.align;
        triggerRender();
      });
    });
  }

  if (cardStyleSelect) {
    cardStyleSelect.addEventListener('change', (e) => {
      const st = getStyleObj();
      st.cardStyle = e.target.value;
      triggerRender();
    });
  }

  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (opacityVal) opacityVal.textContent = `${val}%`;
      const st = getStyleObj();
      st.opacity = val;
      triggerRender();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const key = getActiveKey();
      if (state.config.elementStyles && state.config.elementStyles[key]) {
        delete state.config.elementStyles[key];
      }
      window.syncInspectorWithSelectedElement(key);
      triggerRender();
      showToast(`Reset style for ${key}`);
    });
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      state.config.elementStyles = {};
      state.config.widgetBgStyles = {};
      state.config.widgetElementOffsets = {};
      window.syncInspectorWithSelectedElement(getActiveKey());
      triggerRender();
      showToast('All element style overrides reset to default');
    });
  }

  // SubPart select change
  if (subPartSelect) {
    subPartSelect.addEventListener('change', (e) => {
      window.syncInspectorWithSelectedElement(getActiveKey(), e.target.value);
    });
  }

  // Background border bindings
  const bindBgSliderInput = (slider, input, key) => {
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (input) input.value = val;
        getBgObj()[key] = val;
        triggerRender();
      });
    }
    if (input) {
      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        if (slider) slider.value = val;
        getBgObj()[key] = val;
        triggerRender();
      });
    }
  };

  bindBgSliderInput(bgWidthSlider, bgWidthInput, 'widthDelta');
  bindBgSliderInput(bgHeightSlider, bgHeightInput, 'heightDelta');
  bindBgSliderInput(bgOffsetXSlider, bgOffsetXInput, 'offsetX');
  bindBgSliderInput(bgOffsetYSlider, bgOffsetYInput, 'offsetY');
  bindBgSliderInput(bgRadiusSlider, bgRadiusInput, 'radius');
  bindBgSliderInput(bgBorderWidthSlider, bgBorderWidthInput, 'borderWidth');

  if (bgBorderColorInput) {
    bgBorderColorInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (bgBorderColorHex) bgBorderColorHex.value = val;
      getBgObj().borderColor = val;
      triggerRender();
    });
  }
  if (bgBorderColorHex) {
    bgBorderColorHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      getBgObj().borderColor = val;
      if (val && val.startsWith('#') && bgBorderColorInput) bgBorderColorInput.value = val;
      triggerRender();
    });
  }
  if (bgFillColorInput) {
    bgFillColorInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (bgFillColorHex) bgFillColorHex.value = val;
      getBgObj().fillColor = val;
      triggerRender();
    });
  }
  if (bgFillColorHex) {
    bgFillColorHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      getBgObj().fillColor = val;
      if (val && val.startsWith('#') && bgFillColorInput) bgFillColorInput.value = val;
      triggerRender();
    });
  }

  if (resetBgBtn) {
    resetBgBtn.addEventListener('click', () => {
      const key = getActiveKey();
      if (state.config.widgetBgStyles && state.config.widgetBgStyles[key]) {
        delete state.config.widgetBgStyles[key];
      }
      window.syncInspectorWithSelectedElement(key, 'bg');
      triggerRender();
      showToast(`Reset background border for ${key}`);
    });
  }

  // Sub-element bindings
  const bindSubElemSliderInput = (slider, input, key) => {
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (input) input.value = val;
        getSubElemObj()[key] = val;
        triggerRender();
      });
    }
    if (input) {
      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        if (slider) slider.value = val;
        getSubElemObj()[key] = val;
        triggerRender();
      });
    }
  };

  bindSubElemSliderInput(subElemXSlider, subElemXInput, 'x');
  bindSubElemSliderInput(subElemYSlider, subElemYInput, 'y');
  bindSubElemSliderInput(subElemZSlider, subElemZInput, 'z');

  if (subElemFontFamily) {
    subElemFontFamily.addEventListener('change', (e) => {
      pushUndoSnapshot();
      getSubElemObj().fontFamily = e.target.value;
      triggerRender();
    });
  }

  if (subElemSizeSlider) {
    subElemSizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 100;
      if (subElemSizeInput) subElemSizeInput.value = val;
      if (subElemSizeVal) subElemSizeVal.textContent = `${val}%`;
      getSubElemObj().scale = val;
      triggerRender();
    });
    subElemSizeSlider.addEventListener('change', () => pushUndoSnapshot());
  }

  if (subElemSizeInput) {
    subElemSizeInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 100;
      if (subElemSizeSlider) subElemSizeSlider.value = val;
      if (subElemSizeVal) subElemSizeVal.textContent = `${val}%`;
      getSubElemObj().scale = val;
      triggerRender();
    });
    subElemSizeInput.addEventListener('change', () => pushUndoSnapshot());
  }

  if (subElemTextInput) {
    subElemTextInput.addEventListener('input', (e) => {
      const val = e.target.value;
      const key = getActiveKey();
      const part = subPartSelect ? subPartSelect.value : '';
      if (!state.config.widgetTextOverrides) state.config.widgetTextOverrides = {};
      if (!state.config.widgetTextOverrides[key]) state.config.widgetTextOverrides[key] = {};
      state.config.widgetTextOverrides[key][part] = val;
      if (key === 'header') {
        if (part === 'title') state.config.customTitle = val;
        if (part === 'subtitle') state.config.customSubtitle = val;
        if (part === 'runner') state.config.runnerName = val;
        if (part === 'location') state.config.locationName = val;
        if (part === 'weather') state.config.weatherText = val;
      } else if (key === 'splits') {
        if (part === 'title') state.config.splitCustomTitle = val;
      }
      triggerRender();
    });
  }

  if (subElemColorInput) {
    subElemColorInput.addEventListener('input', (e) => {
      pushUndoSnapshot();
      const val = e.target.value;
      if (subElemColorHex) subElemColorHex.value = val;
      getSubElemObj().color = val;
      triggerRender();
    });
  }

  if (subElemColorHex) {
    subElemColorHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const obj = getSubElemObj();
      if (!val || val.toLowerCase() === 'default' || val.toLowerCase() === 'inherit') {
        obj.color = 'default';
      } else {
        obj.color = val;
        if (val.startsWith('#') && (val.length === 7 || val.length === 4) && subElemColorInput) {
          subElemColorInput.value = val;
        }
      }
      triggerRender();
    });
    subElemColorHex.addEventListener('change', () => pushUndoSnapshot());
  }

  if (subElemColorResetBtn) {
    subElemColorResetBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      const obj = getSubElemObj();
      obj.color = 'default';
      if (subElemColorHex) subElemColorHex.value = '';
      if (subElemColorInput) subElemColorInput.value = '#ffffff';
      triggerRender();
      showToast('Item text color reset to inherit default');
    });
  }

  if (resetSubElemBtn) {
    resetSubElemBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      const key = getActiveKey();
      const part = subPartSelect ? subPartSelect.value : '';
      if (state.config.widgetElementOffsets && state.config.widgetElementOffsets[key] && state.config.widgetElementOffsets[key][part]) {
        delete state.config.widgetElementOffsets[key][part];
      }
      if (key === 'header' && part === 'location') {
        state.config.headerShowLocation = true;
        state.config.showLocation = true;
        ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.checked = true;
        });
      }
      window.syncInspectorWithSelectedElement(key, part);
      triggerRender();
      showToast(`Reset ${part} in ${key} to default`);
    });
  }

  const restoreTemplateBtn = document.getElementById('inspectorRestoreTemplateBtn');
  if (restoreTemplateBtn) {
    restoreTemplateBtn.addEventListener('click', () => {
      restoreWidgetToTemplate(getActiveKey());
    });
  }

  const deleteElementBtn = document.getElementById('inspectorDeleteElementBtn');
  if (deleteElementBtn) {
    deleteElementBtn.addEventListener('click', () => {
      deleteSelectedTarget(getActiveKey());
    });
  }

  const deleteBgBtn = document.getElementById('inspectorDeleteBgBtn');
  if (deleteBgBtn) {
    deleteBgBtn.addEventListener('click', () => {
      deleteSelectedTarget(getActiveKey() + '_bg');
    });
  }

  const bgShowBgToggle = document.getElementById('inspectorBgShowBgToggle');
  if (bgShowBgToggle) {
    bgShowBgToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const bg = getBgObj();
      bg.showBg = e.target.checked;
      if (e.target.checked) bg.textOnly = false;
      triggerRender();
    });
  }

  const bgShowBorderToggle = document.getElementById('inspectorBgShowBorderToggle');
  if (bgShowBorderToggle) {
    bgShowBorderToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const bg = getBgObj();
      bg.showBorder = e.target.checked;
      if (e.target.checked) bg.textOnly = false;
      triggerRender();
    });
  }

  const bgTextOnlyBtn = document.getElementById('inspectorBgTextOnlyBtn');
  if (bgTextOnlyBtn) {
    bgTextOnlyBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      const key = getActiveKey();
      const bg = getBgObj();
      bg.textOnly = true;
      bg.showBg = false;
      bg.showBorder = false;
      const st = getStyleObj();
      st.cardStyle = 'text-only';
      if (cardStyleSelect) cardStyleSelect.value = 'text-only';
      if (bgShowBgToggle) bgShowBgToggle.checked = false;
      if (bgShowBorderToggle) bgShowBorderToggle.checked = false;
      triggerRender();
      showToast(`Set ${key} to Text Only`);
    });
  }

  const deleteSubElemBtn = document.getElementById('inspectorDeleteSubElemBtn');
  if (deleteSubElemBtn) {
    deleteSubElemBtn.addEventListener('click', () => {
      const key = getActiveKey();
      const part = subPartSelect ? subPartSelect.value : '';
      if (!part || part === 'widget' || part === 'bg') {
        deleteSelectedTarget(key);
      } else {
        pushUndoSnapshot();
        const sub = getSubElemObj();
        sub.hidden = true;
        sub.visible = false;
        triggerRender();
        showToast(`Deleted / hid ${part} in ${key}`);
      }
    });
  }

  // Initial sync
  window.syncInspectorWithSelectedElement('header');
}

// ==========================================
// 8. TEXT & STICKERS CONTROLS
// ==========================================
function setupTextAndStickersControls() {
  // 1. Overlay Labels Synchronization
  const bindInput = (id, key) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        state.config[key] = e.target.value;
        // Synchronize twin inputs if any
        if (key === 'customTitle') {
          const a = document.getElementById('inputActivityTitle');
          const b = document.getElementById('textTabActivityTitle');
          if (a && a !== el) a.value = e.target.value;
          if (b && b !== el) b.value = e.target.value;
        } else if (key === 'runnerName') {
          const a = document.getElementById('inputRunnerName');
          const b = document.getElementById('textTabRunnerName');
          if (a && a !== el) a.value = e.target.value;
          if (b && b !== el) b.value = e.target.value;
        } else if (key === 'locationName') {
          const a = document.getElementById('inputLocationName');
          const b = document.getElementById('textTabLocationName');
          if (a && a !== el) a.value = e.target.value;
          if (b && b !== el) b.value = e.target.value;
        } else if (key === 'weatherText') {
          const a = document.getElementById('inputWeatherText');
          const b = document.getElementById('textTabWeatherText');
          if (a && a !== el) a.value = e.target.value;
          if (b && b !== el) b.value = e.target.value;
        }
        triggerRender();
      });
    }
  };

  bindInput('inputActivityTitle', 'customTitle');
  bindInput('textTabActivityTitle', 'customTitle');
  bindInput('inputRunnerName', 'runnerName');
  bindInput('textTabRunnerName', 'runnerName');
  bindInput('inputLocationName', 'locationName');
  bindInput('textTabLocationName', 'locationName');
  bindInput('inputWeatherText', 'weatherText');
  bindInput('textTabWeatherText', 'weatherText');
  bindInput('textTabSubtitle', 'customSubtitle');
  bindInput('textTabWatermark', 'customWatermark');

  // Header Location Visibility Toggles
  const bindHeaderLocToggle = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const val = e.target.checked;
      state.config.headerShowLocation = val;
      state.config.showLocation = val;
      if (!state.config.widgetElementOffsets) state.config.widgetElementOffsets = {};
      if (!state.config.widgetElementOffsets.header) state.config.widgetElementOffsets.header = {};
      if (!state.config.widgetElementOffsets.header.location) state.config.widgetElementOffsets.header.location = { x: 0, y: 0, z: 1 };
      state.config.widgetElementOffsets.header.location.hidden = !val;
      state.config.widgetElementOffsets.header.location.visible = val;

      ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((otherId) => {
        const otherEl = document.getElementById(otherId);
        if (otherEl && otherEl !== el) otherEl.checked = val;
      });
      triggerRender();
      showToast(val ? 'Header location enabled' : 'Header location disabled');
    });
  };
  bindHeaderLocToggle('toggleHeaderLocation');
  bindHeaderLocToggle('textTabToggleHeaderLocation');
  bindHeaderLocToggle('headerShowLocationToggle');

  // Custom Metric Labels
  bindInput('customLabelDistance', 'labelDistance');
  bindInput('customLabelTime', 'labelTime');
  bindInput('customLabelPace', 'labelPace');
  bindInput('customLabelBestPace', 'labelBestPace');
  bindInput('customLabelHr', 'labelHr');
  bindInput('customLabelElevation', 'labelElevation');
  bindInput('customLabelCadence', 'labelCadence');
  bindInput('customLabelCalories', 'labelCalories');

  // Universal Widget Text Customization Overrides (New User Requirement)
  const bindOverride = (id, widgetKey, fieldKey) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = (state.config.widgetTextOverrides[widgetKey] && state.config.widgetTextOverrides[widgetKey][fieldKey]) || '';
      el.addEventListener('input', (e) => {
        if (!state.config.widgetTextOverrides[widgetKey]) state.config.widgetTextOverrides[widgetKey] = {};
        state.config.widgetTextOverrides[widgetKey][fieldKey] = e.target.value;
        triggerRender();
        // If current inspector is showing this widget, re-sync inspector text
        const elSelect = document.getElementById('inspectorElementSelect');
        if (elSelect && elSelect.value === widgetKey && window.syncInspectorWithSelectedElement) {
          window.syncInspectorWithSelectedElement(widgetKey);
        }
      });
    }
  };

  bindOverride('textTabHeroLabel', 'hero', 'label');
  bindOverride('textTabHeroValue', 'hero', 'value');
  bindOverride('textTabHeroUnit', 'hero', 'unit');
  bindOverride('textTabPaceGraphTitle', 'paceGraph', 'title');
  bindOverride('textTabHrGraphTitle', 'hrGraph', 'title');
  bindOverride('textTabElevationTitle', 'elevation', 'title');
  bindOverride('textTabHrBadgeLabel', 'hrBadge', 'label');
  bindOverride('textTabHrBadgeUnit', 'hrBadge', 'unit');
  bindOverride('textTabBrandWatermarkText', 'brand', 'text');
  bindOverride('textTabSplitHeaderSplit', 'splits', 'headerSplit');
  bindOverride('textTabSplitHeaderTime', 'splits', 'headerTime');
  bindOverride('textTabSplitHeaderPace', 'splits', 'headerPace');
  bindOverride('textTabSplitHeaderDelta', 'splits', 'headerDelta');
  bindOverride('textTabSplitHeaderHr', 'splits', 'headerHr');
  bindOverride('textTabSplitHeaderMaxHr', 'splits', 'headerMaxHr');
  bindOverride('textTabSplitHeaderCad', 'splits', 'headerCad');
  bindOverride('textTabSplitHeaderElev', 'splits', 'headerElev');

  // 2. Add Custom Text Button
  const addBtn = document.getElementById('addCustomTextBtn');
  const quickAddBtn = document.getElementById('quickAddTextBtn');

  const addTextAction = (initialText = 'NEW STICKER 🔥', bgStyle = 'pill') => {
    const id = 'text_' + Date.now();
    const newItem = {
      id,
      text: initialText,
      fontSize: 34,
      fontFamily: 'athletic',
      fontWeight: 'bold',
      color: '#ffffff',
      bgStyle: bgStyle,
      bgColor: 'rgba(0, 0, 0, 0.78)',
      borderColor: state.config.customAccentColor || '#ccff00',
      align: 'center',
    };
    state.config.customTexts.push(newItem);
    state.selectedWidget = id;
    renderCustomTextsList();
    triggerRender();
    showToast(`Added sticker: "${initialText}"`);
  };

  if (addBtn) addBtn.addEventListener('click', () => addTextAction('NEW STICKER 🔥', 'pill'));
  if (quickAddBtn) quickAddBtn.addEventListener('click', () => addTextAction('NEW STICKER 🔥', 'pill'));

  // Preset Sticker Chips
  const presets = {
    pb: { text: 'PERSONAL BEST! 🏆', bgStyle: 'pill' },
    longrun: { text: 'SUNDAY LONG RUN ☀️', bgStyle: 'card' },
    tempo: { text: 'TEMPO EFFORT 🔥', bgStyle: 'tape' },
    intervals: { text: '400M REPEATS ⚡', bgStyle: 'neon-box' },
    marathon: { text: 'MARATHON READY 🏅', bgStyle: 'pill' },
    trail: { text: 'TRAIL ADVENTURE ⛰️', bgStyle: 'card' },
    quote: { text: 'BEAT YESTERDAY 🏃', bgStyle: 'pill' },
  };

  const presetBtns = document.querySelectorAll('.sticker-preset-btn');
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const pKey = btn.dataset.preset;
      const p = presets[pKey] || { text: 'RUN STRONG 🔥', bgStyle: 'pill' };
      addTextAction(p.text, p.bgStyle);
    });
  });

  renderCustomTextsList();
}

function renderCustomTextsList() {
  const container = document.getElementById('customTextsList');
  if (!container) return;

  if (state.config.customTexts.length === 0) {
    container.innerHTML = '<div style="font-size:0.78rem; color:var(--text-muted); padding:6px 0;">No custom stickers added. Click above to add one!</div>';
    return;
  }

  container.innerHTML = '';
  state.config.customTexts.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = `custom-text-item ${state.selectedWidget === item.id ? 'active' : ''}`;
    row.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <input type="text" class="form-input custom-text-input" value="${item.text}" style="font-weight: 700; font-size: 0.88rem;">
        <button class="btn btn-secondary custom-text-del-btn" style="padding: 6px 10px; color: #ef4444;" title="Delete">🗑</button>
      </div>
      <div class="grid-3" style="gap: 6px;">
        <div>
          <label style="font-size: 0.68rem; color: var(--text-muted);">Size</label>
          <input type="number" class="form-input custom-text-size" value="${item.fontSize || 34}" min="16" max="140" step="2">
        </div>
        <div>
          <label style="font-size: 0.68rem; color: var(--text-muted);">Style</label>
          <select class="form-select custom-text-style" style="padding: 4px 6px; font-size: 0.72rem;">
            <option value="none" ${item.bgStyle === 'none' ? 'selected' : ''}>Transparent</option>
            <option value="pill" ${item.bgStyle === 'pill' ? 'selected' : ''}>Glass Pill</option>
            <option value="card" ${item.bgStyle === 'card' ? 'selected' : ''}>Glass Card</option>
            <option value="tape" ${item.bgStyle === 'tape' ? 'selected' : ''}>Athletic Tape</option>
            <option value="neon-box" ${item.bgStyle === 'neon-box' ? 'selected' : ''}>Neon Box</option>
          </select>
        </div>
        <div>
          <label style="font-size: 0.68rem; color: var(--text-muted);">Color</label>
          <input type="color" class="custom-text-color" value="${item.color || '#ffffff'}" style="width: 100%; height: 28px; border: none; border-radius: 4px; cursor: pointer; background: transparent;">
        </div>
      </div>
    `;

    // Row click selects widget
    row.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        selectWidget(item.id);
      }
    });

    // Listeners
    const textInput = row.querySelector('.custom-text-input');
    textInput.addEventListener('input', (e) => {
      item.text = e.target.value;
      triggerRender();
    });

    const sizeInput = row.querySelector('.custom-text-size');
    sizeInput.addEventListener('input', (e) => {
      item.fontSize = parseInt(e.target.value, 10) || 34;
      triggerRender();
    });

    const styleSelect = row.querySelector('.custom-text-style');
    styleSelect.addEventListener('change', (e) => {
      item.bgStyle = e.target.value;
      triggerRender();
    });

    const colorInput = row.querySelector('.custom-text-color');
    colorInput.addEventListener('input', (e) => {
      item.color = e.target.value;
      triggerRender();
    });

    const delBtn = row.querySelector('.custom-text-del-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.config.customTexts.splice(index, 1);
      if (state.selectedWidget === item.id) state.selectedWidget = null;
      renderCustomTextsList();
      triggerRender();
      showToast('Deleted text sticker');
    });

    container.appendChild(row);
  });
}

// ==========================================
// 7. INTERACTIVE GIZMO CONTROLLER (DRAG & RESIZE)
// ==========================================
function setupGizmoController() {
  const toggleLayoutBtn = document.getElementById('toggleInteractiveLayoutBtn');
  const resetAllBtn = document.getElementById('resetAllLayoutBtn');
  const gizmoCenterBtn = document.getElementById('gizmoCenterBtn');
  const gizmoCloseBtn = document.getElementById('gizmoCloseBtn');

  if (toggleLayoutBtn) {
    toggleLayoutBtn.addEventListener('click', () => {
      state.isInteractiveLayout = !state.isInteractiveLayout;
      toggleLayoutBtn.classList.toggle('btn-toggle-active', state.isInteractiveLayout);
      toggleLayoutBtn.textContent = state.isInteractiveLayout ? '✋ Drag & Resize: ON' : '✋ Drag & Resize: OFF';
      if (!state.isInteractiveLayout) selectWidget(null);
      showToast(`Interactive layout ${state.isInteractiveLayout ? 'enabled' : 'disabled'}`);
    });
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.widgetPositions = {};
      state.config.widgetBgStyles = {};
      state.config.widgetElementOffsets = {};
      state.config.elementStyles = {};
      selectWidget(null);
      syncAllControlsWithConfig();
      triggerRender();
      showToast('All widgets reset to template default layout');
    });
  }

  if (gizmoCenterBtn) {
    gizmoCenterBtn.addEventListener('click', () => {
      if (state.selectedWidget === '__bg_photo__') {
        pushUndoSnapshot();
        state.config.photoPanX = 0;
        state.config.photoPanY = 0;
        syncPhotoSliders();
        triggerRender();
        showToast('Photo centered');
      } else if (state.selectedWidget) {
        pushUndoSnapshot();
        centerWidget(state.selectedWidget);
      }
    });
  }

  const gizmoRestoreBtn = document.getElementById('gizmoRestoreBtn');
  if (gizmoRestoreBtn) {
    gizmoRestoreBtn.addEventListener('click', () => {
      if (state.selectedWidget === '__bg_photo__') {
        pushUndoSnapshot();
        state.config.photoZoom = 1;
        state.config.photoPanX = 0;
        state.config.photoPanY = 0;
        state.config.photoFit = 'fit';
        syncPhotoSliders();
        triggerRender();
        showToast('Photo reset to default');
      } else if (state.selectedWidget) {
        restoreWidgetToTemplate(state.selectedWidget);
      }
    });
  }

  if (gizmoDeleteBtn) {
    gizmoDeleteBtn.addEventListener('click', () => {
      if (state.selectedWidget === '__bg_photo__') {
        pushUndoSnapshot();
        state.config.bgType = 'solid';
        selectWidget(null);
        syncAllControlsWithConfig();
        triggerRender();
        showToast('Background photo removed');
      } else if (state.selectedWidget) {
        deleteSelectedTarget(state.selectedWidget);
      }
    });
  }

  if (gizmoCloseBtn) {
    gizmoCloseBtn.addEventListener('click', () => selectWidget(null));
  }

  const gizmoSubPartSelect = document.getElementById('gizmoSubPartSelect');
  if (gizmoSubPartSelect) {
    gizmoSubPartSelect.addEventListener('change', (e) => {
      if (!state.selectedWidget) return;
      const baseKey = state.selectedWidget.replace(/_bg$/, '');
      if (e.target.value === 'border') {
        selectWidget(baseKey + '_bg');
      } else {
        selectWidget(baseKey);
      }
    });
  }

  // Direct Canvas Hit-Testing for Selection & Dragging
  const handlePointerDown = (clientX, clientY) => {
    if (!state.isInteractiveLayout) return;

    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const clickX = (clientX - rect.left) * scale;
    const clickY = (clientY - rect.top) * scale;

    // Check bounds in reverse order (topmost first)
    let foundKey = null;
    const bounds = renderer.widgetBounds || {};
    const entries = Object.entries(bounds).reverse();

    for (const [key, b] of entries) {
      if (key === '__bg_photo__') continue; // Don't let background photo steal clicks from widgets
      if (clickX >= b.x && clickX <= b.x + b.width && clickY >= b.y && clickY <= b.y + b.height) {
        foundKey = key;
        break;
      }
    }

    if (foundKey) {
      selectWidget(foundKey);
      startDragMove(clientX, clientY);
    } else {
      if (state.config.bgType === 'photo' && renderer.bgImage) {
        selectWidget('__bg_photo__');
        startPhotoDrag(clientX, clientY);
      } else {
        selectWidget(null);
      }
    }
  };

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) handlePointerDown(e.clientX, e.clientY);
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      handlePointerDown(t.clientX, t.clientY);
    }
  }, { passive: false });

  // Helper to test if clicking/tapping a foreground widget when background photo is selected
  const handleGizmoPointerDown = (clientX, clientY) => {
    if (state.selectedWidget === '__bg_photo__') {
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const clickX = (clientX - rect.left) * scale;
      const clickY = (clientY - rect.top) * scale;

      let foundKey = null;
      const bounds = renderer.widgetBounds || {};
      const entries = Object.entries(bounds).reverse();

      for (const [key, b] of entries) {
        if (key === '__bg_photo__') continue;
        if (clickX >= b.x && clickX <= b.x + b.width && clickY >= b.y && clickY <= b.y + b.height) {
          foundKey = key;
          break;
        }
      }

      if (foundKey) {
        selectWidget(foundKey);
        startDragMove(clientX, clientY);
        return;
      }
      startPhotoDrag(clientX, clientY);
    } else {
      startDragMove(clientX, clientY);
    }
  };

  // Gizmo Body Move Drag
  gizmoBox.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('gizmo-handle') || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
    if (e.button === 0) {
      handleGizmoPointerDown(e.clientX, e.clientY);
    }
  });

  gizmoBox.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('gizmo-handle') || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
    if (e.touches.length === 1) {
      handleGizmoPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  // Hover cursor for background photo gizmo
  gizmoBox.addEventListener('mousemove', (e) => {
    if (isInteracting) return;
    if (state.selectedWidget === '__bg_photo__') {
      if (e.target.classList.contains('gizmo-handle') || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const clickX = (e.clientX - rect.left) * scale;
      const clickY = (e.clientY - rect.top) * scale;

      let overForeground = false;
      const bounds = renderer.widgetBounds || {};
      for (const [key, b] of Object.entries(bounds)) {
        if (key === '__bg_photo__') continue;
        if (clickX >= b.x && clickX <= b.x + b.width && clickY >= b.y && clickY <= b.y + b.height) {
          overForeground = true;
          break;
        }
      }
      gizmoBox.style.cursor = overForeground ? 'pointer' : 'grab';
    }
  });

  // Handles Resize Drag
  const handles = gizmoBox.querySelectorAll('.gizmo-handle');
  handles.forEach((h) => {
    const startResize = (clientX, clientY) => {
      pushUndoSnapshot();
      if (state.selectedWidget === '__bg_photo__') {
        activeDragMode = 'photo_zoom';
        dragStartX = clientX;
        dragStartY = clientY;
        dragInitialZoom = typeof state.config.photoZoom === 'number' ? state.config.photoZoom : 1;
        isInteracting = true;
        return;
      }

      activeDragMode = 'resize';
      activeHandle = h.dataset.handle;
      dragStartX = clientX;
      dragStartY = clientY;
      const b = renderer.widgetBounds[state.selectedWidget];
      if (!b) return;
      if (state.selectedWidget.endsWith('_bg')) {
        const baseKey = state.selectedWidget.replace(/_bg$/, '');
        const bgCustom = (state.config.widgetBgStyles && state.config.widgetBgStyles[baseKey]) || {};
        dragInitialPos = {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          offsetX: typeof bgCustom.offsetX === 'number' ? bgCustom.offsetX : 0,
          offsetY: typeof bgCustom.offsetY === 'number' ? bgCustom.offsetY : 0,
          widthDelta: typeof bgCustom.widthDelta === 'number' ? bgCustom.widthDelta : 0,
          heightDelta: typeof bgCustom.heightDelta === 'number' ? bgCustom.heightDelta : 0,
        };
      } else {
        dragInitialPos = { ...(state.config.widgetPositions[state.selectedWidget] || b) };
      }
      isInteracting = true;
    };

    h.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (e.button === 0) startResize(e.clientX, e.clientY);
    });

    h.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        startResize(t.clientX, t.clientY);
      }
    }, { passive: false });
  });

  // Global Pointer Move & Up
  const handlePointerMove = (clientX, clientY) => {
    if (!isInteracting || !state.selectedWidget) return;

    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const deltaX = (clientX - dragStartX) * scale;
    const deltaY = (clientY - dragStartY) * scale;

    if (activeDragMode === 'photo') {
      const deltaPercentX = (deltaX / canvas.width) * 100;
      const deltaPercentY = (deltaY / canvas.height) * 100;
      state.config.photoPanX = Math.round((dragInitialPanX + deltaPercentX) * 10) / 10;
      state.config.photoPanY = Math.round((dragInitialPanY + deltaPercentY) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
      return;
    } else if (activeDragMode === 'photo_zoom') {
      const deltaZoom = (deltaX + deltaY) * 0.003;
      state.config.photoZoom = Math.max(0.1, Math.min(5.0, Math.round((dragInitialZoom + deltaZoom) * 100) / 100));
      syncPhotoSliders();
      triggerRender();
      return;
    }

    if (activeDragMode === 'move') {
      if (state.selectedWidget.endsWith('_bg')) {
        const baseKey = state.selectedWidget.replace(/_bg$/, '');
        if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
        if (!state.config.widgetBgStyles[baseKey]) state.config.widgetBgStyles[baseKey] = {};
        const cur = state.config.widgetBgStyles[baseKey];
        cur.offsetX = Math.round(dragInitialPos.offsetX + deltaX);
        cur.offsetY = Math.round(dragInitialPos.offsetY + deltaY);
        triggerRender();
      } else {
        const newX = Math.round(dragInitialPos.x + deltaX);
        const newY = Math.round(dragInitialPos.y + deltaY);
        state.config.widgetPositions[state.selectedWidget] = {
          ...dragInitialPos,
          x: newX,
          y: newY,
        };
        triggerRender();
      }
    } else if (activeDragMode === 'resize') {
      let { x, y, width, height } = dragInitialPos;

      if (activeHandle.includes('e')) width = Math.max(30, Math.round(dragInitialPos.width + deltaX));
      if (activeHandle.includes('s')) height = Math.max(20, Math.round(dragInitialPos.height + deltaY));
      if (activeHandle.includes('w')) {
        const nw = Math.max(30, Math.round(dragInitialPos.width - deltaX));
        x = dragInitialPos.x + (dragInitialPos.width - nw);
        width = nw;
      }
      if (activeHandle.includes('n')) {
        const nh = Math.max(20, Math.round(dragInitialPos.height - deltaY));
        y = dragInitialPos.y + (dragInitialPos.height - nh);
        height = nh;
      }

      if (state.selectedWidget.endsWith('_bg')) {
        const baseKey = state.selectedWidget.replace(/_bg$/, '');
        if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
        if (!state.config.widgetBgStyles[baseKey]) state.config.widgetBgStyles[baseKey] = {};
        const cur = state.config.widgetBgStyles[baseKey];
        const baseBounds = renderer.widgetBounds[baseKey];
        const baseX = baseBounds ? baseBounds.x : dragInitialPos.x - dragInitialPos.offsetX;
        const baseY = baseBounds ? baseBounds.y : dragInitialPos.y - dragInitialPos.offsetY;
        const baseW = baseBounds ? baseBounds.width : dragInitialPos.width - dragInitialPos.widthDelta;
        const baseH = baseBounds ? baseBounds.height : dragInitialPos.height - dragInitialPos.heightDelta;
        cur.offsetX = Math.round(x - baseX);
        cur.offsetY = Math.round(y - baseY);
        cur.widthDelta = Math.round(width - baseW);
        cur.heightDelta = Math.round(height - baseH);
        triggerRender();
      } else {
        state.config.widgetPositions[state.selectedWidget] = { x, y, width, height };
        triggerRender();
      }
    }
  };

  const handlePointerUp = () => {
    if (isInteracting) {
      isInteracting = false;
      activeDragMode = null;
      activeHandle = null;
    }
  };

  // Canvas Hover Cursor for Interactive Layout
  canvas.addEventListener('mousemove', (e) => {
    if (!state.isInteractiveLayout || isInteracting) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const hoverX = (e.clientX - rect.left) * scale;
    const hoverY = (e.clientY - rect.top) * scale;
    let hoveredWidget = null;
    const bounds = renderer.widgetBounds || {};
    for (const [key, b] of Object.entries(bounds).reverse()) {
      if (key === '__bg_photo__') continue;
      if (hoverX >= b.x && hoverX <= b.x + b.width && hoverY >= b.y && hoverY <= b.y + b.height) {
        hoveredWidget = key;
        break;
      }
    }
    if (hoveredWidget) {
      canvas.style.cursor = 'move';
    } else if (state.config.bgType === 'photo' && renderer.bgImage) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'default';
    }
  });

  // Canvas Mouse Wheel for Photo Zoom
  canvas.addEventListener('wheel', (e) => {
    if (state.config.bgType === 'photo' && renderer.bgImage) {
      if (e.altKey || e.ctrlKey || state.selectedWidget === '__bg_photo__') {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
        const curZoom = typeof state.config.photoZoom === 'number' ? state.config.photoZoom : 1;
        state.config.photoZoom = Math.max(0.1, Math.min(5.0, Math.round((curZoom + zoomDelta) * 100) / 100));
        syncPhotoSliders();
        triggerRender();
      }
    }
  }, { passive: false });

  window.addEventListener('mousemove', (e) => handlePointerMove(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    if (isInteracting && e.touches.length > 0) {
      e.preventDefault();
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener('mouseup', handlePointerUp);
  window.addEventListener('touchend', handlePointerUp);
}

function startPhotoDrag(clientX, clientY) {
  pushUndoSnapshot();
  activeDragMode = 'photo';
  dragStartX = clientX;
  dragStartY = clientY;
  dragInitialPanX = typeof state.config.photoPanX === 'number' ? state.config.photoPanX : 0;
  dragInitialPanY = typeof state.config.photoPanY === 'number' ? state.config.photoPanY : 0;
  isInteracting = true;
}

function startDragMove(clientX, clientY) {
  pushUndoSnapshot();
  activeDragMode = 'move';
  dragStartX = clientX;
  dragStartY = clientY;
  const b = renderer.widgetBounds[state.selectedWidget];
  if (!b) return;
  if (state.selectedWidget.endsWith('_bg')) {
    const baseKey = state.selectedWidget.replace(/_bg$/, '');
    const bgCustom = (state.config.widgetBgStyles && state.config.widgetBgStyles[baseKey]) || {};
    dragInitialPos = {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      offsetX: typeof bgCustom.offsetX === 'number' ? bgCustom.offsetX : 0,
      offsetY: typeof bgCustom.offsetY === 'number' ? bgCustom.offsetY : 0,
      widthDelta: typeof bgCustom.widthDelta === 'number' ? bgCustom.widthDelta : 0,
      heightDelta: typeof bgCustom.heightDelta === 'number' ? bgCustom.heightDelta : 0,
    };
  } else {
    dragInitialPos = { ...(state.config.widgetPositions[state.selectedWidget] || b) };
  }
  isInteracting = true;
}

function selectWidget(key) {
  state.selectedWidget = key;
  updateGizmoBox();

  // Highlight row in customTextsList if text
  const textRows = document.querySelectorAll('.custom-text-item');
  textRows.forEach((r) => r.classList.remove('active'));

  const nameLabel = document.getElementById('selectedWidgetNameLabel');
  if (!key) {
    if (nameLabel) nameLabel.textContent = 'None (Click canvas)';
    return;
  }

  if (key === '__bg_photo__') {
    if (nameLabel) nameLabel.textContent = 'Background Photo';
    const photoSection = document.getElementById('photoControlsSection');
    if (photoSection) photoSection.style.display = 'block';
    const inspectorSelect = document.getElementById('inspectorElementSelect');
    if (inspectorSelect) inspectorSelect.value = '__bg_photo__';
    updateGizmoBox();
    return;
  }

  const b = renderer.widgetBounds[key];
  if (nameLabel && b) nameLabel.textContent = b.name;

  // Sync with Element Inspector
  if (key && key.endsWith('_bg')) {
    const baseKey = key.replace(/_bg$/, '');
    const inspectorSelect = document.getElementById('inspectorElementSelect');
    if (inspectorSelect && inspectorSelect.querySelector(`option[value="${baseKey}"]`)) {
      inspectorSelect.value = baseKey;
      if (window.syncInspectorWithSelectedElement) {
        window.syncInspectorWithSelectedElement(baseKey, 'bg');
      }
    }
  } else if (key) {
    const inspectorSelect = document.getElementById('inspectorElementSelect');
    if (inspectorSelect && inspectorSelect.querySelector(`option[value="${key}"]`)) {
      inspectorSelect.value = key;
      if (window.syncInspectorWithSelectedElement) {
        window.syncInspectorWithSelectedElement(key, 'widget');
      }
    }
  }

  // Sync sliders in widgetsTab
  if (b) {
    const posX = document.getElementById('widgetPosXSlider');
    const posY = document.getElementById('widgetPosYSlider');
    const posW = document.getElementById('widgetWidthSlider');
    const posH = document.getElementById('widgetHeightSlider');
    const cur = state.config.widgetPositions[key] || b;

    if (posX) { posX.value = cur.x; document.getElementById('widgetPosXVal').textContent = `${cur.x}px`; }
    if (posY) { posY.value = cur.y; document.getElementById('widgetPosYVal').textContent = `${cur.y}px`; }
    if (posW) { posW.value = cur.width; document.getElementById('widgetWidthVal').textContent = `${cur.width}px`; }
    if (posH) { posH.value = cur.height; document.getElementById('widgetHeightVal').textContent = `${cur.height}px`; }
  }
}

function updateGizmoBox() {
  if (!gizmoBox) return;

  if (!state.isInteractiveLayout || !state.selectedWidget) {
    gizmoBox.style.display = 'none';
    return;
  }

  const b = renderer.widgetBounds[state.selectedWidget];
  if (!b) {
    gizmoBox.style.display = 'none';
    return;
  }

  const isPhoto = state.selectedWidget === '__bg_photo__';
  const isBgBorder = state.selectedWidget && state.selectedWidget.endsWith('_bg');
  const gizmoSubPartSelect = document.getElementById('gizmoSubPartSelect');
  if (gizmoSubPartSelect) {
    gizmoSubPartSelect.style.display = isPhoto ? 'none' : '';
    gizmoSubPartSelect.value = isBgBorder ? 'border' : 'widget';
  }
  if (isBgBorder) {
    gizmoBox.classList.add('mode-bg-border');
  } else {
    gizmoBox.classList.remove('mode-bg-border');
  }

  const canvasRect = canvas.getBoundingClientRect();
  const wrapperRect = canvasWrapper.getBoundingClientRect();
  const scale = canvasRect.width / canvas.width;

  const offsetX = canvasRect.left - wrapperRect.left;
  const offsetY = canvasRect.top - wrapperRect.top;

  const cssLeft = offsetX + b.x * scale;
  const cssTop = offsetY + b.y * scale;
  const cssWidth = b.width * scale;
  const cssHeight = b.height * scale;

  gizmoBox.style.display = 'block';
  gizmoBox.style.left = `${cssLeft}px`;
  gizmoBox.style.top = `${cssTop}px`;
  gizmoBox.style.width = `${cssWidth}px`;
  gizmoBox.style.height = `${cssHeight}px`;

  if (gizmoTitle) {
    if (isPhoto) {
      gizmoTitle.textContent = `🖼️ Photo (${b.width}×${b.height}) - Pan: ${state.config.photoPanX || 0}%, ${state.config.photoPanY || 0}%`;
    } else {
      gizmoTitle.textContent = `${b.name} (${b.width}×${b.height})`;
    }
  }

  if (gizmoDeleteBtn) {
    gizmoDeleteBtn.style.display = 'inline-flex';
  }
}

function centerWidget(key) {
  const b = renderer.widgetBounds[key];
  if (!b) return;
  const cur = state.config.widgetPositions[key] || b;
  const newX = Math.round((canvas.width - cur.width) / 2);
  state.config.widgetPositions[key] = { ...cur, x: newX };
  triggerRender();
  showToast('Centered widget horizontally');
}

function syncPhotoSliders() {
  const cfg = state.config;
  const zoom = typeof cfg.photoZoom === 'number' ? cfg.photoZoom : 1;
  const panX = typeof cfg.photoPanX === 'number' ? cfg.photoPanX : 0;
  const panY = typeof cfg.photoPanY === 'number' ? cfg.photoPanY : 0;
  const blur = typeof cfg.photoBlur === 'number' ? cfg.photoBlur : 0;
  const brightness = typeof cfg.photoBrightness === 'number' ? cfg.photoBrightness : 100;
  const contrast = typeof cfg.photoContrast === 'number' ? cfg.photoContrast : 100;
  const fit = cfg.photoFit || 'fit';
  const backdrop = cfg.photoBackdrop || 'blur';

  const zoomSlider = document.getElementById('photoZoom');
  const zoomInput = document.getElementById('photoZoomInput');
  const zoomVal = document.getElementById('photoZoomVal');
  if (zoomSlider) zoomSlider.value = zoom;
  if (zoomInput) zoomInput.value = zoom;
  if (zoomVal) zoomVal.textContent = `${zoom.toFixed(2)}x`;

  const panXSlider = document.getElementById('photoPanX');
  const panXInput = document.getElementById('photoPanXInput');
  const panXVal = document.getElementById('photoPanXVal');
  if (panXSlider) panXSlider.value = panX;
  if (panXInput) panXInput.value = panX;
  if (panXVal) panXVal.textContent = `${panX}%`;

  const panYSlider = document.getElementById('photoPanY');
  const panYInput = document.getElementById('photoPanYInput');
  const panYVal = document.getElementById('photoPanYVal');
  if (panYSlider) panYSlider.value = panY;
  if (panYInput) panYInput.value = panY;
  if (panYVal) panYVal.textContent = `${panY}%`;

  const blurSlider = document.getElementById('photoBlur');
  const blurVal = document.getElementById('photoBlurVal');
  if (blurSlider) blurSlider.value = blur;
  if (blurVal) blurVal.textContent = `${blur}px`;

  const brightSlider = document.getElementById('photoBrightness');
  const brightVal = document.getElementById('photoBrightnessVal');
  if (brightSlider) brightSlider.value = brightness;
  if (brightVal) brightVal.textContent = `${brightness}%`;

  const contrastSlider = document.getElementById('photoContrast');
  const contrastVal = document.getElementById('photoContrastVal');
  if (contrastSlider) contrastSlider.value = contrast;
  if (contrastVal) contrastVal.textContent = `${contrast}%`;

  const fitBtn = document.getElementById('photoFitBtn');
  const coverBtn = document.getElementById('photoCoverBtn');
  const fitBadge = document.getElementById('photoFitBadge');
  const ratioBadge = document.getElementById('photoRatioStatusBadge');
  if (fitBtn && coverBtn) {
    fitBtn.classList.toggle('active', fit === 'fit' || fit === 'contain');
    coverBtn.classList.toggle('active', fit === 'cover');
  }
  if (fitBadge) {
    fitBadge.textContent = (fit === 'fit' || fit === 'contain') ? '100% Uncropped' : 'Fill Canvas';
  }
  if (ratioBadge) {
    ratioBadge.textContent = (fit === 'fit' || fit === 'contain') ? 'No Crop Mode' : 'Cover Mode';
  }

  const backdropSelect = document.getElementById('photoBackdropSelect');
  if (backdropSelect) backdropSelect.value = backdrop;

  const protectToggle = document.getElementById('togglePhotoProtection');
  if (protectToggle) protectToggle.checked = cfg.photoProtectionGradient !== false;
}

// ==========================================
// 8. STYLE & BACKGROUND CONTROLS
// ==========================================
function setupStyleControls() {
  const photoSection = document.getElementById('photoControlsSection');
  const bgPhotoInput = document.getElementById('bgPhotoInput');

  setupCardGrid('#bgTypeGrid', 'data-bg', (bg) => {
    pushUndoSnapshot();
    state.config.bgType = bg;
    if (bg === 'photo') {
      photoSection.style.display = 'block';
    } else {
      photoSection.style.display = 'none';
      if (state.selectedWidget === '__bg_photo__') selectWidget(null);
    }
    triggerRender();
  });

  if (bgPhotoInput) {
    bgPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          pushUndoSnapshot();
          renderer.setBgImage(img);
          state.config.bgType = 'photo';

          // Detect aspect ratio difference:
          const imgAspect = img.width / img.height;
          const [rw, rh] = (state.config.aspectRatio || '9:16').split(':').map(Number);
          const canvasAspect = (rw && rh) ? rw / rh : 9 / 16;
          const isRatioSimilar = Math.abs(imgAspect - canvasAspect) / Math.max(imgAspect, canvasAspect) < 0.05;

          // If ratio is not similar, default to 'fit' (contain) so no unseen part is cropped!
          if (!isRatioSimilar) {
            state.config.photoFit = 'fit';
          }
          state.config.photoPanX = 0;
          state.config.photoPanY = 0;
          state.config.photoZoom = 1;

          photoSection.style.display = 'block';
          updateActiveCard('#bgTypeGrid', 'data-bg', 'photo');
          syncPhotoSliders();
          triggerRender();
          showToast('Background photo loaded (100% full uncropped image)!');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Ratio & Fit Mode Buttons
  const photoFitBtn = document.getElementById('photoFitBtn');
  if (photoFitBtn) {
    photoFitBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoFit = 'fit';
      syncPhotoSliders();
      triggerRender();
      showToast('Photo Fit: 100% full uncropped photo');
    });
  }

  const photoCoverBtn = document.getElementById('photoCoverBtn');
  if (photoCoverBtn) {
    photoCoverBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoFit = 'cover';
      syncPhotoSliders();
      triggerRender();
      showToast('Photo Fit: Fill frame');
    });
  }

  // Margin Backdrop Select
  const photoBackdropSelect = document.getElementById('photoBackdropSelect');
  if (photoBackdropSelect) {
    photoBackdropSelect.addEventListener('change', (e) => {
      pushUndoSnapshot();
      state.config.photoBackdrop = e.target.value;
      triggerRender();
    });
  }

  // Pan X slider & number input
  const photoPanX = document.getElementById('photoPanX');
  const photoPanXInput = document.getElementById('photoPanXInput');
  if (photoPanX) {
    photoPanX.addEventListener('input', (e) => {
      state.config.photoPanX = parseFloat(e.target.value) || 0;
      if (photoPanXInput) photoPanXInput.value = state.config.photoPanX;
      const panXVal = document.getElementById('photoPanXVal');
      if (panXVal) panXVal.textContent = `${state.config.photoPanX}%`;
      triggerRender();
    });
    photoPanX.addEventListener('change', () => pushUndoSnapshot());
  }
  if (photoPanXInput) {
    photoPanXInput.addEventListener('input', (e) => {
      state.config.photoPanX = parseFloat(e.target.value) || 0;
      if (photoPanX) photoPanX.value = state.config.photoPanX;
      const panXVal = document.getElementById('photoPanXVal');
      if (panXVal) panXVal.textContent = `${state.config.photoPanX}%`;
      triggerRender();
    });
    photoPanXInput.addEventListener('change', () => pushUndoSnapshot());
  }

  // Pan Y slider & number input
  const photoPanY = document.getElementById('photoPanY');
  const photoPanYInput = document.getElementById('photoPanYInput');
  if (photoPanY) {
    photoPanY.addEventListener('input', (e) => {
      state.config.photoPanY = parseFloat(e.target.value) || 0;
      if (photoPanYInput) photoPanYInput.value = state.config.photoPanY;
      const panYVal = document.getElementById('photoPanYVal');
      if (panYVal) panYVal.textContent = `${state.config.photoPanY}%`;
      triggerRender();
    });
    photoPanY.addEventListener('change', () => pushUndoSnapshot());
  }
  if (photoPanYInput) {
    photoPanYInput.addEventListener('input', (e) => {
      state.config.photoPanY = parseFloat(e.target.value) || 0;
      if (photoPanY) photoPanY.value = state.config.photoPanY;
      const panYVal = document.getElementById('photoPanYVal');
      if (panYVal) panYVal.textContent = `${state.config.photoPanY}%`;
      triggerRender();
    });
    photoPanYInput.addEventListener('change', () => pushUndoSnapshot());
  }

  // Directional Nudge Buttons
  const photoNudgeLeftBtn = document.getElementById('photoNudgeLeftBtn');
  if (photoNudgeLeftBtn) {
    photoNudgeLeftBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanX = Math.round(((state.config.photoPanX || 0) - 5) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
    });
  }

  const photoNudgeRightBtn = document.getElementById('photoNudgeRightBtn');
  if (photoNudgeRightBtn) {
    photoNudgeRightBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanX = Math.round(((state.config.photoPanX || 0) + 5) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
    });
  }

  const photoNudgeUpBtn = document.getElementById('photoNudgeUpBtn');
  if (photoNudgeUpBtn) {
    photoNudgeUpBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanY = Math.round(((state.config.photoPanY || 0) - 5) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
    });
  }

  const photoNudgeDownBtn = document.getElementById('photoNudgeDownBtn');
  if (photoNudgeDownBtn) {
    photoNudgeDownBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanY = Math.round(((state.config.photoPanY || 0) + 5) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
    });
  }

  const photoCenterBtn = document.getElementById('photoCenterBtn');
  if (photoCenterBtn) {
    photoCenterBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanX = 0;
      state.config.photoPanY = 0;
      syncPhotoSliders();
      triggerRender();
      showToast('Photo centered');
    });
  }

  // Reset Photo Button
  const resetPhotoPosBtn = document.getElementById('resetPhotoPosBtn');
  if (resetPhotoPosBtn) {
    resetPhotoPosBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoZoom = 1;
      state.config.photoPanX = 0;
      state.config.photoPanY = 0;
      state.config.photoFit = 'fit';
      syncPhotoSliders();
      triggerRender();
      showToast('Photo reset to default');
    });
  }

  // Zoom slider & input
  const photoZoom = document.getElementById('photoZoom');
  const photoZoomInput = document.getElementById('photoZoomInput');
  if (photoZoom) {
    photoZoom.addEventListener('input', (e) => {
      state.config.photoZoom = parseFloat(e.target.value) || 1;
      if (photoZoomInput) photoZoomInput.value = state.config.photoZoom;
      const zoomVal = document.getElementById('photoZoomVal');
      if (zoomVal) zoomVal.textContent = `${state.config.photoZoom.toFixed(2)}x`;
      triggerRender();
    });
    photoZoom.addEventListener('change', () => pushUndoSnapshot());
  }
  if (photoZoomInput) {
    photoZoomInput.addEventListener('input', (e) => {
      state.config.photoZoom = parseFloat(e.target.value) || 1;
      if (photoZoom) photoZoom.value = state.config.photoZoom;
      const zoomVal = document.getElementById('photoZoomVal');
      if (zoomVal) zoomVal.textContent = `${state.config.photoZoom.toFixed(2)}x`;
      triggerRender();
    });
    photoZoomInput.addEventListener('change', () => pushUndoSnapshot());
  }

  // Blur, Brightness, Contrast & Protection
  setupSlider('photoBlur', 'photoBlurVal', (val) => {
    state.config.photoBlur = parseFloat(val);
    triggerRender();
  }, 'px');

  setupSlider('photoBrightness', 'photoBrightnessVal', (val) => {
    state.config.photoBrightness = parseFloat(val);
    triggerRender();
  }, '%');

  setupSlider('photoContrast', 'photoContrastVal', (val) => {
    state.config.photoContrast = parseFloat(val);
    triggerRender();
  }, '%');

  const togglePhotoProtection = document.getElementById('togglePhotoProtection');
  if (togglePhotoProtection) {
    togglePhotoProtection.addEventListener('change', (e) => {
      pushUndoSnapshot();
      state.config.photoProtectionGradient = e.target.checked;
      triggerRender();
    });
  }

  setupCardGrid('#themeGrid', 'data-theme', (theme) => {
    state.config.theme = theme;
    state.config.customAccentColor = null;
    triggerRender();
  });

  document.getElementById('customColorInput').addEventListener('input', (e) => {
    state.config.customAccentColor = e.target.value;
    triggerRender();
  });

  setupCardGrid('#cardStyleGrid', 'data-cardstyle', (style) => {
    state.config.cardStyle = style;
    triggerRender();
  });

  setupCardGrid('#fontGrid', 'data-font', (font) => {
    state.config.fontFamily = font;
    triggerRender();
  });
}

function setupSlider(sliderId, valLabelId, onChange, unit = '') {
  const slider = document.getElementById(sliderId);
  const valLabel = document.getElementById(valLabelId);
  if (!slider || !valLabel) return;

  slider.addEventListener('input', (e) => {
    valLabel.textContent = `${e.target.value}${unit}`;
    onChange(e.target.value);
  });
}

// ==========================================
// 9. EXPORT CONTROLS
// ==========================================
function setupExportControls() {
  setupCardGrid('#exportScaleGrid', 'data-scale', (scale) => {
    state.export.scale = parseInt(scale, 10);
  });

  setupCardGrid('#exportFormatGrid', 'data-format', (format) => {
    state.export.format = format;
  });

  const doDownload = () => exportImage('download');
  document.getElementById('downloadBtn').addEventListener('click', doDownload);
  document.getElementById('mobileDownloadBtn').addEventListener('click', doDownload);
  document.getElementById('quickExportBtn').addEventListener('click', doDownload);



  const doShare = () => exportImage('share');
  document.getElementById('shareBtn').addEventListener('click', doShare);
  document.getElementById('mobileShareBtn').addEventListener('click', doShare);

  document.getElementById('copyBtn').addEventListener('click', () => exportImage('copy'));
}

function exportImage(action = 'download') {
  if (!state.currentActivity) {
    showToast('No activity loaded to export.');
    return;
  }

  showToast('Generating high-resolution export...');
  const exportCanvas = document.getElementById('exportCanvas');
  const exportRenderer = new OverlayRenderer(exportCanvas);
  exportRenderer.setBgImage(renderer.bgImage);

  exportRenderer.render(state.currentActivity, state.config, state.export.scale);

  const mimeType = state.export.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = state.export.format === 'jpeg' ? 0.92 : undefined;
  const ext = state.export.format === 'jpeg' ? 'jpg' : 'png';
  const fileName = `runoverlay-${Date.now()}.${ext}`;

  exportCanvas.toBlob(async (blob) => {
    if (!blob) {
      showToast('Export failed.');
      return;
    }



    if (action === 'share') {
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: state.currentActivity.title || 'My Run',
            text: `Ran ${state.currentActivity.distanceMain} ${state.currentActivity.distanceUnit} in ${state.currentActivity.durationFormatted}!`,
            files: [file],
          });
          showToast('Shared successfully!');
          return;
        } catch (e) {
          if (e.name !== 'AbortError') console.error('Share error:', e);
        }
      } else {
        showToast('Web Share not supported; downloading instead.');
        downloadBlob(blob, fileName);
      }
    } else if (action === 'copy') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Image copied to clipboard!');
      } catch (e) {
        console.error('Clipboard copy failed:', e);
        showToast('Copy not supported on this browser. Downloading...');
        downloadBlob(blob, fileName);
      }
    } else {
      downloadBlob(blob, fileName);
      showToast('Image downloaded!');
    }
  }, mimeType, quality);
}



function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ==========================================
// UTILITIES
// ==========================================
function setupCardGrid(gridSelector, dataAttr, onSelect) {
  const container = document.querySelector(gridSelector);
  if (!container) return;

  const cards = container.querySelectorAll('.choice-card');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const val = card.getAttribute(dataAttr);
      onSelect(val);
    });
  });
}

function updateActiveCard(gridSelector, dataAttr, targetVal) {
  const container = document.querySelector(gridSelector);
  if (!container) return;

  const cards = container.querySelectorAll('.choice-card');
  cards.forEach((card) => {
    if (card.getAttribute(dataAttr) === targetVal) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg') || toast;
  toastMsg.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', init);
